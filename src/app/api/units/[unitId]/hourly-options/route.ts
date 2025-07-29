// src/app/api/units/[unitId]/hourly-options/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================
// TYPES
// ============================================

interface RouteParams {
  unitId: string
}

interface HourlyOption {
  id: string
  duration: number
  price: number
  label: string
  description?: string
  isPopular?: boolean
  displayOrder: number
  isActive: boolean
}

interface HourlyOptionsResponse {
  success: boolean
  data?: {
    hourlyOptions: HourlyOption[]
    unitId: string
    unitName: string
  }
  error?: string
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function validateHourlyOptionsArray(hourlyOptions: unknown): hourlyOptions is HourlyOption[] {
  if (!Array.isArray(hourlyOptions)) return false
  
  return hourlyOptions.every((option: unknown) => 
    typeof option === 'object' &&
    option !== null &&
    typeof (option as HourlyOption).id === 'string' &&
    typeof (option as HourlyOption).duration === 'number' &&
    typeof (option as HourlyOption).price === 'number' &&
    typeof (option as HourlyOption).label === 'string' &&
    typeof (option as HourlyOption).displayOrder === 'number' &&
    typeof (option as HourlyOption).isActive === 'boolean'
  )
}

function jsonToHourlyOptions(jsonData: unknown): HourlyOption[] {
  if (!validateHourlyOptionsArray(jsonData)) {
    return []
  }
  return jsonData as HourlyOption[]
}

// ============================================
// GET - Fetch hourly options for a unit
// ============================================

export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
): Promise<NextResponse<HourlyOptionsResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || !['owner', 'staff'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 401 }
      )
    }

    // Await params to resolve the Promise
    const { unitId } = await context.params

    // Get unit with hourly options
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        customerDisplayName: true,
        hourlyOptions: true,
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

    // Verify access to unit's location
    if (session.user.role === 'staff') {
      const hasAccess = await prisma.locationAssignment.findFirst({
        where: {
          userId: session.user.id,
          locationId: unit.location.id,
          isActive: true
        }
      })

      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this location' },
          { status: 403 }
        )
      }
    } else if (session.user.role === 'owner') {
      // Verify owner owns this tenant
      if (session.user.tenantId !== unit.location.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this unit' },
          { status: 403 }
        )
      }
    }

    // Parse and validate hourly options
    const hourlyOptions = jsonToHourlyOptions(unit.hourlyOptions)

    // If no hourly options, return empty array (dialog will handle fallback)
    return NextResponse.json({
      success: true,
      data: {
        hourlyOptions: hourlyOptions
          .filter((option: HourlyOption) => option.isActive)
          .sort((a: HourlyOption, b: HourlyOption) => a.displayOrder - b.displayOrder),
        unitId: unit.id,
        unitName: unit.customerDisplayName || unit.name
      }
    })

  } catch (error) {
    console.error('Error fetching hourly options:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}