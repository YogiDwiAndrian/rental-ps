'use client'

import { useState } from 'react'
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
  Coffee
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { 
  formatWorkSessionDuration,
  getPerformanceScoreColor,
  getPerformanceScoreLabel,
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

interface DashboardClientProps {
  locationId: string
  dashboardData: DashboardData
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DashboardClient({ locationId, dashboardData }: DashboardClientProps) {
  const [showCreateFnbDialog, setShowCreateFnbDialog] = useState(false)

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
  } = dashboardData

  const handleCreateFnbOrder = () => {
    console.log('Opening F&B Order Dialog') // Debug log
    setShowCreateFnbDialog(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* ===== LOCATION HEADER ===== */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
                  <p className="text-gray-600 text-sm">
                    {location.code} • {location.tenant.name}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Reports
              </Button>
            </div>
          </div>
        </div>

        {/* ===== DASHBOARD METRICS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Units */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Units</CardTitle>
              <GamepadIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeSessions}</div>
              <p className="text-xs text-gray-600">
                {availableUnits} available • {Math.round(occupancyRate)}% occupied
              </p>
              <div className="mt-2 flex gap-1">
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {totalUnits} total units
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Revenue (Current Session) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Session Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {currentWorkSession ? 
                  formatCurrency(currentWorkSession.totalRevenue) : formatCurrency(0)}
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
                  <Coffee className="w-3 h-3 mr-1" />
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

          {/* Work Session Duration */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Work Session</CardTitle>
              <Timer className="h-4 w-4 text-purple-600" />
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
          />
        </div>

        {/* ===== F&B MANAGEMENT SECTION ===== */}
        <div className="space-y-6">
          <FnbManagement 
            locationId={locationId}
            activeSessions={activeSessionsForFnb}
            onCreateOrder={handleCreateFnbOrder}
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
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{currentWorkSession.user.name || 'Staff Member'}</h3>
                        <p className="text-sm text-gray-600">{currentWorkSession.user.email}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <Activity className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Duration</p>
                        <p className="font-semibold">
                          {shiftDuration ? formatWorkSessionDuration(shiftDuration) : '0:00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Sessions</p>
                        <p className="font-semibold">{currentWorkSession.totalSessions}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Revenue</p>
                        <p className="font-semibold">{formatCurrency(currentWorkSession.totalRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Started</p>
                        <p className="font-semibold">
                          {new Date(currentWorkSession.startTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {workSessionSummary && (
                      <>
                        <Separator />
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Performance Summary</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-blue-700">Avg Revenue/Hour</p>
                              <p className="font-semibold text-blue-900">
                                {formatCurrency(workSessionSummary.averageRevenuePerHour)}/hr
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-700">Performance</p>
                              <p className="font-semibold text-blue-900">
                                {getPerformanceScoreLabel(workSessionSummary.performanceScore)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Timer className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <h3 className="font-medium mb-1">No Active Work Session</h3>
                    <p className="text-sm">Start your shift to begin tracking revenue and performance</p>
                  </div>
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
        onSuccess={() => {
          console.log('F&B Order created successfully')
          // Refresh the page or specific data
          window.location.reload()
        }}
      />
    </div>
  )
}