// src/app/dashboard/location/[locationId]/dashboard-client.tsx - FIXED
'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SessionManagement } from '@/components/staff/session-management'
import { FnbManagement } from '@/components/staff/fnb-management'
import { CreateFnbOrderDialog } from '@/components/staff/create-fnb-order-dialog'
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
  Timer,
  Coffee,
  AlertTriangle
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { 
  formatWorkSessionDuration,
  getPerformanceScoreColor,
  getPerformanceScoreLabel,
  WorkSessionDuration,
  WorkSessionSummary
} from '@/lib/work-session-utils'

// ============================================
// TYPES - FIXED
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

interface DashboardClientProps {
  dashboardData: DashboardData | null
  locationId: string
}

// ============================================
// COMPONENT - FIXED
// ============================================

export function DashboardClient({ dashboardData, locationId }: DashboardClientProps) {
  const [currentDashboardData, setCurrentDashboardData] = useState<DashboardData | null>(dashboardData || null)
  const [showCreateFnbDialog, setShowCreateFnbDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  // ============================================
  // DATA REFRESH FUNCTIONS - FIXED (hooks first)
  // ============================================

  const refreshDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/dashboard/locations/${locationId}`, {
        headers: {
          'X-Location-ID': locationId
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        setCurrentDashboardData(result.data)
      }
    } catch (error) {
      console.error('Error refreshing dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [locationId])

  // FIXED: Properly update activeSessionsForFnb state
  const refreshActiveSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/locations/${locationId}/active-sessions`, {
        headers: {
          'X-Location-ID': locationId
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch active sessions')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        // Transform API response to match FnB component expectations
        const activeSessions = result.data.map((session: {
          sessionId: string
          unitName: string
          unitId: string
          startTime: string
          customerName?: string
        }) => ({
          id: session.sessionId,
          unitName: session.unitName,
          customerName: session.customerName,
          startTime: session.startTime
        }))

        // FIXED: Actually update the state with null check
        setCurrentDashboardData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            activeSessionsForFnb: activeSessions,
            activeSessions: activeSessions.length
          }
        })
      }
    } catch (error) {
      console.error('Error refreshing active sessions:', error)
    }
  }, [locationId])

  // FIXED: Ensure proper refresh sequence
  const handleSessionChange = useCallback(async () => {
    // First refresh active sessions
    await refreshActiveSessions()
    // Then refresh full dashboard data
    await refreshDashboardData()
  }, [refreshActiveSessions, refreshDashboardData])

  const handleFnbOrderSuccess = useCallback(async () => {
    // Refresh both sessions and dashboard data
    await refreshActiveSessions()
    await refreshDashboardData()
    setShowCreateFnbDialog(false)
  }, [refreshActiveSessions, refreshDashboardData])

  const handleCreateFnbOrder = useCallback(() => {
    setShowCreateFnbDialog(true)
  }, [])

  // Early return AFTER all hooks
  if (!currentDashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Destructure dashboard data for easier access
  const {
    location,
    activeSessions,
    availableUnits,
    totalUnits,
    occupancyRate,
    availableFnbItems,
    lowStockItems,
    currentWorkSession,
    activeStaff,
    shiftDuration,
    workSessionSummary,
    unitsForSessionManagement,
    activeSessionsForFnb
  } = currentDashboardData

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* ===== LOCATION HEADER ===== */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
                  <p className="text-sm text-gray-600">{location.code}</p>
                </div>
              </div>
              
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </Badge>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {location.tenant.name}
                </p>
                <p className="text-xs text-gray-500">
                  {location.tenant.subdomain}.rentalps.com
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== QUICK STATS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Active Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <GamepadIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{activeSessions}</div>
              <p className="text-xs text-muted-foreground">
                {availableUnits} units available
              </p>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {occupancyRate.toFixed(1)}% occupied
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Today's Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {currentWorkSession ? formatCurrency(currentWorkSession.totalRevenue) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentWorkSession ? `${currentWorkSession.totalSessions} sessions` : '0 sessions'}
              </p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-800">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* F&B Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">F&B Inventory</CardTitle>
              <Coffee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {availableFnbItems.reduce((sum, item) => sum + item.stockQuantity, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Items in stock
              </p>
              <div className="mt-2">
                {lowStockItems.length > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {lowStockItems.length} low stock
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    All good
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Work Session */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Shift</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {currentWorkSession ? (
                <>
                  <div className="text-2xl font-bold text-purple-600">
                    {shiftDuration ? formatWorkSessionDuration(shiftDuration) : '0:00'}
                  </div>
                  <p className="text-xs text-gray-600">
                    {currentWorkSession.user.name || 'Staff Member'}
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-800">
                      <Activity className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-400">--:--</div>
                  <p className="text-xs text-gray-400">No active session</p>
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mt-1">Start your shift to begin tracking</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== MAIN SESSION MANAGEMENT SECTION ===== */}
        <div className="space-y-6">
          <SessionManagement 
            locationId={locationId}
            units={unitsForSessionManagement}
            onRefresh={handleSessionChange}  // FIXED: Proper callback
          />
        </div>

        {/* ===== F&B MANAGEMENT SECTION ===== */}
        <div className="space-y-6">
          <FnbManagement 
            locationId={locationId}
            activeSessions={activeSessionsForFnb}
            onCreateOrder={handleCreateFnbOrder}
            onRefresh={refreshDashboardData}
            refreshSessions={refreshActiveSessions}  // FIXED: Pass refresh function
          />
        </div>

        {/* ===== SIDE PANEL - WORK SESSION & ACTIVITY ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Started by</p>
                        <p className="font-medium">{currentWorkSession.user.name || 'Staff Member'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-medium text-purple-600">
                          {shiftDuration ? formatWorkSessionDuration(shiftDuration) : '0:00'}
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Sessions Today</p>
                        <p className="text-lg font-semibold">{currentWorkSession.totalSessions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Revenue Today</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatCurrency(currentWorkSession.totalRevenue)}
                        </p>
                      </div>
                    </div>

                    {workSessionSummary && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Performance Score</p>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                getPerformanceScoreColor(workSessionSummary.performanceScore).bg,
                                getPerformanceScoreColor(workSessionSummary.performanceScore).text,
                                getPerformanceScoreColor(workSessionSummary.performanceScore).border
                              )}
                            >
                              {getPerformanceScoreLabel(workSessionSummary.performanceScore)}
                            </Badge>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">No active work session</p>
                    <p className="text-sm text-gray-500">
                      Start your shift to begin tracking revenue and performance
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Activity className="w-4 h-4 mr-2" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Session management</span>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex justify-between">
                    <span>F&B operations online</span>
                    <span className="text-gray-500">Active</span>
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
        </div>

        {/* ===== DIALOGS ===== */}
        <CreateFnbOrderDialog
          open={showCreateFnbDialog}
          onOpenChange={setShowCreateFnbDialog}
          locationId={locationId}
          activeSessions={activeSessionsForFnb}
          refreshSessions={refreshActiveSessions}  // FIXED: Pass refresh function
          onSuccess={handleFnbOrderSuccess}  // FIXED: Proper callback
        />
      </div>
    </div>
  )
}