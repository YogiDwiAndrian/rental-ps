// src/app/dashboard/location/[locationId]/page.tsx - FIXED VERSION
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  GamepadIcon,
  Users,
  Clock,
  DollarSign,
  Activity,
  Settings,
  RefreshCw,
  Plus,
  BarChart3,
  MapPin,
  Wifi,
  WifiOff,
  Timer,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Coffee,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react'
import { formatCurrency, decimalToNumber } from '@/lib/utils'
import { 
  calculateWorkSessionDuration, 
  formatWorkSessionDuration,
  calculateWorkSessionSummary,
  getPerformanceScoreColor,
  getPerformanceScoreLabel,
  getShiftStatusMessage
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
    rentalSessions: Array<{
      id: string
      startTime: Date
      endTime: Date | null
      billingModel: string
      status: string
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
    category: {
      id: string
      name: string
    } | null
  }>
  locationAssignments: Array<{
    user: {
      id: string
      name: string | null
      email: string
      role: string
      isActive: boolean
    }
  }>
}

export default async function LocationDashboardPage({ params }: LocationDashboardPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }
  
  const { locationId } = await params
  const user = session.user
  
  // Verify user has access to this location
  if (user.role === 'staff') {
    const hasAccess = user.locations?.some(loc => loc.id === locationId)
    if (!hasAccess) {
      redirect('/dashboard/select-location')
    }
  }
  
  // Fetch location data with proper typing
  const location = await prisma.location.findUnique({
    where: { id: locationId },
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
        include: {
          category: true
        },
        where: {
          isActive: true
        }
      },
      locationAssignments: {
        where: {
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true
            }
          }
        }
      }
    }
  }) as LocationWithRelations | null

  if (!location) {
    redirect('/dashboard/select-location')
  }
  
  // Fetch current work session for logged-in staff with proper typing
  let currentWorkSession: EnhancedWorkSession | null = null
  if (user.role === 'staff') {
    currentWorkSession = await prisma.workSession.findFirst({
      where: {
        userId: user.id,
        locationId: locationId,
        status: 'active' as WorkSessionStatus
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
    }) as EnhancedWorkSession | null
  }
  
  // Calculate dashboard stats with proper type conversion
  const units = location.units || []
  const activeUnits = units.filter(u => u.status === 'available')
  const occupiedUnits = units.filter(u => u.status === 'occupied')
  const maintenanceUnits = units.filter(u => u.status === 'maintenance')
  const brokenUnits = units.filter(u => u.status === 'broken')
  
  const activeSessions = units.flatMap(u => u.rentalSessions).length
  const activeStaff = location.locationAssignments?.filter(a => a.user.isActive).length || 0
  
  // F&B stats with proper type conversion
  const fnbItems = location.fnbItems || []
  const availableFnbItems = fnbItems.filter(item => item.isActive && item.stockQuantity > 0)
  const lowStockItems = fnbItems.filter(item => item.stockQuantity <= item.minStockAlert)
  
  // Revenue calculation with proper type conversion
  const todayRevenue = activeSessions > 0 ? 
    units.flatMap(u => u.rentalSessions)
         .reduce((sum, session) => sum + decimalToNumber(session.totalAmount), 0) :
    0

  // Work session calculations
  const workSessionSummary = currentWorkSession ? 
    calculateWorkSessionSummary(
      currentWorkSession.startTime,
      currentWorkSession.endTime,
      currentWorkSession.totalRevenue,
      currentWorkSession.totalSessions
    ) : null

  const shiftDuration = currentWorkSession ? 
    calculateWorkSessionDuration(currentWorkSession.startTime, currentWorkSession.endTime) : 
    null

  const remainingTime = currentWorkSession ? 
    calculateWorkSessionDuration(currentWorkSession.startTime, null) : 
    null

  console.log('📊 Location dashboard loaded:', {
    locationId,
    locationName: location.name,
    totalUnits: units.length,
    activeUnits: activeUnits.length,
    activeSessions,
    userId: user.id,
    hasWorkSession: !!currentWorkSession
  })
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <GamepadIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{location.name}</h1>
                  <p className="text-sm text-gray-500">{location.code} • {location.tenant.name}</p>
                </div>
              </div>
              
              <Badge variant="outline" className="ml-4">
                <Activity className="w-3 h-3 mr-1" />
                Live Dashboard
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              
              <Button variant="outline" size="sm">
                <MapPin className="w-4 h-4 mr-2" />
                Switch Location
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Available Units */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Units</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeUnits.length}</div>
              <p className="text-xs text-gray-600">of {units.length} total units</p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {occupiedUnits.length} occupied
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Timer className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{activeSessions}</div>
              <p className="text-xs text-gray-600">sessions running</p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {Math.round((activeSessions / Math.max(units.length, 1)) * 100)}% utilization
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Today Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(todayRevenue)}
              </div>
              <p className="text-xs text-gray-600">estimated earnings</p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{activeSessions * 5}% vs yesterday
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Staff & F&B */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff & F&B</CardTitle>
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

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <PlayCircle className="w-6 h-6" />
                <span className="text-xs">Start Session</span>
              </Button>
              
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <PauseCircle className="w-6 h-6" />
                <span className="text-xs">Extend Time</span>
              </Button>
              
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <StopCircle className="w-6 h-6" />
                <span className="text-xs">End Session</span>
              </Button>
              
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <Coffee className="w-6 h-6" />
                <span className="text-xs">F&B Order</span>
              </Button>
              
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <BarChart3 className="w-6 h-6" />
                <span className="text-xs">Reports</span>
              </Button>
              
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <Settings className="w-6 h-6" />
                <span className="text-xs">Manage Units</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Units Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Units Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <GamepadIcon className="w-5 h-5 mr-2" />
                  Gaming Units
                </span>
                <Badge variant="outline">{units.length} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {units.map((unit) => {
                const activeSession = unit.rentalSessions[0]
                const isOnline = unit.status !== 'broken'
                
                return (
                  <div key={unit.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        unit.status === 'available' ? 'bg-green-500' :
                        unit.status === 'occupied' ? 'bg-orange-500' :
                        unit.status === 'maintenance' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                      
                      <div>
                        <p className="font-medium">{unit.customerDisplayName || unit.name}</p>
                        <p className="text-sm text-gray-500">{unit.consoleType}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {isOnline ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      )}
                      
                      <Badge variant={
                        unit.status === 'available' ? 'default' :
                        unit.status === 'occupied' ? 'secondary' :
                        unit.status === 'maintenance' ? 'outline' :
                        'destructive'
                      }>
                        {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                      </Badge>
                      
                      {unit.status === 'occupied' && activeSession && (
                        <Badge variant="outline" className="text-xs">
                          {Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 60000)}m
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Work Session Information */}
          <div className="space-y-6">
            
            {/* Current Work Session */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Work Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                          {formatWorkSessionDuration(shiftDuration)}
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
                    
                    {/* Session Actions */}
                    <div className="pt-2 space-y-2">
                      <Button variant="outline" size="sm" className="w-full">
                        <PauseCircle className="w-3 h-3 mr-2" />
                        Take Break
                      </Button>
                      
                      <Button variant="ghost" size="sm" className="w-full text-red-600 hover:text-red-700">
                        End Session
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center py-4">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No active work session</p>
                      <p className="text-xs text-gray-400 mt-1">Start your shift to begin tracking</p>
                    </div>
                    
                    <Button variant="outline" size="sm" className="w-full">
                      <PlayCircle className="w-3 h-3 mr-2" />
                      Start Work Session
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
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
                    <span>PS5 #1 session started</span>
                    <span className="text-gray-500">5m ago</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>F&B order completed</span>
                    <span className="text-gray-500">12m ago</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>PS4 #3 session extended</span>
                    <span className="text-gray-500">18m ago</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>System backup completed</span>
                    <span className="text-gray-500">1h ago</span>
                  </div>
                </div>
                
                <Separator />
                
                <Button variant="ghost" size="sm" className="w-full">
                  View All Activity
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: LocationDashboardPageProps) {
  const { locationId } = await params
  
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true, code: true }
  })
  
  return {
    title: `${location?.name || 'Location'} Dashboard - Gaming Center`,
    description: `Manage operations for ${location?.name || 'gaming center location'}`,
    robots: 'noindex, nofollow'
  }
}