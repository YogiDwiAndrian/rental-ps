// src/app/dashboard/location/[locationId]/page.tsx - UPDATED WITH SESSION MANAGEMENT
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SessionManagement } from '@/components/staff/session-management'
import { 
  GamepadIcon,
  Users,
  Clock,
  DollarSign,
  Activity,
  Settings,
  BarChart3,
  MapPin,
  Wifi,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Target,
  Timer
} from 'lucide-react'
import { formatCurrency, decimalToNumber } from '@/lib/utils'
import { 
  calculateWorkSessionDuration, 
  formatWorkSessionDuration,
  calculateWorkSessionSummary,
  getPerformanceScoreColor,
  getPerformanceScoreLabel
} from '@/lib/work-session-utils'
import { WorkSession, WorkSessionStatus } from '@prisma/client'

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
  let shiftDuration: number | null = null
  let workSessionSummary = null

  if (currentWorkSession) {
    const duration = calculateWorkSessionDuration(currentWorkSession.startTime, new Date())
    shiftDuration = duration.totalMinutes
    
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
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      })() : []
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-900">
                  🎮 {location.name}
                </h1>
                <p className="text-sm text-gray-500">{location.tenant.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{session.user.name}</span>
                <span className="text-gray-400"> • </span>
                <span className="capitalize">{session.user.role}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reports
                </Button>
                
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                
                <a
                  href="/auth/signout"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Logout
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">{location.name}</span>
          </nav>
        </div>

        {/* Overview Cards - Updated with better responsiveness */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Units Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Units Status</CardTitle>
              <GamepadIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{availableUnits}/{totalUnits}</div>
              <p className="text-xs text-gray-600">available units</p>
              <div className="mt-2 flex gap-1">
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {occupancyRate.toFixed(0)}% occupied
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Timer className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{activeSessions}</div>
              <p className="text-xs text-gray-600">currently playing</p>
              <div className="mt-2 flex gap-1">
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Real-time tracking
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Today */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {currentWorkSession ? formatCurrency(currentWorkSession.totalRevenue) : formatCurrency(0)}
              </div>
              <p className="text-xs text-gray-600">total earnings</p>
              <div className="mt-2 flex gap-1">
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {currentWorkSession?.totalSessions || 0} sessions
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Staff & Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff & Status</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{activeStaff}</div>
              <p className="text-xs text-gray-600">staff on duty</p>
              <div className="mt-2 flex gap-1">
                <Badge variant="outline" className="text-xs">
                  {availableFnbItems.length} F&B items
                </Badge>
                {lowStockItems.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {lowStockItems.length} low stock
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== MAIN SESSION MANAGEMENT SECTION ===== */}
        <div className="space-y-6">
          <SessionManagement 
            locationId={locationId}
            units={unitsForSessionManagement}
          />
        </div>

        {/* Side Panel - Work Session & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Work Session Card - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Current Work Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentWorkSession ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Current Staff</span>
                      <Badge variant="default">
                        <Users className="w-3 h-3 mr-1" />
                        {currentWorkSession.user.name?.split(' ')[0] || 'Staff'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Session Started</span>
                      <span className="text-xs text-gray-900 font-medium">
                        {currentWorkSession.startTime.toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    {shiftDuration && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Duration</span>
                        <span className="text-xs text-gray-900 font-medium">
                          {formatWorkSessionDuration(calculateWorkSessionDuration(currentWorkSession.startTime, new Date()))}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Revenue Today</span>
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(currentWorkSession.totalRevenue)}
                      </span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sessions Handled</span>
                      <Badge variant="outline">
                        {currentWorkSession.totalSessions} today
                      </Badge>
                    </div>
                    
                    {workSessionSummary && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Performance</span>
                        <Badge className={`${getPerformanceScoreColor(workSessionSummary.performanceScore).bg} ${getPerformanceScoreColor(workSessionSummary.performanceScore).text} ${getPerformanceScoreColor(workSessionSummary.performanceScore).border}`}>
                          <Target className="w-3 h-3 mr-1" />
                          {getPerformanceScoreLabel(workSessionSummary.performanceScore)}
                        </Badge>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-center py-4">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No active work session</p>
                      <p className="text-xs text-gray-400 mt-1">Start your shift to begin tracking</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Session management active</span>
                  <span className="text-gray-500">Live</span>
                </div>
                <div className="flex justify-between">
                  <span>Real-time monitoring</span>
                  <span className="text-gray-500">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Units status sync</span>
                  <span className="text-gray-500">30s</span>
                </div>
                <div className="flex justify-between">
                  <span>Dashboard loaded</span>
                  <span className="text-gray-500">Now</span>
                </div>
              </div>
              
              <Separator />
              
              <Button variant="outline" size="sm" className="w-full">
                <BarChart3 className="w-3 h-3 mr-2" />
                View Full Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Location Info Footer */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{location.name}</p>
                  <p className="text-xs text-gray-500">{location.address || 'No address set'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {location.phone && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium">{location.phone}</p>
                  </div>
                )}
                {location.email && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium">{location.email}</p>
                  </div>
                )}
                
                <div className="flex items-center">
                  <Wifi className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm text-green-600">Online</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}