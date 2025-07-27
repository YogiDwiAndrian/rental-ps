// src/app/api/rentals/[sessionId]/stop/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { SessionStatus, UnitStatus } from '@prisma/client'

// Input validation schema
const stopSessionSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash'),
  notes: z.string().optional(),
  fnbAmount: z.number().min(0).optional()
})

// Response type
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
    }
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
): Promise<NextResponse<StopSessionResponse>> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'staff') {
      return NextResponse.json({
        success: false,
        error: 'Only staff can stop rental sessions'
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
    const validatedData = stopSessionSchema.parse(body)
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

    // Calculate session duration and amounts
    const endTime = new Date()
    const durationMs = endTime.getTime() - existingSession.startTime.getTime()
    const durationMinutes = Math.ceil(durationMs / (1000 * 60)) // Round up to next minute
    
    // Format duration for display
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    const durationFormatted = hours > 0 
      ? `${hours}h ${minutes}m` 
      : `${minutes}m`

    // Calculate total amount based on billing model
    let finalAmount: number
    
    switch (existingSession.billingModel) {
      case 'timer':
        // Calculate based on actual duration
        finalAmount = Math.ceil(durationMinutes * (Number(existingSession.unit.hourlyRate) / 60))
        break
        
      case 'hourly':
      case 'package':
        // Use the pre-set amount plus any additional charges
        finalAmount = Number(existingSession.totalAmount || 0)
        break
        
      default:
        finalAmount = 0
    }

    // Add any additional F&B charges
    if (validatedData.fnbAmount) {
      finalAmount += validatedData.fnbAmount
    }

    // Update session and unit status in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update rental session - using ONLY fields that exist in schema
      const updatedSession = await tx.rentalSession.update({
        where: { id: sessionId },
        data: {
          endTime: endTime,
          status: 'completed' as SessionStatus,
          totalAmount: finalAmount
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

      // Update unit status back to available
      await tx.unit.update({
        where: { id: existingSession.unitId },
        data: { status: 'available' as UnitStatus }
      })

      return updatedSession
    })

    // Create receipt data
    const receipt = {
      sessionId: result.id,
      unitName: result.unit.customerDisplayName || result.unit.name,
      startTime: existingSession.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: durationFormatted,
      billingModel: existingSession.billingModel,
      totalAmount: finalAmount,
      paymentMethod: validatedData.paymentMethod
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.id,
        unitName: result.unit.customerDisplayName || result.unit.name,
        duration: durationFormatted,
        totalAmount: finalAmount,
        paymentMethod: validatedData.paymentMethod,
        receipt: receipt
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error stopping rental session:', error)

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