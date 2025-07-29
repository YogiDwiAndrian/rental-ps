// src/app/dashboard/location/[locationId]/page.tsx - SERVER COMPONENT
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatCurrency, decimalToNumber } from '@/lib/utils'
import { 
  calculateWorkSessionDuration, 
  formatWorkSessionDuration,
  calculateWorkSessionSummary,
  getPerformanceScoreColor,
  getPerformanceScoreLabel,
  WorkSessionDuration
} from '@/lib/work-session-utils'
import { WorkSession, WorkSessionStatus } from '@prisma/client'
import { DashboardClient } from './dashboard-client'

interface LocationDashboardPageProps {
  params: Promise<{
    locationId: string
  }>
}

// Enhanced types for better type safety
interface EnhancedWorkSession extends WorkSession {
  user: {
    id: string
    name: string | null
    email: string
  }
  location: {
    id: string
    name: string
    code: string
  }
}

interface LocationWithRelations {
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
  units: Array<{
    id: string
    name: string
    consoleType: string
    controllerCount: number
    status: string
    hourlyRate: import('@prisma/client/runtime/library').Decimal
    customerDisplayName: string | null
    packageRates?: unknown
    rentalSessions: Array<{
      id: string
      status: string
      startTime: Date
      endTime: Date | null
      billingModel: string
      totalAmount: import('@prisma/client/runtime/library').Decimal
    }>
  }>
  fnbItems: Array<{
    id: string
    name: string
    sellingPrice: import('@prisma/client/runtime/library').Decimal
    stockQuantity: number
    minStockAlert: number
    isActive: boolean
  }>
  workSessions: EnhancedWorkSession[]
}

export default async function LocationDashboardPage({ params }: LocationDashboardPageProps) {
  const resolvedParams = await params
  const { locationId } = resolvedParams

  // Get session and verify access
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Get location data with all relations
  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      ...(session.user.role !== 'super_admin' && {
        tenant: {
          users: {
            some: {
              id: session.user.id
            }
          }
        }
      })
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          subdomain: true
        }
      },
      units: {
        include: {
          rentalSessions: {
            where: {
              status: 'active'
            },
            orderBy: {
              startTime: 'desc'
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      },
      fnbItems: {
        where: {
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      },
      workSessions: {
        where: {
          status: 'active'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          location: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        }
      }
    }
  }) as LocationWithRelations | null

  if (!location) {
    redirect('/dashboard/select-location')
  }

  // Calculate dashboard metrics
  const activeSessions = location.units.filter(unit => 
    unit.rentalSessions.length > 0 && unit.rentalSessions[0].status === 'active'
  ).length

  const availableUnits = location.units.filter(unit => unit.status === 'available').length
  const totalUnits = location.units.length
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
  let workSessionSummary = null

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

  // Prepare dashboard data for client component
  const dashboardData = {
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

  return (
    <DashboardClient 
      locationId={locationId}
      dashboardData={dashboardData}
    />
  )
}