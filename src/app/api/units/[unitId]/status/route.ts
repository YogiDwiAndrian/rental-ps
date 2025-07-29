// src/app/api/units/[unitId]/status/route.ts - FIXED VERSION
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
  context: { params: Promise<RouteParams> }
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

    // Await params to resolve the Promise - FIXED FOR NEXTJS 15
    const { unitId } = await context.params

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
            tenantId: true,
            tenant: true
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

    // Verify user has access to this location - FIXED OWNER PERMISSION
    if (session.user.role !== 'super_admin') {
      if (session.user.role === 'owner') {
        // Owner can access any location in their tenant
        if (session.user.tenantId !== unit.location.tenantId) {
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
            error: 'Cannot change status of unit with active session. Please stop the session first.' 
          },
          { status: 400 }
        )
      }
    }

    // Prevent changing from available to occupied (use start session instead)
    if (oldStatus === UnitStatus.available && status === UnitStatus.occupied) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Use start session API to change unit from available to occupied' 
        },
        { status: 400 }
      )
    }

    // Update unit status
    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
      data: { 
        status: status as UnitStatus,
        customerDisplayName: status === UnitStatus.available ? null : unit.customerDisplayName
      }
    })

    console.log('✅ Unit status updated:', {
      unitId,
      unitName: unit.customerDisplayName || unit.name,
      oldStatus,
      newStatus: status
    })

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        unitId: updatedUnit.id,
        unitName: unit.customerDisplayName || unit.name,
        oldStatus: oldStatus,
        newStatus: status,
        updatedAt: updatedUnit.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error updating unit status:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid status value',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    // Handle Prisma errors
    if (error instanceof Error && error.message.includes('Prisma')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database operation failed',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Handle other errors
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