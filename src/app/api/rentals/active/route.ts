// src/app/api/rentals/active/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SessionStatus } from '@prisma/client'

// ============================================
// TYPES
// ============================================

interface ActiveSessionResponse {
  sessionId: string
  unitId: string
  unitName: string
  billingModel: 'timer' | 'hourly' | 'package'
  startTime: string
  estimatedEndTime?: string
  remainingMinutes?: number
  totalAmount: number
  isOvertime: boolean
}

interface GetActiveSessionsResponse {
  success: boolean
  data?: ActiveSessionResponse[]
  error?: string
  details?: unknown
}

// ============================================
// GET HANDLER
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse<GetActiveSessionsResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get location ID from query params
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this location
    if (session.user.role !== 'super_admin') {
      if (session.user.role === 'owner') {
        // Owner can access any location in their tenant
        const location = await prisma.location.findFirst({
          where: {
            id: locationId,
            isActive: true
          },
          select: {
            id: true,
            tenantId: true
          }
        })

        if (!location) {
          return NextResponse.json(
            { success: false, error: 'Location not found' },
            { status: 404 }
          )
        }

        if (session.user.tenantId !== location.tenantId) {
          return NextResponse.json(
            { success: false, error: 'Access denied to this location' },
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

    // Get active rental sessions with unit details
    const activeSessions = await prisma.rentalSession.findMany({
      where: {
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
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    // Transform data for frontend
    const currentTime = new Date()
    
    const transformedSessions: ActiveSessionResponse[] = activeSessions.map(rentalSession => {
      const startTime = rentalSession.startTime
      const totalPurchasedDuration = rentalSession.purchasedDuration + rentalSession.extendedDuration
      const actualDurationMinutes = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60))

      let estimatedEndTime: string | undefined
      let remainingMinutes: number | undefined
      let isOvertime = false

      // Calculate estimated end time and remaining minutes for hourly and package modes
      if (totalPurchasedDuration > 0) {
        const estimatedEnd = new Date(startTime.getTime() + totalPurchasedDuration * 60 * 1000)
        estimatedEndTime = estimatedEnd.toISOString()
        
        const remainingMs = estimatedEnd.getTime() - currentTime.getTime()
        remainingMinutes = Math.floor(remainingMs / (1000 * 60))
        
        // Check if session is overtime
        if (remainingMs < 0) {
          isOvertime = true
          remainingMinutes = Math.abs(remainingMinutes) // Convert to positive for display
        }
      }

      // For timer mode, check if session is unusually long (over 12 hours)
      if (rentalSession.billingModel === 'timer' && actualDurationMinutes > 720) {
        isOvertime = true
      }

      return {
        sessionId: rentalSession.id,
        unitId: rentalSession.unit.id,
        unitName: rentalSession.unit.customerDisplayName || rentalSession.unit.name,
        billingModel: rentalSession.billingModel as 'timer' | 'hourly' | 'package',
        startTime: rentalSession.startTime.toISOString(),
        estimatedEndTime,
        remainingMinutes,
        totalAmount: parseFloat(rentalSession.totalAmount.toString()),
        isOvertime
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedSessions
    })

  } catch (error) {
    console.error('Error fetching active sessions:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch active sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}