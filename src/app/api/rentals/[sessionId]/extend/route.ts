// src/app/api/rentals/[sessionId]/extend/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { SessionStatus, PaymentStatus } from '@prisma/client'

// ============================================
// VALIDATION SCHEMA
// ============================================

const extendSessionSchema = z.object({
  additionalDuration: z.number().min(15, 'Minimum extension is 15 minutes').max(480, 'Maximum extension is 8 hours'),
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash')
})

// ============================================
// TYPES
// ============================================

interface ExtendSessionResponse {
  success: boolean
  data?: {
    sessionId: string
    unitName: string
    originalEndTime: string
    newEndTime: string
    additionalAmount: number
    totalPaid: number
    extensionCount: number
    additionalDuration: number
  }
  error?: string
  details?: unknown
}

// ============================================
// UTILS
// ============================================

const calculateExtensionCost = (additionalMinutes: number, hourlyRate: number): number => {
  return Math.ceil((additionalMinutes / 60) * hourlyRate)
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse<ExtendSessionResponse>> {
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
    const validatedData = extendSessionSchema.parse(body)

    // Get active rental session with unit details
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
            customerDisplayName: true,
            hourlyRate: true,
            location: {
              include: {
                tenant: true
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

    // Validate extension for different billing models
    if (rentalSession.billingModel === 'timer') {
      return NextResponse.json(
        { success: false, error: 'Timer sessions cannot be extended. They are billed at the end.' },
        { status: 400 }
      )
    }

    // Calculate extension cost
    const hourlyRate = parseFloat(rentalSession.unit.hourlyRate.toString())
    const additionalAmount = calculateExtensionCost(validatedData.additionalDuration, hourlyRate)

    // Calculate current and new end times
    const currentEndTime = new Date(
      rentalSession.startTime.getTime() + 
      (rentalSession.purchasedDuration + rentalSession.extendedDuration) * 60 * 1000
    )
    const newEndTime = new Date(currentEndTime.getTime() + validatedData.additionalDuration * 60 * 1000)

    // Execute database transaction to extend session
    const result = await prisma.$transaction(async (tx) => {
      // Update session with extended duration
      const updatedSession = await tx.rentalSession.update({
        where: { id: sessionId },
        data: {
          extendedDuration: rentalSession.extendedDuration + validatedData.additionalDuration,
          totalAmount: { increment: additionalAmount }
        }
      })

      // Create payment transaction for extension
      await tx.transaction.create({
        data: {
          locationId: locationId,
          rentalSessionId: sessionId,
          type: 'rental',
          amount: additionalAmount,
          paymentStatus: PaymentStatus.paid,
          paymentMethod: validatedData.paymentMethod,
          description: `Session extension: ${validatedData.additionalDuration} minutes`
        }
      })

      // Update work session revenue if active
      const activeWorkSession = await tx.workSession.findFirst({
        where: {
          locationId: locationId,
          status: 'active'
        }
      })

      if (activeWorkSession) {
        const revenueField = rentalSession.billingModel === 'package' ? 'packageRevenue' : 'hourlyRevenue'
        
        await tx.workSession.update({
          where: { id: activeWorkSession.id },
          data: {
            totalRevenue: { increment: additionalAmount },
            [revenueField]: { increment: additionalAmount }
          }
        })
      }

      return updatedSession
    })

    console.log('✅ Session extended successfully:', {
      sessionId,
      additionalDuration: validatedData.additionalDuration,
      additionalAmount,
      newEndTime: newEndTime.toISOString()
    })

    // Count total extensions
    const extensionCount = Math.floor(result.extendedDuration / validatedData.additionalDuration)

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.id,
        unitName: rentalSession.unit.customerDisplayName || rentalSession.unit.name,
        originalEndTime: currentEndTime.toISOString(),
        newEndTime: newEndTime.toISOString(),
        additionalAmount: additionalAmount,
        totalPaid: parseFloat(result.totalAmount.toString()),
        extensionCount: extensionCount,
        additionalDuration: validatedData.additionalDuration
      }
    })

  } catch (error) {
    console.error('❌ Error extending session:', error)
    
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
        error: 'Failed to extend session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}