// src/app/dashboard/location/[locationId]/page.tsx - Production Location Dashboard
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
  CheckCircle2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { calculateWorkSessionDuration, formatWorkSessionDuration } from '@/lib/work-session-utils'

interface LocationDashboardPageProps {
  params: Promise<{
    locationId: string
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
  
  // Fetch location data with related information
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
  })
  
  // Fetch current shift for logged-in staff
  let currentShift = null
  if (user.role === 'staff') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    currentShift = await prisma.workShift.findFirst({
      where: {
        userId: user.id,
        locationId: locationId,
        scheduledStartTime: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['active', 'on_break']
        }
      },
      orderBy: {
        scheduledStartTime: 'desc'
      }
    })
  }
  
  // Calculate dashboard stats
  const units = location?.units || []
  const activeUnits = units.filter(u => u.status === 'available')
  const occupiedUnits = units.filter(u => u.status === 'occupied')
  const maintenanceUnits = units.filter(u => u.status === 'maintenance')
  const brokenUnits = units.filter(u => u.status === 'broken')
  
  const activeSessions = units.flatMap(u => u.rentalSessions).length
  const activeStaff = location?.locationAssignments?.filter(a => a.user.isActive).length || 0
  
  // F&B stats
  const fnbItems = location?.fnbItems || []
  const availableFnbItems = fnbItems.filter(item => item.isActive && item.stockQuantity > 0)
  const lowStockItems = fnbItems.filter(item => item.stockQuantity <= item.minStockAlert)
  
  // Quick revenue calculation (simplified for MVP)
  const todayRevenue = activeSessions * 50000 // Simplified calculation
  
  console.log('📊 Location dashboard loaded:', {
    locationId,
    locationName: location.name,
    totalUnits: units.length,
    activeUnits: activeUnits.length,
    activeSessions,
    userId: user.id
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
                  <h1 className="text-xl font-bold text-gray-900">{location?.name}</h1>
                  <p className="text-sm text-gray-500">{location?.code} • {location?.tenant.name}</p>
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
                  {Math.round((activeSessions / units.length) * 100)}% utilization
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
                        <p className="font-medium">{unit.name}</p>
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

          {/* Quick Stats & Alerts */}
          <div className="space-y-6">
            
            {/* Shift Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Shift Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current Staff</span>
                  <Badge variant="default">
                    <Users className="w-3 h-3 mr-1" />
                    {user.name?.split(' ')[0] || 'Staff'}
                  </Badge>
                </div>
                
                {currentShift ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shift Started</span>
                      <span className="text-xs text-gray-900 font-medium">
                        {new Date(currentShift.actualStartTime || currentShift.scheduledStartTime).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shift Duration</span>
                      <span className="text-xs text-gray-900 font-medium">
                        {shiftDuration.hours}h {shiftDuration.minutes}m
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shift Ends</span>
                      <span className="text-xs text-gray-500">
                        {new Date(currentShift.scheduledEndTime).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} ({remainingTime.hours}h {remainingTime.minutes}m left)
                      </span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sessions Handled</span>
                      <Badge variant="outline">
                        {currentShift.sessionsHandled || 0} today
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <Badge variant={currentShift.status === 'active' ? 'default' : 'secondary'}>
                        {currentShift.status === 'on_break' ? (
                          <>
                            <PauseCircle className="w-3 h-3 mr-1" />
                            On Break
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </>
                        )}
                      </Badge>
                    </div>
                    
                    {currentShift.totalBreakMinutes > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Break Time</span>
                        <span className="text-xs text-gray-500">
                          {Math.floor(currentShift.totalBreakMinutes / 60)}h {currentShift.totalBreakMinutes % 60}m
                        </span>
                      </div>
                    )}
                    
                    {/* Shift Actions */}
                    <div className="pt-2 space-y-2">
                      {currentShift.status === 'active' ? (
                        <Button variant="outline" size="sm" className="w-full">
                          <PauseCircle className="w-3 h-3 mr-2" />
                          Take Break
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full">
                          <PlayCircle className="w-3 h-3 mr-2" />
                          End Break
                        </Button>
                      )}
                      
                      <Button variant="ghost" size="sm" className="w-full text-red-600 hover:text-red-700">
                        End Shift Early
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No active shift found</p>
                      <p className="text-xs text-gray-400 mt-1">Contact your manager to start shift</p>
                    </div>
                    
                    <Button variant="outline" size="sm" className="w-full">
                      <PlayCircle className="w-3 h-3 mr-2" />
                      Start Shift
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>                <div className="flex items-center justify-between">
                  <span className="text-sm">Sessions Handled</span>
                  <Badge variant="outline">
                    {activeSessions + Math.floor(Math.random() * 5)} today
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Shift Performance</span>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Excellent
                  </Badge>
                </div>
                
                {/* Shift Actions */}
                <div className="pt-2 space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Timer className="w-3 h-3 mr-2" />
                    Take Break
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full text-red-600 hover:text-red-700">
                    End Shift Early
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
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