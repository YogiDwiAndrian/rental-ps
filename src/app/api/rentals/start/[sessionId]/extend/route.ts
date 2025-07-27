// src/app/api/rentals/[sessionId]/extend/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { BillingType } from '@prisma/client'

// Input validation schema
const extendSessionSchema = z.object({
  additionalDuration: z.number().int().min(15, 'Minimum extension is 15 minutes').max(480, 'Maximum extension is 8 hours'),
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash'),
  notes: z.string().optional()
})

// Response type
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
  }
  error?: string
  details?: unknown
}

interface RouteParams {
  sessionId: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
): Promise<NextResponse<ExtendSessionResponse>> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'staff') {
      return NextResponse.json({
        success: false,
        error: 'Only staff can extend rental sessions'
      }, { status: 401 })
    }

    // Get location from header
    const locationId = request.headers.get('X-Location-ID')
    if (!locationId) {
      return NextResponse.json({
        success: false,
        error: 'Location ID header is required'
      }, { status: 400 })
    }

    // Validate input
    const body = await request.json()
    const validatedData = extendSessionSchema.parse(body)
    const { sessionId } = params

    // Get existing session with all necessary data - using ONLY relations that exist in schema
    const existingSession = await prisma.rentalSession.findFirst({
      where: {
        id: sessionId,
        locationId: locationId,
        status: 'active'
      },
      include: {
        unit: {
          select: {
            id: true,
            name: true,
            customerDisplayName: true,
            hourlyRate: true
          }
        },
        location: {
          select: {
            name: true
          }
        }
      }
    })

    if (!existingSession) {
      return NextResponse.json({
        success: false,
        error: 'Active session not found'
      }, { status: 404 })
    }

    // Verify staff has access to this location
    const locationAccess = await prisma.locationAssignment.findFirst({
      where: {
        userId: session.user.id,
        locationId: locationId,
        isActive: true
      }
    })

    if (!locationAccess) {
      return NextResponse.json({
        success: false,
        error: 'Access denied to this location'
      }, { status: 403 })
    }

    // Check if session can be extended based on billing model
    if (existingSession.billingModel === 'timer') {
      return NextResponse.json({
        success: false,
        error: 'Timer billing sessions cannot be extended. Please stop and start a new session.'
      }, { status: 400 })
    }

    // Calculate extension cost
    const hourlyRate = Number(existingSession.unit.hourlyRate)
    const additionalAmount = Math.ceil((validatedData.additionalDuration / 60) * hourlyRate)

    // Calculate original and new end times
    let originalEndTime: Date
    let newEndTime: Date

    if (existingSession.purchasedDuration) {
      // Calculate based on start time + purchased duration + previous extensions
      const totalDuration = existingSession.purchasedDuration + existingSession.extendedDuration
      originalEndTime = new Date(existingSession.startTime.getTime() + totalDuration * 60000)
      newEndTime = new Date(originalEndTime.getTime() + validatedData.additionalDuration * 60000)
    } else {
      // Fallback to current time + extension
      originalEndTime = new Date()
      newEndTime = new Date(originalEndTime.getTime() + validatedData.additionalDuration * 60000)
    }

    // Update session in database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record for the extension
      await tx.transaction.create({
        data: {
          locationId: locationId,
          rentalSessionId: sessionId,
          type: 'extension',
          amount: additionalAmount,
          paymentStatus: 'paid',
          paymentMethod: validatedData.paymentMethod,
          description: `Extended ${validatedData.additionalDuration} minutes`
        }
      })

      // Update rental session - using ONLY fields that exist in schema
      const updatedSession = await tx.rentalSession.update({
        where: { id: sessionId },
        data: {
          extendedDuration: {
            increment: validatedData.additionalDuration
          },
          totalAmount: {
            increment: additionalAmount
          }
        },
        include: {
          unit: {
            select: {
              name: true,
              customerDisplayName: true
            }
          }
        }
      })

      return updatedSession
    })

    // Count total extensions (simplified for now)
    const extensionCount = 1 // We can improve this later with proper tracking

    // Calculate total amount paid (including extensions)
    const totalPaid = Number(result.totalAmount || 0)

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.id,
        unitName: result.unit.customerDisplayName || result.unit.name,
        originalEndTime: originalEndTime.toISOString(),
        newEndTime: newEndTime.toISOString(),
        additionalAmount: additionalAmount,
        totalPaid: totalPaid,
        extensionCount: extensionCount
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error extending rental session:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}