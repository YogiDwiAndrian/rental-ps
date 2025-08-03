// src/app/api/rentals/[sessionId]/stop/route.ts - FIXED to update F&B orders status correctly
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { TransactionType, PaymentStatus, UnitStatus, SessionStatus } from '@prisma/client'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const stopSessionSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash'),
  fnbAmount: z.number().min(0).default(0),
  notes: z.string().optional()
})

// ============================================
// TYPES
// ============================================

interface RouteParams {
  sessionId: string
}

interface FnbOrderItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface FnbOrderReceipt {
  orderId: string
  items: FnbOrderItem[]
  totalAmount: number
  status: string
}

interface Receipt {
  sessionDetails: {
    unitName: string
    startTime: string
    endTime: string
    duration: string
    billingType: string
    sessionCost: number
  }
  fnbAttachedOrders: FnbOrderReceipt[]
  fnbManualAmount: number
  payment: {
    sessionSubtotal: number
    fnbAttachedSubtotal: number
    fnbManualSubtotal: number
    totalAmount: number
    paymentMethod: string
    paidAt: string
  }
}

interface StopSessionResponse {
  sessionId: string
  finalTotal: number
  sessionCost: number
  fnbAttachedCost: number
  fnbManualCost: number
  completedAt: string
  receipt: Receipt
}

// ============================================
// MAIN HANDLER  
// ============================================

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
): Promise<NextResponse<{ success: boolean; data?: StopSessionResponse; error?: string; details?: string | { field: string; message: string }[]; message?: string }>> {
  try {
    // ===== AUTHENTICATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
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

    // ===== PARSE PARAMS & BODY =====
    const { sessionId } = await context.params
    const body = await request.json()
    const validatedData = stopSessionSchema.parse(body)

    // ===== VALIDATE SESSION =====
    const rentalSession = await prisma.rentalSession.findFirst({
      where: {
        id: sessionId,
        locationId: locationId,
        status: SessionStatus.active
      },
      include: {
        unit: true,
        // FIXED: Get F&B orders that are attached to this session with pending status (exclude cancelled)
        fnbOrders: {
          where: {
            rentalSessionId: sessionId,
            status: 'pending' // Only get pending F&B orders, exclude cancelled ones
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

    // ===== CALCULATE COSTS =====
    const startTime = new Date(rentalSession.startTime)
    const endTime = new Date()
    const actualDurationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60))

    let sessionCost = 0
    const hourlyRate = Number(rentalSession.unit.hourlyRate)
    
    // Calculate cost based on billing model
    switch (rentalSession.billingModel) {
      case 'timer':
        sessionCost = (actualDurationMinutes / 60) * hourlyRate
        break
        
      case 'hourly':
        const purchasedMinutes = rentalSession.purchasedDuration + rentalSession.extendedDuration 
        if (actualDurationMinutes > purchasedMinutes) {
          // Overtime calculation
          const overtimeMinutes = actualDurationMinutes - purchasedMinutes
          sessionCost = Number(rentalSession.totalAmount) + ((overtimeMinutes / 60) * hourlyRate)
        } else {
          sessionCost = Number(rentalSession.totalAmount)
        }
        break
        
      case 'package':
        const purchasedPackageMinutes = rentalSession.purchasedDuration + rentalSession.extendedDuration
        if (actualDurationMinutes > purchasedPackageMinutes) {
          // Convert to hourly after package expires
          const overtimeMinutes = actualDurationMinutes - purchasedPackageMinutes
          sessionCost = Number(rentalSession.totalAmount) + ((overtimeMinutes / 60) * hourlyRate)
        } else {
          sessionCost = Number(rentalSession.totalAmount)
        }
        break
        
      default:
        throw new Error(`Invalid billing model: ${rentalSession.billingModel}`)
    }

    // Get attached F&B orders (pending status = end_of_session payment timing)
    const attachedFnbOrders = rentalSession.fnbOrders
    const totalAttachedFnbCost = attachedFnbOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

    // Manual F&B cost from form
    const manualFnbCost = validatedData.fnbAmount || 0

    // Final total
    const finalTotal = sessionCost + totalAttachedFnbCost + manualFnbCost

    console.log('🛑 Stop Session - Costs calculated:', {
      sessionId,
      sessionCost,
      attachedFnbOrdersCount: attachedFnbOrders.length,
      totalAttachedFnbCost,
      manualFnbCost,
      finalTotal
    })

    // ===== DATABASE TRANSACTION =====
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update rental session to completed
      const updatedSession = await tx.rentalSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.completed,
          endTime: endTime,
          totalAmount: sessionCost, // Only session cost
          updatedAt: new Date()
        }
    
      })

      console.log('✅ Rental session updated to completed')

      // 2. CRITICAL FIX: Update attached F&B orders from 'pending' to 'completed'
      if (attachedFnbOrders.length > 0) {
        const updateResult = await tx.fnbOrder.updateMany({
          where: {
            id: { in: attachedFnbOrders.map(order => order.id) },
            rentalSessionId: sessionId,
            status: 'pending'
          },
          data: {
            status: 'completed',
            updatedAt: new Date()
          }
        })
        
        console.log(`✅ Updated ${updateResult.count} F&B orders from pending to completed`)
      }

      // 3. Create rental transaction
      const rentalTransaction = await tx.transaction.create({
        data: {
          locationId: locationId,
          rentalSessionId: sessionId,
          type: TransactionType.rental,
          amount: sessionCost,
          paymentStatus: PaymentStatus.paid,
          paymentMethod: validatedData.paymentMethod,
          description: `Rental completed - ${rentalSession.unit.name}`
        }
      })

      console.log('✅ Rental transaction created')

      // 4. Create F&B transactions for attached orders (now they're completed)
      const fnbTransactions = []
      for (const order of attachedFnbOrders) {
        const fnbTransaction = await tx.transaction.create({
          data: {
            locationId: locationId,
            fnbOrderId: order.id,
            type: TransactionType.fnb,
            amount: Number(order.totalAmount),
            paymentStatus: PaymentStatus.paid,
            paymentMethod: validatedData.paymentMethod,
            description: `F&B order completed - attached to session`
          }
        })
        fnbTransactions.push(fnbTransaction)
      }

      console.log(`✅ Created ${fnbTransactions.length} F&B transactions`)

      // 5. Create manual F&B transaction if any
      let manualFnbTransaction = null
      if (manualFnbCost > 0) {
        manualFnbTransaction = await tx.transaction.create({
          data: {
            locationId: locationId,
            rentalSessionId: sessionId,
            type: TransactionType.fnb,
            amount: manualFnbCost,
            paymentStatus: PaymentStatus.paid,
            paymentMethod: validatedData.paymentMethod,
            description: `Manual F&B charge - ${validatedData.notes || 'Additional items'}`
          }
        })
        
        console.log('✅ Manual F&B transaction created')
      }

      // 6. Update unit status to available
      await tx.unit.update({
        where: { id: rentalSession.unitId },
        data: { 
          status: UnitStatus.available,
          customerDisplayName: null // Clear customer name
        }
      })

      console.log('✅ Unit status updated to available')

      // 7. Create audit log
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
            unitName: rentalSession.unit.name,
            duration: formatDuration(actualDurationMinutes),
            finalTotal: finalTotal,
            sessionCost: sessionCost,
            fnbAttachedCost: totalAttachedFnbCost,
            manualFnbCost: manualFnbCost,
            paymentMethod: validatedData.paymentMethod,
            completedFnbOrderIds: attachedFnbOrders.map(order => order.id)
          }
        }
      })

      return {
        session: updatedSession,
        rentalTransaction,
        fnbTransactions,
        manualFnbTransaction
      }
    })

    // ===== PREPARE RECEIPT DATA =====
    const durationString = formatDuration(actualDurationMinutes)
    
    const fnbAttachedOrdersData: FnbOrderReceipt[] = attachedFnbOrders.map(order => ({
      orderId: order.id,
      items: order.fnbOrderItems.map(item => ({
        name: item.fnbItem.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice)
      })),
      totalAmount: Number(order.totalAmount),
      status: 'completed' // Now they're completed
    }))

    const receipt: Receipt = {
      sessionDetails: {
        unitName: rentalSession.unit.name,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: durationString,
        billingType: rentalSession.billingModel,
        sessionCost: sessionCost
      },
      fnbAttachedOrders: fnbAttachedOrdersData,
      fnbManualAmount: manualFnbCost,
      payment: {
        sessionSubtotal: sessionCost,
        fnbAttachedSubtotal: totalAttachedFnbCost,
        fnbManualSubtotal: manualFnbCost,
        totalAmount: finalTotal,
        paymentMethod: validatedData.paymentMethod,
        paidAt: endTime.toISOString()
      }
    }

    // ===== PREPARE RESPONSE =====
    const responseData: StopSessionResponse = {
      sessionId: sessionId,
      finalTotal: finalTotal,
      sessionCost: sessionCost,
      fnbAttachedCost: totalAttachedFnbCost,
      fnbManualCost: manualFnbCost,
      completedAt: endTime.toISOString(),
      receipt: receipt
    }

    console.log('✅ Stop session completed successfully:', {
      sessionId,
      finalTotal,
      fnbOrdersCompleted: attachedFnbOrders.length
    })

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Session stopped and payment processed successfully'
    })

  } catch (error) {
    console.error('❌ Stop Session API Error:', error)

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }
    
    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to stop session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`
  } else {
    return `${minutes}m`
  }
}