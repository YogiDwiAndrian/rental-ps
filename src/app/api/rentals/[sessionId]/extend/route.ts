// src/app/api/rentals/[sessionId]/extend/route.ts
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
  additionalDuration: z.number().min(15, 'Minimum extension is 15 minutes').max(240, 'Maximum extension is 4 hours'),
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash'),
  notes: z.string().optional()
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
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse<ExtendSessionResponse>> {
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
            hourlyRate: true
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

    // Validate extension for different billing models
    if (rentalSession.billingModel === 'timer') {
      return NextResponse.json(
        { success: false, error: 'Timer sessions cannot be extended. They are billed at the end.' },
        { status: 400 }
      )
    }

    // Calculate extension cost
    const hourlyRate = parseFloat(rentalSession.unit.hourlyRate.toString())
    const extensionCost = calculateExtensionCost(validatedData.additionalDuration, hourlyRate)

    // Calculate times
    const currentTotalDuration = rentalSession.purchasedDuration + rentalSession.extendedDuration
    const originalEndTime = new Date(rentalSession.startTime.getTime() + currentTotalDuration * 60 * 1000)
    const newEndTime = new Date(originalEndTime.getTime() + validatedData.additionalDuration * 60 * 1000)

    // Calculate extension count (how many times this session has been extended)
    const currentExtensions = Math.floor(rentalSession.extendedDuration / 30) // Assuming 30min standard extensions
    const newExtensionCount = currentExtensions + 1

    // Execute database transaction to extend session
    const result = await prisma.$transaction(async (tx) => {
      // Update rental session with extended duration and new total amount
      const updatedSession = await tx.rentalSession.update({
        where: { id: sessionId },
        data: {
          extendedDuration: { increment: validatedData.additionalDuration },
          totalAmount: { increment: extensionCost }
        }
      })

      // Create extension payment transaction
      await tx.transaction.create({
        data: {
          locationId: locationId,
          rentalSessionId: sessionId,
          type: 'extension',
          amount: extensionCost,
          paymentStatus: PaymentStatus.paid,
          paymentMethod: validatedData.paymentMethod,
          description: `${validatedData.additionalDuration} minute extension`
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
        await tx.workSession.update({
          where: { id: activeWorkSession.id },
          data: {
            totalRevenue: { increment: extensionCost }
          }
        })
      }

      return updatedSession
    })

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.id,
        unitName: rentalSession.unit.customerDisplayName || rentalSession.unit.name,
        originalEndTime: originalEndTime.toISOString(),
        newEndTime: newEndTime.toISOString(),
        additionalAmount: extensionCost,
        totalPaid: parseFloat(result.totalAmount.toString()),
        extensionCount: newExtensionCount,
        additionalDuration: validatedData.additionalDuration
      }
    })

  } catch (error) {
    console.error('Error extending session:', error)
    
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