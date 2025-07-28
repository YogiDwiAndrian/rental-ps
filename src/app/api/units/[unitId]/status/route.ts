// src/app/api/units/[unitId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { UnitStatus } from '@prisma/client'

// ============================================
// VALIDATION SCHEMA
// ============================================

const updateStatusSchema = z.object({
  status: z.enum(['available', 'occupied', 'maintenance', 'broken'])
})

// ============================================
// TYPES
// ============================================

interface RouteParams {
  unitId: string
}

interface UpdateStatusResponse {
  success: boolean
  data?: {
    unitId: string
    unitName: string
    oldStatus: string
    newStatus: string
    updatedAt: string
  }
  error?: string
  details?: unknown
}

// ============================================
// PATCH - Update Unit Status
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
): Promise<NextResponse<UpdateStatusResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)

    const { unitId } = params

    // Get location ID from headers
    const locationId = request.headers.get('X-Location-ID')
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID header is required' },
        { status: 400 }
      )
    }

    // Get unit with location info
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        locationId: locationId,
        isActive: true
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            tenantId: true
          }
        }
      }
    })

    if (!unit) {
      return NextResponse.json(
        { success: false, error: 'Unit not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this location
    if (session.user.role !== 'super_admin') {
      // For owners, check tenant ownership
      if (session.user.role === 'owner') {
        if (session.user.tenantId !== unit.location.tenantId) {
          return NextResponse.json(
            { success: false, error: 'Access denied to this location' },
            { status: 403 }
          )
        }
      }
      
      // For staff, check location assignment
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
    }

    // Business logic validation
    const oldStatus = unit.status

    // Check if unit is currently occupied and has active session
    if (oldStatus === UnitStatus.occupied && status !== UnitStatus.occupied) {
      const activeSession = await prisma.rentalSession.findFirst({
        where: {
          unitId: unitId,
          status: 'active'
        }
      })

      if (activeSession) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot change status of unit with active session. Stop the session first.' 
          },
          { status: 400 }
        )
      }
    }

    // Don't allow setting to occupied unless there's a session starting
    if (status === UnitStatus.occupied && oldStatus !== UnitStatus.occupied) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Units can only be set to occupied by starting a rental session.' 
        },
        { status: 400 }
      )
    }

    // Update unit status
    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
      data: {
        status: status as UnitStatus,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        customerDisplayName: true,
        status: true,
        updatedAt: true
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: unit.location.tenantId,
        userId: session.user.id,
        eventType: 'UNIT_STATUS_CHANGED',
        metadata: {
          unitId: unitId,
          unitName: updatedUnit.customerDisplayName || updatedUnit.name,
          oldStatus: oldStatus,
          newStatus: status,
          locationId: locationId,
          locationName: unit.location.name,
          description: `Unit status changed from ${oldStatus} to ${status}`
        },
        severity: 'MEDIUM',
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        unitId: updatedUnit.id,
        unitName: updatedUnit.customerDisplayName || updatedUnit.name,
        oldStatus: oldStatus,
        newStatus: status,
        updatedAt: updatedUnit.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error updating unit status:', error)

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

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update unit status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ============================================
// GET - Get Unit Status (for verification)
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { unitId } = params

    // Get location ID from query params
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // Get unit with current status
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        locationId: locationId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        customerDisplayName: true,
        status: true,
        updatedAt: true,
        location: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!unit) {
      return NextResponse.json(
        { success: false, error: 'Unit not found' },
        { status: 404 }
      )
    }

    // Check for active session if unit is occupied
    let activeSession = null
    if (unit.status === UnitStatus.occupied) {
      activeSession = await prisma.rentalSession.findFirst({
        where: {
          unitId: unitId,
          status: 'active'
        },
        select: {
          id: true,
          startTime: true,
          billingModel: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        unitId: unit.id,
        unitName: unit.customerDisplayName || unit.name,
        status: unit.status,
        lastUpdated: unit.updatedAt.toISOString(),
        location: unit.location,
        activeSession: activeSession
      }
    })

  } catch (error) {
    console.error('Error fetching unit status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch unit status' 
      },
      { status: 500 }
    )
  }
}