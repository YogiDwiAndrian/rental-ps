// src/app/api/rentals/[sessionId]/stop/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { SessionStatus, UnitStatus, PaymentStatus } from '@prisma/client'

// ============================================
// VALIDATION SCHEMA
// ============================================

const stopSessionSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash'),
  fnbAmount: z.number().min(0).optional(),
  notes: z.string().optional()
})

// ============================================
// TYPES
// ============================================

interface StopSessionResponse {
  success: boolean
  data?: {
    sessionId: string
    unitName: string
    duration: string
    totalAmount: number
    paymentMethod: string
    receipt: {
      sessionId: string
      unitName: string
      startTime: string
      endTime: string
      duration: string
      billingModel: string
      totalAmount: number
      paymentMethod: string
      fnbAmount?: number
    }
  }
  error?: string
  details?: unknown
}

// ============================================
// UTILS
// ============================================

const formatDuration = (startTime: Date, endTime: Date): string => {
  const durationMs = endTime.getTime() - startTime.getTime()
  const totalMinutes = Math.floor(durationMs / (1000 * 60))
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse<StopSessionResponse>> {
  try {
    // Resolve params
    const resolvedParams = await params
    const { sessionId } = resolvedParams
    
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get location ID from header
    const locationId = request.headers.get('X-Location-ID')
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = stopSessionSchema.parse(body)

    // Get active rental session with related data
    const rentalSession = await prisma.rentalSession.findFirst({
      where: {
        id: sessionId,
        locationId: locationId,
        status: SessionStatus.active
      },
      include: {
        unit: true,
        transactions: true,
        fnbOrders: {
          include: {
            fnbOrderItems: {
              include: {
                fnbItem: true
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

    // Verify user has access to this location
    if (session.user.role !== 'super_admin') {
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

    const endTime = new Date()
    const durationMinutes = Math.floor((endTime.getTime() - rentalSession.startTime.getTime()) / (1000 * 60))

    // Calculate final amount based on billing model
    let finalAmount = parseFloat(rentalSession.totalAmount.toString())
    let additionalAmount = 0

    if (rentalSession.billingModel === 'timer') {
      // Timer mode - calculate based on actual duration
      const hourlyRate = parseFloat(rentalSession.unit.hourlyRate.toString())
      finalAmount = Math.ceil((durationMinutes / 60) * hourlyRate)
    } else if (rentalSession.billingModel === 'hourly') {
      // Hourly mode - check for overtime
      const totalPurchasedDuration = rentalSession.purchasedDuration + rentalSession.extendedDuration
      
      if (durationMinutes > totalPurchasedDuration) {
        // Calculate overtime charges
        const overtimeMinutes = durationMinutes - totalPurchasedDuration
        const hourlyRate = parseFloat(rentalSession.unit.hourlyRate.toString())
        additionalAmount = Math.ceil((overtimeMinutes / 60) * hourlyRate)
        finalAmount += additionalAmount
      }
    }
    // Package mode uses existing totalAmount

    // Add F&B amount if provided
    const fnbAmount = validatedData.fnbAmount || 0
    finalAmount += fnbAmount

    // Execute database transaction to stop session
    const result = await prisma.$transaction(async (tx) => {
      // Update session status and end time
      const updatedSession = await tx.rentalSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.completed,
          endTime: endTime,
          totalAmount: finalAmount
        }
      })

      // Update unit status back to available
      await tx.unit.update({
        where: { id: rentalSession.unitId },
        data: { 
          status: UnitStatus.available,
          customerDisplayName: null
        }
      })

      // Create payment transaction for additional charges (timer mode or overtime)
      if (rentalSession.billingModel === 'timer' || additionalAmount > 0) {
        const paymentAmount = rentalSession.billingModel === 'timer' 
          ? finalAmount - fnbAmount 
          : additionalAmount

        await tx.transaction.create({
          data: {
            locationId: locationId,
            rentalSessionId: sessionId,
            type: 'rental',
            amount: paymentAmount,
            paymentStatus: PaymentStatus.paid,
            paymentMethod: validatedData.paymentMethod,
            description: rentalSession.billingModel === 'timer' 
              ? 'Timer session final payment'
              : 'Overtime charges'
          }
        })
      }

      // Create F&B transaction if needed
      if (fnbAmount > 0) {
        await tx.transaction.create({
          data: {
            locationId: locationId,
            rentalSessionId: sessionId,
            type: 'fnb',
            amount: fnbAmount,
            paymentStatus: PaymentStatus.paid,
            paymentMethod: validatedData.paymentMethod,
            description: 'F&B charges'
          }
        })
      }

      // Update work session revenue
      const activeWorkSession = await tx.workSession.findFirst({
        where: {
          locationId: locationId,
          status: 'active'
        }
      })

      if (activeWorkSession) {
        const revenueIncrease = finalAmount - parseFloat(rentalSession.totalAmount.toString())
        
        await tx.workSession.update({
          where: { id: activeWorkSession.id },
          data: {
            totalRevenue: { increment: revenueIncrease }
          }
        })
      }

      return updatedSession
    })

    // Generate receipt data
    const durationFormatted = formatDuration(rentalSession.startTime, endTime)
    
    const receipt = {
      sessionId: result.id,
      unitName: rentalSession.unit.customerDisplayName || rentalSession.unit.name,
      startTime: rentalSession.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: durationFormatted,
      billingModel: rentalSession.billingModel,
      totalAmount: finalAmount,
      paymentMethod: validatedData.paymentMethod,
      ...(fnbAmount > 0 && { fnbAmount })
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.id,
        unitName: rentalSession.unit.customerDisplayName || rentalSession.unit.name,
        duration: durationFormatted,
        totalAmount: finalAmount,
        paymentMethod: validatedData.paymentMethod,
        receipt: receipt
      }
    })

  } catch (error) {
    console.error('Error stopping session:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input data',
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