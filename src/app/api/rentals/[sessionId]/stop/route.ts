// src/app/api/rentals/[sessionId]/stop/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { SessionStatus, PaymentStatus, TransactionType, UnitStatus } from '@prisma/client'

// ============================================
// VALIDATION SCHEMA
// ============================================

const stopSessionSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash'),
  fnbAmount: z.number().min(0).optional(), // Additional manual F&B
  notes: z.string().optional()
})

type StopSessionRequest = z.infer<typeof stopSessionSchema>

// ============================================
// RESPONSE TYPES
// ============================================

interface SessionDetails {
  unitName: string
  startTime: string
  endTime: string
  duration: string
  billingType: string
  sessionCost: number
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

interface PaymentDetails {
  sessionSubtotal: number
  fnbAttachedSubtotal: number
  fnbManualSubtotal: number
  totalAmount: number
  paymentMethod: string
  paidAt: string
}

interface Receipt {
  sessionDetails: SessionDetails
  fnbAttachedOrders: FnbOrderReceipt[]
  fnbManualAmount: number
  payment: PaymentDetails
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
// UTILITY FUNCTIONS
// ============================================

function calculateSessionDuration(startTime: Date, endTime: Date): number {
  return Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60))
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) return `${mins} menit`
  if (mins === 0) return `${hours} jam`
  return `${hours} jam ${mins} menit`
}

function calculateTimerBilling(durationMinutes: number, hourlyRate: number): number {
  return Math.ceil(durationMinutes * (hourlyRate / 60))
}

function calculateOvertimeCharge(
  session: { billingModel: string; startTime: Date; purchasedDuration: number },
  endTime: Date,
  hourlyRate: number
): number {
  if (session.billingModel !== 'hourly' && session.billingModel !== 'package') {
    return 0
  }

  const actualDurationMinutes = calculateSessionDuration(session.startTime, endTime)
  const overtimeMinutes = Math.max(0, actualDurationMinutes - session.purchasedDuration)
  
  if (overtimeMinutes <= 5) { // 5 minute grace period
    return 0
  }

  return Math.ceil((overtimeMinutes / 60) * hourlyRate)
}

// ============================================
// POST: STOP SESSION
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // ===== AUTHENTICATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions
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
        { success: false, error: 'Location ID required in headers' },
        { status: 400 }
      )
    }

    // ===== VALIDATE REQUEST BODY =====
    const body = await request.json()
    const validatedData = stopSessionSchema.parse(body)
    const { sessionId } = params

    // ===== VERIFY LOCATION ACCESS =====
    if (session.user.role === 'staff') {
      const hasAccess = await prisma.locationAssignment.findFirst({
        where: {
          userId: session.user.id,
          locationId: locationId,
          isActive: true
        }
      })

      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this location' },
          { status: 403 }
        )
      }
    }

    // ===== GET RENTAL SESSION =====
    const rentalSession = await prisma.rentalSession.findFirst({
      where: {
        id: sessionId,
        locationId: locationId,
        status: SessionStatus.active
      },
      include: {
        unit: {
          select: {
            id: true,
            name: true,
            hourlyRate: true
          }
        },
        location: {
          select: {
            id: true,
            name: true
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

    // ===== CALCULATE SESSION COST =====
    const endTime = new Date()
    const startTime = new Date(rentalSession.startTime)
    const actualDurationMinutes = calculateSessionDuration(startTime, endTime)
    const hourlyRate = Number(rentalSession.unit.hourlyRate)
    
    let sessionCost = 0
    let overtimeCost = 0
    
    switch (rentalSession.billingModel) {
      case 'timer':
        sessionCost = calculateTimerBilling(actualDurationMinutes, hourlyRate)
        break
      case 'hourly':
      case 'package':
        // Base cost is already paid upfront
        sessionCost = Number(rentalSession.totalAmount)
        // Calculate overtime if any
        overtimeCost = calculateOvertimeCharge(
          {
            billingModel: rentalSession.billingModel,
            startTime: startTime,
            purchasedDuration: rentalSession.purchasedDuration + rentalSession.extendedDuration
          },
          endTime,
          hourlyRate
        )
        sessionCost += overtimeCost
        break
      default:
        throw new Error(`Unknown billing model: ${rentalSession.billingModel}`)
    }

    // ===== GET ATTACHED F&B ORDERS =====
    const attachedFnbOrders = await prisma.fnbOrder.findMany({
      where: {
        rentalSessionId: sessionId
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
    })

    const totalAttachedFnbCost = attachedFnbOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount), 
      0
    )

    const manualFnbCost = validatedData.fnbAmount || 0
    const totalFnbCost = totalAttachedFnbCost + manualFnbCost
    const finalTotal = sessionCost + totalFnbCost

    // ===== DATABASE TRANSACTION =====
    const result = await prisma.$transaction(async (tx) => {
      // Update rental session
      const updatedSession = await tx.rentalSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.completed,
          endTime: endTime,
          totalAmount: sessionCost
        }
      })

      // Create rental transaction
      const rentalTransaction = await tx.transaction.create({
        data: {
          locationId: locationId,
          rentalSessionId: sessionId,
          type: TransactionType.rental,
          amount: sessionCost,
          paymentStatus: PaymentStatus.paid,
          paymentMethod: validatedData.paymentMethod,
          description: overtimeCost > 0 
            ? `Rental completed - ${rentalSession.unit.name} (includes overtime: ${formatCurrency(overtimeCost)})`
            : `Rental completed - ${rentalSession.unit.name}`
        }
      })

      // Create F&B transactions for attached orders
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

      // Create manual F&B transaction if any
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
      }

      // Update unit status
      await tx.unit.update({
        where: { id: rentalSession.unitId },
        data: { 
          status: UnitStatus.available,
          customerDisplayName: null // Clear customer name
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
      status: order.status
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

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Session stopped and payment processed successfully'
    })

  } catch (error) {
    console.error('Stop Session API Error:', error)

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
// UTILITY FUNCTION FOR CURRENCY FORMATTING
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}