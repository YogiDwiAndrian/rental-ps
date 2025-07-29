import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { decimalToNumber, numberToDecimal } from '@/lib/utils'

// ============================================
// TYPES & VALIDATION
// ============================================

const completeSessionSchema = z.object({
  final_total: z.number().min(0),
  payment_method: z.string().default('cash'),
  include_fnb: z.boolean().default(true),
  notes: z.string().optional()
})

type CompleteSessionRequest = z.infer<typeof completeSessionSchema>

interface CompleteSessionResponse {
  sessionId: string
  finalTotal: number
  sessionCost: number
  fnbCost: number
  completedAt: string
  receipt: {
    sessionDetails: {
      unitName: string
      customerName?: string
      startTime: string
      endTime: string
      duration: string
      billingType: string
      sessionCost: number
    }
    fnbOrders: Array<{
      orderId: string
      items: Array<{
        name: string
        quantity: number
        unitPrice: number
        totalPrice: number
      }>
      totalAmount: number
      status: string
    }>
    payment: {
      subtotal: number
      fnbSubtotal: number
      totalAmount: number
      paymentMethod: string
      paidAt: string
    }
  }
}

// ============================================
// POST: COMPLETE SESSION WITH F&B
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // ===== AUTHENTICATION & AUTHORIZATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is staff or owner
    if (session.user.role !== 'staff' && session.user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // ===== GET LOCATION ID =====
    const locationId = request.headers.get('X-Location-ID')
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // ===== VALIDATE REQUEST BODY =====
    const body = await request.json()
    const validatedData = completeSessionSchema.parse(body)

    const { sessionId } = params

    // ===== FETCH SESSION WITH DETAILS =====
    const rentalSession = await prisma.rentalSession.findFirst({
      where: {
        id: sessionId,
        locationId: locationId,
        status: 'active'
      },
      include: {
        unit: true,
        fnbOrders: {
          where: {
            status: { not: 'cancelled' }
          },
          include: {
            fnbOrderItems: {
              include: {
                fnbItem: {
                  select: {
                    name: true
                  }
                }
              }
            },
            transactions: {
              select: {
                paymentStatus: true,
                amount: true
              }
            }
          }
        }
      }
    })

    if (!rentalSession) {
      return NextResponse.json(
        { success: false, error: 'Active session not found' },
        { status: 404 }
      )
    }

    // ===== CALCULATE SESSION COST (SIMPLIFIED) =====
    const endTime = new Date()
    const elapsedMinutes = Math.floor((endTime.getTime() - rentalSession.startTime.getTime()) / (1000 * 60))
    
    let sessionCost = 0
    const hourlyRate = decimalToNumber(rentalSession.unit.hourlyRate)

    // Simple calculation based on billing model
    switch (rentalSession.billingModel) {
      case 'timer':
        sessionCost = Math.ceil(elapsedMinutes * (hourlyRate / 60))
        break
        
      case 'hourly':
        const hours = Math.ceil(elapsedMinutes / 60)
        sessionCost = hourlyRate * hours
        break
        
      case 'package':
        // Use packageRates JSON or default to hourly rate
        const packageRates = rentalSession.unit.packageRates as Record<string, any> || {}
        sessionCost = Object.values(packageRates)[0] as number || hourlyRate
        break
        
      case 'hybrid':
        // Simplified hybrid calculation
        sessionCost = Math.ceil(elapsedMinutes * (hourlyRate / 60))
        break
        
      default:
        sessionCost = Math.ceil(elapsedMinutes * (hourlyRate / 60))
    }

    // ===== PREPARE F&B ORDERS DATA =====
    const fnbOrdersData = rentalSession.fnbOrders.map(order => ({
      id: order.id,
      items: order.fnbOrderItems.map(item => ({
        id: item.id,
        fnbItemName: item.fnbItem.name,
        quantity: item.quantity,
        unitPrice: decimalToNumber(item.unitPrice),
        totalPrice: decimalToNumber(item.totalPrice)
      })),
      totalAmount: decimalToNumber(order.totalAmount),
      status: order.status as 'pending' | 'completed' | 'cancelled',
      paymentTiming: (order.transactions.some(t => t.paymentStatus === 'paid') 
        ? 'immediate' 
        : 'end_of_session') as 'immediate' | 'end_of_session',
      createdAt: order.createdAt.toISOString()
    }))

    // ===== CALCULATE F&B COSTS =====
    let totalFnbCost = 0
    const unpaidFnbOrders = []

    for (const fnbOrder of fnbOrdersData) {
      // Only include unpaid orders (pending status + end_of_session payment)
      if (fnbOrder.status === 'pending' && fnbOrder.paymentTiming === 'end_of_session') {
        totalFnbCost += fnbOrder.totalAmount
        unpaidFnbOrders.push(fnbOrder)
      }
    }

    // ===== COMPLETE SESSION IN TRANSACTION =====
    const result = await prisma.$transaction(async (tx) => {
      // Update session status and end time
      const completedSession = await tx.rentalSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          endTime: endTime,
          totalCost: numberToDecimal(validatedData.final_total)
        }
      })

      // Update unit status to available
      await tx.unit.update({
        where: { id: rentalSession.unit.id },
        data: {
          status: 'available',
          customerDisplayName: null
        }
      })

      // Update session status and end time
      const completedSession = await tx.rentalSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          endTime: endTime,
          totalAmount: numberToDecimal(validatedData.final_total)
        }
      })

      // Update unit status to available
      await tx.unit.update({
        where: { id: rentalSession.unit.id },
        data: {
          status: 'available',
          customerDisplayName: null
        }
      })

      // Create session payment transaction
      const sessionTransaction = await tx.transaction.create({
        data: {
          locationId: locationId,
          rentalSessionId: sessionId,
          type: 'rental',
          amount: numberToDecimal(sessionCost),
          paymentStatus: 'paid',
          paymentMethod: validatedData.payment_method,
          description: `Session completed - ${rentalSession.unit.name}`
        }
      })

      // Process F&B orders: mark as completed and create payment transactions
      const fnbTransactions = []
      if (validatedData.include_fnb && unpaidFnbOrders.length > 0) {
        for (const unpaidOrder of unpaidFnbOrders) {
          // Find the actual order in database
          const dbOrder = rentalSession.fnbOrders.find(o => o.id === unpaidOrder.id)
          if (dbOrder) {
            // Update F&B order status to completed
            await tx.fnbOrder.update({
              where: { id: dbOrder.id },
              data: { status: 'completed' }
            })

            // Create F&B payment transaction
            const fnbTransaction = await tx.transaction.create({
              data: {
                locationId: locationId,
                fnbOrderId: dbOrder.id,
                type: 'fnb',
                amount: dbOrder.totalAmount,
                paymentStatus: 'paid',
                paymentMethod: validatedData.payment_method,
                description: `F&B payment - Order #${dbOrder.id.slice(-8)}`
              }
            })
            fnbTransactions.push(fnbTransaction)
          }
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
          locationId: locationId,
          eventType: 'SESSION_COMPLETED',
          severity: 'LOW',
          ipAddress: 'system',
          resourceType: 'rental_session',
          resourceId: sessionId,
          metadata: {
            sessionId: sessionId,
            unitId: rentalSession.unit.id,
            unitName: rentalSession.unit.name,
            customerName: rentalSession.unit.customerDisplayName,
            duration: `${elapsedMinutes} minutes`,
            sessionCost: sessionCost,
            fnbCost: totalFnbCost,
            totalAmount: validatedData.final_total,
            paymentMethod: validatedData.payment_method,
            fnbOrdersCount: unpaidFnbOrders.length
          }
        }
      })

      return {
        completedSession,
        sessionTransaction,
        fnbTransactions
      }
    })

    // ===== GENERATE RECEIPT (SIMPLIFIED) =====
    const receipt = {
      sessionDetails: {
        unitName: rentalSession.unit.name,
        customerName: rentalSession.unit.customerDisplayName || undefined,
        startTime: rentalSession.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`,
        billingType: rentalSession.billingModel,
        sessionCost: sessionCost
      },
      fnbOrders: fnbOrdersData.map(order => ({
        orderId: order.id,
        items: order.items.map(item => ({
          name: item.fnbItemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        totalAmount: order.totalAmount,
        status: order.status
      })),
      payment: {
        subtotal: sessionCost,
        fnbSubtotal: totalFnbCost,
        totalAmount: validatedData.final_total,
        paymentMethod: validatedData.payment_method,
        paidAt: endTime.toISOString()
      }
    }

    // ===== PREPARE RESPONSE =====
    const responseData: CompleteSessionResponse = {
      sessionId: sessionId,
      finalTotal: validatedData.final_total,
      sessionCost: sessionCost,
      fnbCost: totalFnbCost,
      completedAt: endTime.toISOString(),
      receipt: receipt
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Session completed successfully'
    })

  } catch (error) {
    console.error('Complete Session API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}