'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Square, 
  Clock, 
  Wrench, 
  AlertCircle,
  RefreshCw,
  Activity,
  History,
  Coffee
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Import dialogs
import { StartSessionDialog } from './start-session-dialog'
import { StopSessionDialog } from './stop-session-dialog' 
import { ExtendSessionDialog } from './extend-session-dialog'

// Import Session History component
import { SessionHistory } from './session-history'

// ============================================
// TYPES
// ============================================

interface Unit {
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
}

interface ActiveSession {
  id: string
  unitId: string
  unitName: string
  billingModel: 'timer' | 'hourly' | 'package'
  startTime: string
  estimatedEndTime?: string
  remainingMinutes?: number
  totalAmount?: number
  isOvertime: boolean
  hourlyRate?: number
}

interface SessionManagementProps {
  units: Unit[]
  locationId: string
  onRefresh?: () => void
}

export function SessionManagement({ units, locationId, onRefresh }: SessionManagementProps) {
  // ===== STATE =====
  const [realTimeUnits, setRealTimeUnits] = useState<Unit[]>(units)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>(undefined)
  const [selectedSession, setSelectedSession] = useState<ActiveSession | undefined>(undefined)
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [fnbOrderDialogOpen, setFnbOrderDialogOpen] = useState(false)
  const [selectedSessionForFnb, setSelectedSessionForFnb] = useState<string | undefined>(undefined)
  const [activeTab, setActiveTab] = useState('active-sessions')

  // ===== DERIVED STATE =====
  const availableUnits = realTimeUnits.filter(unit => unit.status === 'available')
  const occupiedUnits = realTimeUnits.filter(unit => unit.status === 'occupied')
  const maintenanceUnits = realTimeUnits.filter(unit => unit.status === 'maintenance')
  const brokenUnits = realTimeUnits.filter(unit => unit.status === 'broken')
  const overtimeSessions = activeSessions.filter(session => session.isOvertime)

  // ===== UTILITY FUNCTIONS =====
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(Math.abs(minutes) / 60)
    const mins = Math.abs(minutes) % 60
    const sign = minutes < 0 ? '-' : ''
    return hours > 0 ? `${sign}${hours}h ${mins}m` : `${sign}${mins}m`
  }

  const calculateRunningDuration = (startTime: string): number => {
    const start = new Date(startTime)
    const now = new Date()
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60))
  }

  const formatRunningDuration = (startTime: string): string => {
    const minutes = calculateRunningDuration(startTime)
    return formatDuration(minutes)
  }

  // ===== API FUNCTIONS =====
  const fetchActiveSessions = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/rentals/active?locationId=${locationId}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const sessions: ActiveSession[] = result.data.map((session: {
          sessionId: string
          unitId: string
          unitName: string
          billingModel: 'timer' | 'hourly' | 'package'
          startTime: string
          estimatedEndTime?: string
          remainingMinutes?: number
          totalAmount?: number
          isOvertime?: boolean
          hourlyRate?: number
        }) => ({
          id: session.sessionId,
          unitId: session.unitId,
          unitName: session.unitName,
          billingModel: session.billingModel,
          startTime: session.startTime,
          estimatedEndTime: session.estimatedEndTime,
          remainingMinutes: session.remainingMinutes,
          totalAmount: session.totalAmount,
          isOvertime: session.isOvertime || false,
          hourlyRate: session.hourlyRate
        }))
        
        setActiveSessions(sessions)
        
        // Update unit statuses based on active sessions
        const updatedUnits = units.map(unit => {
          const hasActiveSession = sessions.some(session => session.unitId === unit.id)
          return {
            ...unit,
            status: hasActiveSession ? 'occupied' as const : unit.status
          }
        })
        setRealTimeUnits(updatedUnits)
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error)
      toast.error('Failed to fetch active sessions')
    }
  }, [locationId, units])

  const handleChangeUnitStatus = async (unitId: string, newStatus: 'available' | 'maintenance' | 'broken'): Promise<void> => {
    try {
      const response = await fetch(`/api/units/${unitId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify({ status: newStatus })
      })

      const result = await response.json()
      
      if (result.success) {
        setRealTimeUnits(prev => prev.map(unit => 
          unit.id === unitId ? { ...unit, status: newStatus } : unit
        ))
        
        toast.success(`Unit status updated to ${newStatus}`)
        onRefresh?.()
      } else {
        toast.error(result.error || 'Failed to update unit status')
      }
    } catch (error) {
      console.error('Error updating unit status:', error)
      toast.error('Failed to update unit status')
    }
  }

  // ===== DIALOG HANDLERS =====
  const handleStartSession = (unit: Unit): void => {
    setSelectedUnit(unit)
    setStartDialogOpen(true)
  }

  const handleStopSession = (session: ActiveSession): void => {
    setSelectedSession(session)
    setStopDialogOpen(true)
  }

  const handleExtendSession = (session: ActiveSession): void => {
    setSelectedSession(session)
    setExtendDialogOpen(true)
  }

  const handleViewFnbOrders = (sessionId: string): void => {
    setSelectedSessionForFnb(sessionId)
    setFnbOrderDialogOpen(true)
  }

  const handleDialogSuccess = (): void => {
    fetchActiveSessions()
    onRefresh?.()
  }

  // ===== EFFECTS =====
  useEffect(() => {
    setRealTimeUnits(units)
  }, [units])

  useEffect(() => {
    fetchActiveSessions()
    const interval = setInterval(fetchActiveSessions, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [fetchActiveSessions])

  // ===== REAL-TIME UPDATES FOR TIMER SESSIONS =====
  useEffect(() => {
    // Update running duration for timer sessions every 10 seconds for more responsive UI
    const timerInterval = setInterval(() => {
      setActiveSessions(prev => [...prev]) // Force re-render to update running duration display
    }, 10000) // 10 seconds for more responsive updates

    return () => clearInterval(timerInterval)
  }, [])

  // ===== RENDER HELPERS =====
  const renderUnitCard = (unit: Unit) => {
    const activeSession = activeSessions.find(session => session.unitId === unit.id)
    const isAvailable = unit.status === 'available'
    const isOccupied = unit.status === 'occupied'

    return (
      <Card key={unit.id} className={cn(
        "transition-all duration-200",
        isAvailable && "border-green-200 bg-green-50",
        isOccupied && "border-blue-200 bg-blue-50",
        unit.status === 'maintenance' && "border-orange-200 bg-orange-50",
        unit.status === 'broken' && "border-red-200 bg-red-50"
      )}>
        <CardContent className="p-4">
          {/* Unit Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg">{unit.name}</h3>
              <p className="text-sm text-gray-600">{unit.consoleType}</p>
              <p className="text-xs text-gray-500">{unit.controllerCount} controllers</p>
            </div>
            
            <div className="text-right">
              <Badge className={cn(
                "text-xs",
                isAvailable && "bg-green-100 text-green-800 border-green-200",
                isOccupied && "bg-blue-100 text-blue-800 border-blue-200",
                unit.status === 'maintenance' && "bg-orange-100 text-orange-800 border-orange-200",
                unit.status === 'broken' && "bg-red-100 text-red-800 border-red-200"
              )}>
                {unit.status === 'available' && 'Available'}
                {unit.status === 'occupied' && 'Occupied'}
                {unit.status === 'maintenance' && 'Maintenance'}
                {unit.status === 'broken' && 'Broken'}
              </Badge>
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(unit.hourlyRate)}/jam
              </div>
            </div>
          </div>

          {/* Session Info */}
          {isOccupied && activeSession && (
            <div className="bg-white rounded border p-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">{activeSession.billingModel.toUpperCase()}</div>
                  <div className="text-gray-600">
                    Started: {new Date(activeSession.startTime).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  
                  {/* Real-time duration for timer billing */}
                  {activeSession.billingModel === 'timer' && (
                    <div className="font-medium text-blue-600">
                      Berjalan: {formatRunningDuration(activeSession.startTime)}
                    </div>
                  )}
                  
                  {/* Remaining time for hourly/package billing */}
                  {activeSession.billingModel !== 'timer' && activeSession.remainingMinutes !== undefined && (
                    <div className={cn(
                      "font-medium",
                      activeSession.isOvertime ? 'text-red-600' : 'text-green-600'
                    )}>
                      {activeSession.isOvertime 
                        ? `+${formatDuration(Math.abs(activeSession.remainingMinutes))} overtime`
                        : `${formatDuration(activeSession.remainingMinutes)} remaining`
                      }
                    </div>
                  )}
                  
                  {/* Total amount - hide for timer billing since it's calculated at the end */}
                  {activeSession.billingModel !== 'timer' && activeSession.totalAmount && activeSession.totalAmount > 0 && (
                    <div>Total: {formatCurrency(activeSession.totalAmount)}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {isAvailable && (
              <Button 
                onClick={() => handleStartSession(unit)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            )}

            {isOccupied && activeSession && (
              <div className="flex gap-2">
                {/* Show Extend button only for non-timer billing */}
                {activeSession.billingModel !== 'timer' && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendSession(activeSession)}
                    className="flex-1"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Extend
                  </Button>
                )}
                
                {/* Stop button - full width for timer, half width for others */}
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => handleStopSession(activeSession)}
                  className={activeSession.billingModel === 'timer' ? 'w-full' : 'flex-1'}
                  disabled={
                    activeSession.billingModel === 'timer' && 
                    calculateRunningDuration(activeSession.startTime) < 1
                  }
                  title={
                    activeSession.billingModel === 'timer' && 
                    calculateRunningDuration(activeSession.startTime) < 1
                      ? 'Minimum 1 menit untuk stop session'
                      : undefined
                  }
                >
                  <Square className="w-4 h-4 mr-1" />
                  {activeSession.billingModel === 'timer' && 
                   calculateRunningDuration(activeSession.startTime) < 1
                    ? 'Wait...'
                    : 'Stop'
                  }
                </Button>
              </div>
            )}

            {/* Unit Status Actions */}
            {unit.status !== 'occupied' && (
              <div className="flex gap-1">
                {unit.status !== 'available' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangeUnitStatus(unit.id, 'available')}
                    className="flex-1 text-xs"
                  >
                    Set Available
                  </Button>
                )}
                {unit.status !== 'maintenance' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangeUnitStatus(unit.id, 'maintenance')}
                    className="flex-1 text-xs"
                  >
                    <Wrench className="w-3 h-3 mr-1" />
                    Maintenance
                  </Button>
                )}
                {unit.status !== 'broken' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangeUnitStatus(unit.id, 'broken')}
                    className="flex-1 text-xs"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Broken
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ===== MAIN RENDER =====
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Session Management
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchActiveSessions}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active-sessions" className="flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                Active Sessions
              </TabsTrigger>
              <TabsTrigger value="session-history" className="flex items-center">
                <History className="w-4 h-4 mr-2" />
                Session History
              </TabsTrigger>
            </TabsList>

            {/* Active Sessions Tab */}
            <TabsContent value="active-sessions" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Available</p>
                        <p className="text-2xl font-bold text-green-600">{availableUnits.length}</p>
                      </div>
                      <Play className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Occupied</p>
                        <p className="text-2xl font-bold text-blue-600">{occupiedUnits.length}</p>
                      </div>
                      <Square className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Maintenance</p>
                        <p className="text-2xl font-bold text-orange-600">{maintenanceUnits.length}</p>
                      </div>
                      <Wrench className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Broken</p>
                        <p className="text-2xl font-bold text-red-600">{brokenUnits.length}</p>
                      </div>
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overtime Alert */}
              {overtimeSessions.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Overtime Sessions ({overtimeSessions.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {overtimeSessions.map(session => (
                      <div key={session.id} className="text-sm text-red-700">
                        {session.unitName} - {formatDuration(Math.abs(session.remainingMinutes || 0))} overtime
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Units Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {realTimeUnits.map(unit => renderUnitCard(unit))}
              </div>
            </TabsContent>

            {/* Session History Tab */}
            <TabsContent value="session-history">
              <SessionHistory
                locationId={locationId}
                onRefresh={onRefresh}
                onViewFnbOrders={handleViewFnbOrders}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <StartSessionDialog
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
        units={availableUnits}
        selectedUnit={selectedUnit}
        locationId={locationId}
        onSuccess={handleDialogSuccess}
      />

      <StopSessionDialog
        open={stopDialogOpen}
        onOpenChange={setStopDialogOpen}
        session={selectedSession}
        locationId={locationId}
        units={realTimeUnits}
        onSuccess={handleDialogSuccess}
      />

      <ExtendSessionDialog
        open={extendDialogOpen}
        onOpenChange={setExtendDialogOpen}
        session={selectedSession}
        locationId={locationId}
        hourlyRate={selectedSession ? realTimeUnits.find(u => u.id === selectedSession.unitId)?.hourlyRate || 25000 : 25000}
        onSuccess={handleDialogSuccess}
      />

      {/* F&B Orders Dialog - placeholder for future implementation */}
      {fnbOrderDialogOpen && selectedSessionForFnb && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">F&B Orders</h3>
            <p className="text-gray-600 mb-4">
              F&B orders for session: {selectedSessionForFnb}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              This will show detailed F&B orders related to this session.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFnbOrderDialogOpen(false)
                  setSelectedSessionForFnb(undefined)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}