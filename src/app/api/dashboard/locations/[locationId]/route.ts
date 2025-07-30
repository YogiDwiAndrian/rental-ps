// src/app/api/dashboard/locations/[locationId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { 
  calculateWorkSessionDuration,
  calculateWorkSessionSummary,
  WorkSessionDuration,
  WorkSessionSummary
} from '@/lib/work-session-utils'

// ============================================
// TYPES
// ============================================

interface DashboardData {
  location: {
    id: string
    name: string
    code: string
    address: string | null
    phone: string | null
    email: string | null
    tenant: {
      id: string
      name: string
      subdomain: string
    }
  }
  activeSessions: number
  availableUnits: number
  totalUnits: number
  occupancyRate: number
  availableFnbItems: Array<{ stockQuantity: number }>
  lowStockItems: Array<{ stockQuantity: number; minStockAlert: number }>
  currentWorkSession: {
    id: string
    startTime: Date
    totalRevenue: number
    totalSessions: number
    user: {
      id: string
      name: string | null
      email: string
    }
  } | null
  activeStaff: number
  shiftDuration: WorkSessionDuration | null
  workSessionSummary: WorkSessionSummary | null
  unitsForSessionManagement: Array<{
    id: string
    name: string
    consoleType: string
    controllerCount: number
    status: 'available' | 'occupied' | 'maintenance' | 'broken'
    hourlyRate: number
    customerDisplayName?: string
    packages?: Array<{
      id: string
      name: string
      durationMinutes: number
      price: number
      description?: string
    }>
  }>
  activeSessionsForFnb: Array<{
    id: string
    unitName: string
    customerName?: string
    startTime: string
  }>
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function decimalToNumber(decimal: Decimal): number {
  return parseFloat(decimal.toString())
}

// ============================================
// GET: FETCH DASHBOARD DATA
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

    // ===== FETCH LOCATION DATA =====
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        tenant: true,
        units: {
          include: {
            rentalSessions: {
              where: { status: 'active' },
              orderBy: { startTime: 'desc' },
              take: 1
            }
          }
        },
        fnbItems: {
          where: { isActive: true }
        },
        workSessions: {
          where: { 
            status: 'active',
            userId: session.user.id 
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { startTime: 'desc' },
          take: 1
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    // ===== CALCULATE METRICS =====

    // Unit metrics
    const totalUnits = location.units.length
    const activeSessions = location.units.filter(unit => 
      unit.rentalSessions.length > 0 && unit.rentalSessions[0].status === 'active'
    ).length
    const availableUnits = location.units.filter(unit => unit.status === 'available').length
    const occupancyRate = totalUnits > 0 ? (activeSessions / totalUnits) * 100 : 0

    // F&B metrics
    const availableFnbItems = location.fnbItems.filter(item => item.stockQuantity > 0)
    const lowStockItems = location.fnbItems.filter(item => 
      item.stockQuantity <= item.minStockAlert && item.stockQuantity > 0
    )

    // Work session data
    const currentWorkSession = location.workSessions[0] || null
    const activeStaff = location.workSessions.length

    // Calculate work session duration and summary
    let shiftDuration: WorkSessionDuration | null = null
    let workSessionSummary: WorkSessionSummary | null = null

    if (currentWorkSession) {
      shiftDuration = calculateWorkSessionDuration(currentWorkSession.startTime, new Date())
      
      workSessionSummary = calculateWorkSessionSummary(
        currentWorkSession.startTime,
        new Date(),
        currentWorkSession.totalRevenue,
        currentWorkSession.totalSessions
      )
    }

    // Convert units data for SessionManagement component
    const unitsForSessionManagement = location.units.map(unit => ({
      id: unit.id,
      name: unit.name,
      consoleType: unit.consoleType,
      controllerCount: unit.controllerCount,
      status: unit.status as 'available' | 'occupied' | 'maintenance' | 'broken',
      hourlyRate: decimalToNumber(unit.hourlyRate),
      customerDisplayName: unit.customerDisplayName || undefined,
      packages: unit.packageRates ? 
        (() => {
          try {
            const parsed = JSON.parse(unit.packageRates as string)
            return Array.isArray(parsed) ? 
              parsed.map((pkg: { id: string; name: string; durationMinutes: number; price: number; description?: string }) => ({
                id: pkg.id,
                name: pkg.name,
                durationMinutes: pkg.durationMinutes,
                price: pkg.price,
                description: pkg.description
              })) : []
          } catch {
            return []
          }
        })() : []
    }))

    // Convert active sessions for F&B component
    const activeSessionsForFnb = location.units
      .filter(unit => 
        unit.rentalSessions.length > 0 && 
        unit.rentalSessions[0].status === 'active'
      )
      .map(unit => {
        const session = unit.rentalSessions[0]
        return {
          id: session.id,
          unitName: unit.name,
          customerName: unit.customerDisplayName || undefined,
          startTime: session.startTime.toISOString()
        }
      })

    // ===== PREPARE DASHBOARD DATA =====
    const dashboardData: DashboardData = {
      location: {
        id: location.id,
        name: location.name,
        code: location.code,
        address: location.address,
        phone: location.phone,
        email: location.email,
        tenant: location.tenant
      },
      activeSessions,
      availableUnits,
      totalUnits,
      occupancyRate,
      availableFnbItems: availableFnbItems.map(item => ({
        stockQuantity: item.stockQuantity
      })),
      lowStockItems: lowStockItems.map(item => ({
        stockQuantity: item.stockQuantity,
        minStockAlert: item.minStockAlert
      })),
      currentWorkSession: currentWorkSession ? {
        id: currentWorkSession.id,
        startTime: currentWorkSession.startTime,
        totalRevenue: decimalToNumber(currentWorkSession.totalRevenue),
        totalSessions: currentWorkSession.totalSessions,
        user: currentWorkSession.user
      } : null,
      activeStaff,
      shiftDuration,
      workSessionSummary,
      unitsForSessionManagement,
      activeSessionsForFnb
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Dashboard API Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}