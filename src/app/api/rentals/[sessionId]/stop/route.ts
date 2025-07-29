// src/app/api/rentals/[sessionId]/stop/route.ts - FIXED VERSION
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
  fnbAmount: z.number().min(0).default(0),
  additionalNotes: z.string().optional()
})

// ============================================
// TYPES
// ============================================

interface StopSessionResponse {
  success: boolean
  data?: {
    sessionId: string
    unitName: string
    totalDuration: number
    finalAmount: number
    additionalAmount: number
    fnbAmount: number
    endTime: string
  }
  error?: string
  details?: unknown
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse<StopSessionResponse>> {
  try {
    // Resolve params
    const { sessionId } = await context.params
    
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
        unit: {
          include: {
            location: {
              include: {
                tenant: true
              }
            }
          }
        },
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

    // Verify user has access to this location - FIXED OWNER PERMISSION
    if (session.user.role !== 'super_admin') {
      if (session.user.role === 'owner') {
        // Owner can access any location in their tenant
        if (session.user.tenantId !== rentalSession.unit.location.tenant.id) {
          return NextResponse.json(
            { success: false, error: 'Access denied to this tenant' },
            { status: 403 }
          )
        }
      } else if (session.user.role === 'staff') {
        // Staff must be assigned to the specific location
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
              ? `Timer session: ${durationMinutes} minutes`
              : `Overtime charges: ${Math.floor(additionalAmount / parseFloat(rentalSession.unit.hourlyRate.toString()) * 60)} minutes`
          }
        })
      }

      // Create F&B payment transaction if there's F&B amount
      if (fnbAmount > 0) {
        await tx.transaction.create({
          data: {
            locationId: locationId,
            rentalSessionId: sessionId,
            type: 'fnb',
            amount: fnbAmount,
            paymentStatus: PaymentStatus.paid,
            paymentMethod: validatedData.paymentMethod,
            description: 'F&B orders'
          }
        })
      }

      // Update work session revenue if active
      const activeWorkSession = await tx.workSession.findFirst({
        where: {
          locationId: locationId,
          status: 'active'
        }
      })

      if (activeWorkSession) {
        const sessionRevenue = rentalSession.billingModel === 'timer' ? finalAmount - fnbAmount : additionalAmount
        const revenueField = rentalSession.billingModel === 'package' ? 'packageRevenue' : 
                           rentalSession.billingModel === 'hourly' ? 'hourlyRevenue' : 'payLaterRevenue'
        
        await tx.workSession.update({
          where: { id: activeWorkSession.id },
          data: {
            totalRevenue: { increment: finalAmount },
            [revenueField]: { increment: sessionRevenue }
          }
        })
      }

      return updatedSession
    })

    console.log('✅ Session stopped successfully:', {
      sessionId,
      duration: durationMinutes,
      finalAmount,
      billingModel: rentalSession.billingModel
    })

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.id,
        unitName: rentalSession.unit.customerDisplayName || rentalSession.unit.name,
        totalDuration: durationMinutes,
        finalAmount: finalAmount,
        additionalAmount: additionalAmount,
        fnbAmount: fnbAmount,
        endTime: endTime.toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error stopping session:', error)
    
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