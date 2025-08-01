// src/components/staff/session-management.tsx - UPDATED to pass units to StopSessionDialog
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Gamepad, 
  Play, 
  StopCircle, 
  Clock, 
  AlertCircle, 
  Wrench,
  Timer,
  CreditCard,
  Package,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StartSessionDialog } from './start-session-dialog'
import { StopSessionDialog } from './stop-session-dialog'
import { ExtendSessionDialog } from './extend-session-dialog'
import { toast } from 'sonner'

// ============================================
// TYPES - UPDATED
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
  hourlyRate?: number  // OPTIONAL: May come from API response
}

interface SessionManagementProps {
  units: Unit[]
  locationId: string
  onRefresh?: () => void
}

// ============================================
// COMPONENT
// ============================================

export function SessionManagement({ units, locationId, onRefresh }: SessionManagementProps) {
  const [realTimeUnits, setRealTimeUnits] = useState<Unit[]>(units)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>(undefined)
  const [selectedSession, setSelectedSession] = useState<ActiveSession | undefined>(undefined)
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)

  // ============================================
  // DERIVED STATE
  // ============================================
  
  const availableUnits = realTimeUnits.filter(unit => unit.status === 'available')
  const occupiedUnits = realTimeUnits.filter(unit => unit.status === 'occupied')
  const maintenanceUnits = realTimeUnits.filter(unit => unit.status === 'maintenance')
  const brokenUnits = realTimeUnits.filter(unit => unit.status === 'broken')
  
  const overtimeSessions = activeSessions.filter(session => session.isOvertime)

  // ============================================
  // API FUNCTIONS
  // ============================================
  
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
          hourlyRate?: number  // ADDED: May come from API
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
          hourlyRate: session.hourlyRate  // ADDED: Include if present
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
        // Update local state immediately
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

  // ============================================
  // DIALOG HANDLERS
  // ============================================

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

  const handleDialogSuccess = (): void => {
    fetchActiveSessions()
    onRefresh?.()
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200'
      case 'occupied': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'broken': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getBillingModelInfo = (billingModel: 'timer' | 'hourly' | 'package') => {
    switch (billingModel) {
      case 'timer':
        return { icon: <Timer className="w-3 h-3" />, label: 'Timer', color: 'bg-blue-100 text-blue-800' }
      case 'hourly':
        return { icon: <Clock className="w-3 h-3" />, label: 'Hourly', color: 'bg-green-100 text-green-800' }
      case 'package':
        return { icon: <Package className="w-3 h-3" />, label: 'Package', color: 'bg-purple-100 text-purple-800' }
      default:
        return { icon: <CreditCard className="w-3 h-3" />, label: 'Unknown', color: 'bg-gray-100 text-gray-800' }
    }
  }

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    setRealTimeUnits(units)
  }, [units])

  useEffect(() => {
    if (locationId) {
      fetchActiveSessions()
      
      // Set up polling for active sessions
      const interval = setInterval(fetchActiveSessions, 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [locationId, fetchActiveSessions])

  // Update remaining minutes every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSessions(prev => 
        prev.map(session => {
          if (session.estimatedEndTime) {
            const now = new Date()
            const endTime = new Date(session.estimatedEndTime)
            const remainingMs = endTime.getTime() - now.getTime()
            const remainingMinutes = Math.max(0, Math.floor(remainingMs / (1000 * 60)))
            const isOvertime = remainingMs < 0

            return {
              ...session,
              remainingMinutes,
              isOvertime
            }
          }
          return session
        })
      )
    }, 60000) // 1 minute

    return () => clearInterval(interval)
  }, [])

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{availableUnits.length}</p>
              </div>
              <Gamepad className="w-8 h-8 text-green-600" />
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
              <Play className="w-8 h-8 text-blue-600" />
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
        {realTimeUnits.map((unit) => {
          const activeSession = activeSessions.find(session => session.unitId === unit.id)
          const isAvailable = unit.status === 'available'
          const isOccupied = unit.status === 'occupied'
          const billingInfo = activeSession ? getBillingModelInfo(activeSession.billingModel) : null

          return (
            <Card key={unit.id} className={cn(
              'transition-all duration-200',
              isAvailable && 'hover:shadow-md border-green-200',
              isOccupied && 'border-blue-200 bg-blue-50',
              unit.status === 'maintenance' && 'border-orange-200 bg-orange-50',
              unit.status === 'broken' && 'border-red-200 bg-red-50'
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Gamepad className="w-4 h-4" />
                    {unit.name}
                  </CardTitle>
                  <Badge variant="outline" className={getStatusColor(unit.status)}>
                    {unit.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {unit.consoleType} • {unit.controllerCount} controllers
                </div>
                <div className="text-sm font-medium text-gray-800">
                  {formatCurrency(unit.hourlyRate)}/hour
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Active Session Info */}
                {activeSession && (
                  <div className="bg-white rounded border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Session</span>
                      {billingInfo && (
                        <Badge variant="outline" className={billingInfo.color}>
                          {billingInfo.icon}
                          <span className="ml-1">{billingInfo.label}</span>
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-xs space-y-1">
                      <div>Started: {new Date(activeSession.startTime).toLocaleTimeString('id-ID')}</div>
                      {activeSession.remainingMinutes !== undefined && (
                        <div className={cn(
                          'font-medium',
                          activeSession.isOvertime ? 'text-red-600' : 'text-green-600'
                        )}>
                          {activeSession.isOvertime 
                            ? `+${formatDuration(Math.abs(activeSession.remainingMinutes))} overtime`
                            : `${formatDuration(activeSession.remainingMinutes)} remaining`
                          }
                        </div>
                      )}
                      {activeSession.totalAmount && activeSession.totalAmount > 0 && (
                        <div>Total: {formatCurrency(activeSession.totalAmount)}</div>
                      )}
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
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtendSession(activeSession)}
                        className="flex-1"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Extend
                      </Button>
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => handleStopSession(activeSession)}
                        className="flex-1"
                      >
                        <StopCircle className="w-4 h-4 mr-1" />
                        Stop
                      </Button>
                    </div>
                  )}

                  {/* Unit Status Controls */}
                  {(unit.status === 'maintenance' || unit.status === 'broken') && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleChangeUnitStatus(unit.id, 'available')}
                      className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Available
                    </Button>
                  )}

                  {isAvailable && (
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChangeUnitStatus(unit.id, 'maintenance')}
                        className="flex-1 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-50 h-7 px-2"
                      >
                        <Wrench className="w-3 h-3 mr-1" />
                        Maintenance
                      </Button>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChangeUnitStatus(unit.id, 'broken')}
                        className="flex-1 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-50 h-7 px-2"
                      >
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Broken
                      </Button>
                    </div>
                  )}
                </div>

                {/* Timer Session Info */}
                {activeSession?.billingModel === 'timer' && (
                  <div className="text-xs text-amber-600 text-center bg-amber-50 p-2 rounded border border-amber-200">
                    Timer mode - billing calculated when stopped
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialogs - UPDATED: Pass units to StopSessionDialog */}
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
        units={realTimeUnits}  // ADDED: Pass units for hourlyRate fallback
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
    </div>
  )
}