// src/components/staff/session-management.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  PlayCircle, 
  Clock, 
  Timer, 
  Gamepad,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  StopCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { StartSessionDialog } from './start-session-dialog'
import { StopSessionDialog } from './stop-session-dialog'
import { ExtendSessionDialog } from './extend-session-dialog'

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
}

interface SessionManagementProps {
  locationId: string
  units: Unit[]
  onRefresh?: () => void | Promise<void>
}

interface ApiActiveSession {
  sessionId: string
  unitId: string
  unitName: string
  billingModel: 'timer' | 'hourly' | 'package'
  startTime: string
  estimatedEndTime?: string
  remainingMinutes?: number
  totalAmount?: number
  isOvertime?: boolean
}

interface ApiUnit {
  id: string
  name: string
  status: string
  currentSession?: {
    sessionId: string
    remainingMinutes?: number
  }
}

// ============================================
// UTILS
// ============================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatSessionTime = (startTime: string): string => {
  const start = new Date(startTime)
  return start.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SessionManagement({ locationId, units, onRefresh }: SessionManagementProps) {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(false)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [realTimeUnits, setRealTimeUnits] = useState<Unit[]>(units)
  
  // Dialog states
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>()
  const [selectedSession, setSelectedSession] = useState<ActiveSession | undefined>()

  // ============================================
  // DERIVED STATE
  // ============================================
  const availableUnits = realTimeUnits.filter(unit => unit.status === 'available')
  const occupiedUnits = realTimeUnits.filter(unit => unit.status === 'occupied')
  const maintenanceUnits = realTimeUnits.filter(unit => unit.status === 'maintenance')
  const overtimeSessions = activeSessions.filter(session => session.isOvertime)

  // ============================================
  // API FUNCTIONS
  // ============================================
  const fetchActiveSessions = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/rentals/active?locationId=${locationId}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const sessions: ActiveSession[] = result.data.map((session: ApiActiveSession) => ({
          id: session.sessionId,
          unitId: session.unitId,
          unitName: session.unitName,
          billingModel: session.billingModel,
          startTime: session.startTime,
          estimatedEndTime: session.estimatedEndTime,
          remainingMinutes: session.remainingMinutes,
          totalAmount: session.totalAmount,
          isOvertime: session.isOvertime || false
        }))
        
        setActiveSessions(sessions)
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error)
    }
  }, [locationId])

  const fetchUnitsStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/units?locationId=${locationId}`)
      const result = await response.json()
      
      if (result.success && result.data?.units) {
        // Update units status based on API response
        const updatedUnits = units.map(unit => {
          const apiUnit = result.data.units.find((u: ApiUnit) => u.id === unit.id)
          if (apiUnit) {
            return {
              ...unit,
              status: apiUnit.status as 'available' | 'occupied' | 'maintenance' | 'broken'
            }
          }
          return unit
        })
        
        setRealTimeUnits(updatedUnits)
      }
    } catch (error) {
      console.error('Error fetching units status:', error)
    }
  }, [locationId, units])

  // ============================================
  // HANDLERS
  // ============================================
  const handleStartSession = useCallback((unit: Unit): void => {
    setSelectedUnit(unit)
    setStartDialogOpen(true)
  }, [])

  const handleExtendSession = useCallback((unitId: string): void => {
    const session = activeSessions.find(s => s.unitId === unitId)
    if (session) {
      if (session.billingModel === 'timer') {
        toast.error('Timer sessions cannot be extended. They are billed at the end.')
        return
      }
      setSelectedSession(session)
      setExtendDialogOpen(true)
    } else {
      toast.error('Session not found')
    }
  }, [activeSessions])

  const handleStopSession = useCallback((unitId: string): void => {
    const session = activeSessions.find(s => s.unitId === unitId)
    if (session) {
      setSelectedSession(session)
      setStopDialogOpen(true)
    } else {
      toast.error('Session not found')
    }
  }, [activeSessions])

  const handleRefresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      await Promise.all([
        fetchActiveSessions(),
        fetchUnitsStatus(),
        onRefresh?.()
      ])
      toast.success('Data refreshed')
    } catch (error) {
      toast.error('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }, [fetchActiveSessions, fetchUnitsStatus, onRefresh])

  const handleDialogSuccess = useCallback(async (): Promise<void> => {
    await handleRefresh()
  }, [handleRefresh])

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getUnitActiveSession = (unitId: string): ActiveSession | undefined => {
    return activeSessions.find(session => session.unitId === unitId)
  }

  const getUnitHourlyRate = (unitId: string): number => {
    const unit = realTimeUnits.find(u => u.id === unitId)
    return unit?.hourlyRate || 25000
  }

  // ============================================
  // EFFECTS
  // ============================================
  
  // Sync real-time units with prop units when props change
  useEffect(() => {
    setRealTimeUnits(units)
  }, [units])

  // Initial load and periodic refresh
  useEffect(() => {
    fetchActiveSessions()
    fetchUnitsStatus()
    
    const interval = setInterval(() => {
      fetchActiveSessions()
      fetchUnitsStatus()
    }, 30000) // 30 seconds
    
    return () => clearInterval(interval)
  }, [fetchActiveSessions, fetchUnitsStatus])

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* Header & Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <PlayCircle className="w-5 h-5 mr-2" />
              Session Management
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button 
                onClick={() => setStartDialogOpen(true)}
                disabled={availableUnits.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Session
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Available Units */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{availableUnits.length}</p>
                <p className="text-sm text-gray-600">Available</p>
              </div>
            </div>
            
            {/* Active Sessions */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Timer className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{activeSessions.length}</p>
                <p className="text-sm text-gray-600">Active Sessions</p>
              </div>
            </div>
            
            {/* Overtime Sessions */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{overtimeSessions.length}</p>
                <p className="text-sm text-gray-600">Overtime</p>
              </div>
            </div>

            {/* Maintenance */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{maintenanceUnits.length}</p>
                <p className="text-sm text-gray-600">Maintenance</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {realTimeUnits.map((unit) => {
          const isAvailable = unit.status === 'available'
          const isOccupied = unit.status === 'occupied'
          const isMaintenance = unit.status === 'maintenance'
          const activeSession = getUnitActiveSession(unit.id)
          
          return (
            <Card 
              key={unit.id} 
              className={cn(
                "relative overflow-hidden transition-all duration-200",
                isAvailable && "border-green-200 hover:border-green-300",
                isOccupied && "border-blue-200 bg-blue-50",
                isMaintenance && "border-orange-200 bg-orange-50",
                activeSession?.isOvertime && "border-red-200 bg-red-50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Gamepad className="w-5 h-5 mr-2" />
                    {unit.customerDisplayName || unit.name}
                  </CardTitle>
                  <Badge 
                    variant={
                      isAvailable ? 'default' : 
                      isOccupied ? 'secondary' : 
                      'destructive'
                    }
                    className={cn(
                      isAvailable && "bg-green-100 text-green-800 border-green-200",
                      isOccupied && !activeSession?.isOvertime && "bg-blue-100 text-blue-800 border-blue-200",
                      activeSession?.isOvertime && "bg-red-100 text-red-800 border-red-200"
                    )}
                  >
                    {activeSession?.isOvertime ? 'Overtime' : unit.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {unit.consoleType} • {unit.controllerCount} Controllers
                </p>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Unit Info */}
                <div className="flex items-center justify-between text-sm">
                  <span>Hourly Rate:</span>
                  <span className="font-medium">{formatCurrency(unit.hourlyRate)}</span>
                </div>

                {/* Active Session Info */}
                {activeSession && (
                  <div className={cn(
                    "p-3 rounded-lg space-y-2",
                    activeSession.isOvertime ? "bg-red-50" : "bg-blue-50"
                  )}>
                    <div className="flex items-center justify-between text-sm">
                      <span>Billing Method:</span>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        activeSession.billingModel === 'timer' && "bg-yellow-100 text-yellow-800 border-yellow-200",
                        activeSession.billingModel === 'hourly' && "bg-blue-100 text-blue-800 border-blue-200",
                        activeSession.billingModel === 'package' && "bg-purple-100 text-purple-800 border-purple-200"
                      )}>
                        {activeSession.billingModel === 'timer' && '⏱️ Timer (Pay Later)'}
                        {activeSession.billingModel === 'hourly' && '🕐 Hourly (Pre-paid)'}
                        {activeSession.billingModel === 'package' && '📦 Package Deal'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>Started:</span>
                      <span className="font-medium">{formatSessionTime(activeSession.startTime)}</span>
                    </div>

                    {activeSession.remainingMinutes !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Time Status:</span>
                        <span className={cn(
                          "font-medium",
                          activeSession.isOvertime ? "text-red-600" : "text-blue-600"
                        )}>
                          {activeSession.isOvertime 
                            ? `+${Math.abs(activeSession.remainingMinutes)}m overtime`
                            : `${activeSession.remainingMinutes}m remaining`
                          }
                        </span>
                      </div>
                    )}

                    {activeSession.billingModel === 'timer' && (
                      <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-center">
                        <div className="text-xs text-yellow-700 font-medium">
                          💡 Pay Later - Bill calculated at end
                        </div>
                      </div>
                    )}

                    {activeSession.totalAmount && activeSession.totalAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Amount Paid:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(activeSession.totalAmount)}
                        </span>
                      </div>
                    )}

                    {activeSession.isOvertime && (
                      <div className="bg-red-50 border border-red-200 p-2 rounded text-center">
                        <div className="text-xs text-red-700 font-medium">
                          ⚠️ Overtime - Additional charges apply
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  {isAvailable && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleStartSession(unit)}
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Start Session
                    </Button>
                  )}
                  
                  {isOccupied && activeSession && (
                    <div className="space-y-2">
                      {/* Always show stop button for occupied units */}
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleStopSession(unit.id)}
                        className={cn(
                          "w-full",
                          activeSession.isOvertime 
                            ? "text-red-600 hover:text-red-700 border-red-200 bg-red-50" 
                            : "text-red-600 hover:text-red-700"
                        )}
                      >
                        <StopCircle className="w-3 h-3 mr-2" />
                        {activeSession.billingModel === 'timer' ? 'Stop & Calculate Bill' : 'Stop Session'}
                      </Button>

                      {/* Extend button only for hourly and package modes */}
                      {activeSession.billingModel !== 'timer' && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtendSession(unit.id)}
                          className="w-full"
                        >
                          <Clock className="w-3 h-3 mr-2" />
                          Extend Time
                        </Button>
                      )}

                      {/* Info for timer sessions */}
                      {activeSession.billingModel === 'timer' && (
                        <div className="text-xs text-yellow-600 text-center bg-yellow-50 p-2 rounded">
                          Timer mode - cannot extend, stop to calculate final bill
                        </div>
                      )}
                    </div>
                  )}

                  {isMaintenance && (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      <AlertCircle className="w-3 h-3 mr-2" />
                      Under Maintenance
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

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
        onSuccess={handleDialogSuccess}
      />

      <ExtendSessionDialog
        open={extendDialogOpen}
        onOpenChange={setExtendDialogOpen}
        session={selectedSession}
        locationId={locationId}
        hourlyRate={selectedSession ? getUnitHourlyRate(selectedSession.unitId) : 25000}
        onSuccess={handleDialogSuccess}
      />
    </div>
  )
}