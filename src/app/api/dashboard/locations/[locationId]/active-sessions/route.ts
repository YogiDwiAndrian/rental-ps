// src/app/api/dashboard/locations/[locationId]/active-sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================
// TYPES
// ============================================

interface ActiveSession {
  sessionId: string
  unitId: string
  unitName: string
  startTime: string
  customerName?: string
}

interface ActiveSessionsResponse {
  success: boolean
  data: ActiveSession[]
  message: string
}

// ============================================
// GET: FETCH ACTIVE SESSIONS
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    // ===== AUTHENTICATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ===== AWAIT PARAMS =====
    const resolvedParams = await params
    const locationId = resolvedParams.locationId
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // ===== AUTHORIZATION =====
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        tenant: true,
        locationAssignments: {
          where: { isActive: true },
          select: { locationId: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check location access
    if (user.role === 'staff') {
      const hasAccess = user.locationAssignments.some(assignment => assignment.locationId === locationId)
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this location' },
          { status: 403 }
        )
      }
    } else if (user.role === 'owner') {
      // Check if user has tenantId
      if (!user.tenantId) {
        return NextResponse.json(
          { success: false, error: 'User has no tenant assigned' },
          { status: 403 }
        )
      }

      // Verify location belongs to user's tenant
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          tenantId: user.tenantId
        }
      })

      if (!location) {
        return NextResponse.json(
          { success: false, error: 'Location not found or access denied' },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // ===== FETCH ACTIVE SESSIONS =====
    const activeSessions = await prisma.rentalSession.findMany({
      where: {
        status: 'active',
        unit: {
          locationId: locationId
        }
      },
      include: {
        unit: {
          select: {
            id: true,
            name: true,
            customerDisplayName: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    // ===== FORMAT RESPONSE =====
    const formattedSessions: ActiveSession[] = activeSessions.map(session => ({
      sessionId: session.id,
      unitId: session.unit.id,
      unitName: session.unit.name,
      startTime: session.startTime.toISOString(),
      customerName: session.unit.customerDisplayName || undefined
    }))

    const response: ActiveSessionsResponse = {
      success: true,
      data: formattedSessions,
      message: `Found ${formattedSessions.length} active sessions`
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Get Active Sessions API Error:', error)

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