// src/components/staff/session-management.tsx - ORIGINAL LAYOUT + MINIMAL FIXES
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
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StartSessionDialog } from './start-session-dialog'
import { StopSessionDialog } from './stop-session-dialog'
import { ExtendSessionDialog } from './extend-session-dialog'
import { toast } from 'sonner'

// ============================================
// TYPES - ORIGINAL
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
  units: Unit[]
  locationId: string
  onRefresh?: () => void  // FIX: Keep callback prop
}

// ============================================
// COMPONENT - ORIGINAL LAYOUT
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
  // DERIVED STATE - ORIGINAL
  // ============================================
  
  const availableUnits = realTimeUnits.filter(unit => unit.status === 'available')
  const occupiedUnits = realTimeUnits.filter(unit => unit.status === 'occupied')
  const maintenanceUnits = realTimeUnits.filter(unit => unit.status === 'maintenance')
  const brokenUnits = realTimeUnits.filter(unit => unit.status === 'broken')
  
  const overtimeSessions = activeSessions.filter(session => session.isOvertime)

  // ============================================
  // API FUNCTIONS - ORIGINAL
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
        }) => ({
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
        const updatedUnits = units.map(unit => {
          const apiUnit = result.data.units.find((u: { id: string; status: string }) => u.id === unit.id)
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
  // HANDLERS - ORIGINAL + FIX callbacks
  // ============================================
  
  const handleStartSession = useCallback((unit: Unit): void => {
    setSelectedUnit(unit)
    setStartDialogOpen(true)
  }, [])

  const handleStopSession = useCallback((unitId: string): void => {
    const session = activeSessions.find(s => s.unitId === unitId)
    if (session) {
      setSelectedSession(session)
      setStopDialogOpen(true)
    }
  }, [activeSessions])

  const handleExtendSession = useCallback((unitId: string): void => {
    const session = activeSessions.find(s => s.unitId === unitId)
    if (session) {
      if (session.billingModel === 'timer') {
        toast.error('Timer sessions cannot be extended. Stop session to calculate final bill.')
        return
      }
      setSelectedSession(session)
      setExtendDialogOpen(true)
    }
  }, [activeSessions])

  const handleChangeUnitStatus = useCallback(async (unitId: string, newStatus: 'maintenance' | 'available' | 'broken'): Promise<void> => {
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
        toast.success(`Unit status changed to ${newStatus}`)
        await fetchUnitsStatus()
        // FIX: Call callback immediately
        onRefresh?.()
      } else {
        toast.error(result.error || 'Failed to change unit status')
      }
    } catch (error) {
      console.error('Error changing unit status:', error)
      toast.error('Failed to change unit status')
    }
  }, [locationId, fetchUnitsStatus, onRefresh])

  // FIX: Immediate callback + parallel refresh
  const handleDialogSuccess = useCallback(async (): Promise<void> => {
    // FIX: Call parent callback IMMEDIATELY
    if (onRefresh) {
      onRefresh()
    }
    
    // Then do parallel refresh (don't wait)
    Promise.all([
      fetchActiveSessions(),
      fetchUnitsStatus()
    ]).catch(error => {
      console.error('Error during background refresh:', error)
    })
    
    // Close dialogs immediately
    setStartDialogOpen(false)
    setStopDialogOpen(false)
    setExtendDialogOpen(false)
    setSelectedUnit(undefined)
    setSelectedSession(undefined)
  }, [onRefresh, fetchActiveSessions, fetchUnitsStatus])

  // ============================================
  // EFFECTS - ORIGINAL
  // ============================================

  useEffect(() => {
    setRealTimeUnits(units)
  }, [units])

  useEffect(() => {
    fetchActiveSessions()
    fetchUnitsStatus()
  }, [fetchActiveSessions, fetchUnitsStatus])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActiveSessions()
      fetchUnitsStatus()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchActiveSessions, fetchUnitsStatus])

  // ============================================
  // UTILS - ORIGINAL
  // ============================================
  
  const getUnitActiveSession = useCallback((unitId: string): ActiveSession | undefined => {
    return activeSessions.find(session => session.unitId === unitId)
  }, [activeSessions])

  const getBillingModelInfo = useCallback((billingModel: 'timer' | 'hourly' | 'package') => {
    switch (billingModel) {
      case 'timer':
        return {
          icon: <Timer className="w-3 h-3" />,
          label: 'Timer',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        }
      case 'hourly':
        return {
          icon: <Clock className="w-3 h-3" />,
          label: 'Hourly',
          color: 'bg-green-100 text-green-800 border-green-200'
        }
      case 'package':
        return {
          icon: <Package className="w-3 h-3" />,
          label: 'Package',
          color: 'bg-purple-100 text-purple-800 border-purple-200'
        }
      default:
        return {
          icon: <CreditCard className="w-3 h-3" />,
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }
  }, [])

  const formatTimeRemaining = useCallback((minutes?: number) => {
    if (minutes === undefined) return 'Running...'
    
    if (minutes < 0) {
      const overtimeMinutes = Math.abs(minutes)
      const hours = Math.floor(overtimeMinutes / 60)
      const mins = overtimeMinutes % 60
      return `+${hours}:${mins.toString().padStart(2, '0')}`
    }
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}:${mins.toString().padStart(2, '0')}`
  }, [])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // ============================================
  // RENDER - ORIGINAL LAYOUT
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header Stats - ORIGINAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Gamepad className="w-5 h-5 mr-2" />
              Session Management
            </span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {activeSessions.length} Active
              </Badge>
              {overtimeSessions.length > 0 && (
                <Badge variant="destructive">
                  {overtimeSessions.length} Overtime
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Available */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{availableUnits.length}</p>
                <p className="text-sm text-gray-600">Available</p>
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Gamepad className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{occupiedUnits.length}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>

            {/* Overtime */}
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
                <Wrench className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{maintenanceUnits.length + brokenUnits.length}</p>
                <p className="text-sm text-gray-600">Issues</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Units Grid - ORIGINAL LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {realTimeUnits.map((unit) => {
          const activeSession = getUnitActiveSession(unit.id)
          const billingInfo = activeSession ? getBillingModelInfo(activeSession.billingModel) : null

          const isAvailable = unit.status === 'available'
          const isOccupied = unit.status === 'occupied'
          const isMaintenance = unit.status === 'maintenance'
          const isBroken = unit.status === 'broken'

          const cardBgColor = isAvailable 
            ? 'bg-green-50 border-green-200' 
            : isOccupied 
            ? 'bg-blue-50 border-blue-200'
            : isMaintenance 
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200'

          return (
            <Card key={unit.id} className={cn('transition-all duration-200 hover:shadow-md', cardBgColor)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Gamepad className="w-4 h-4 text-gray-600" />
                      <h3 className="font-medium text-gray-900">{unit.name}</h3>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{unit.consoleType}</p>
                  </div>
                  <Badge 
                    variant={isAvailable ? 'default' : isOccupied ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {unit.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Customer Display Name */}
                {unit.customerDisplayName && (
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <p className="text-xs text-gray-600">Customer:</p>
                    <p className="text-sm font-medium">{unit.customerDisplayName}</p>
                  </div>
                )}

                {/* Active Session Info */}
                {activeSession && (
                  <div className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={cn('text-xs', billingInfo?.color)}>
                        {billingInfo?.icon}
                        <span className="ml-1">{billingInfo?.label}</span>
                      </Badge>
                      {activeSession.isOvertime && (
                        <Badge variant="destructive" className="text-xs">
                          Overtime
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Started:</span>
                        <span>{new Date(activeSession.startTime).toLocaleTimeString()}</span>
                      </div>
                      
                      {activeSession.estimatedEndTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ends:</span>
                          <span>{new Date(activeSession.estimatedEndTime).toLocaleTimeString()}</span>
                        </div>
                      )}
                      
                      {activeSession.remainingMinutes !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time:</span>
                          <span className={cn(
                            'font-medium',
                            activeSession.isOvertime ? 'text-red-600' : 'text-blue-600'
                          )}>
                            {formatTimeRemaining(activeSession.remainingMinutes)}
                          </span>
                        </div>
                      )}
                      
                      {activeSession.totalAmount && (
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="text-gray-600 font-medium">Amount:</span>
                          <span className="font-semibold">
                            {formatCurrency(activeSession.totalAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rate Info for Available Units */}
                {isAvailable && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {formatCurrency(unit.hourlyRate)}/hour
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Main Action */}
                  {isAvailable && (
                    <Button 
                      onClick={() => handleStartSession(unit)}
                      size="sm" 
                      className="w-full"
                    >
                      <Play className="w-3 h-3 mr-2" />
                      Start Session
                    </Button>
                  )}

                  {isOccupied && activeSession && (
                    <div className="space-y-2">
                      <Button 
                        onClick={() => handleStopSession(unit.id)}
                        variant="destructive" 
                        size="sm" 
                        className="w-full"
                      >
                        <StopCircle className="w-3 h-3 mr-2" />
                        Stop Session
                      </Button>
                      
                      {/* Extend button - only for non-timer sessions */}
                      {activeSession.billingModel !== 'timer' && (
                        <Button 
                          onClick={() => handleExtendSession(unit.id)}
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                        >
                          <Clock className="w-3 h-3 mr-2" />
                          Extend Session
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Maintenance/Broken Recovery */}
                  {(isMaintenance || isBroken) && (
                    <Button 
                      onClick={() => handleChangeUnitStatus(unit.id, 'available')}
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                    >
                      Mark as Fixed
                    </Button>
                  )}

                  {/* Status Change Actions - Only show when not occupied or has timer session */}
                  {(isAvailable || (activeSession && activeSession.billingModel === 'timer')) && (
                    <div className="flex gap-2 mt-2">
                      {/* Set Maintenance - Small button */}
                      {(isAvailable || isBroken) && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChangeUnitStatus(unit.id, 'maintenance')}
                          className="flex-1 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-7 px-2"
                        >
                          <Wrench className="w-3 h-3 mr-1" />
                          Maintenance
                        </Button>
                      )}

                      {/* Set Broken - Small button */}
                      {isAvailable && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChangeUnitStatus(unit.id, 'broken')}
                          className="flex-1 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-50 h-7 px-2"
                        >
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Broken
                        </Button>
                      )}
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

      {/* Dialogs - FIX: Use enhanced callback */}
      <StartSessionDialog
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
        units={availableUnits}
        selectedUnit={selectedUnit}
        locationId={locationId}
        onSuccess={handleDialogSuccess}  // FIX: Enhanced callback
      />

      <StopSessionDialog
        open={stopDialogOpen}
        onOpenChange={setStopDialogOpen}
        session={selectedSession}
        locationId={locationId}
        onSuccess={handleDialogSuccess}  // FIX: Enhanced callback
      />

      <ExtendSessionDialog
        open={extendDialogOpen}
        onOpenChange={setExtendDialogOpen}
        session={selectedSession}
        locationId={locationId}
        hourlyRate={selectedSession ? realTimeUnits.find(u => u.id === selectedSession.unitId)?.hourlyRate || 25000 : 25000}
        onSuccess={handleDialogSuccess}  // FIX: Enhanced callback
      />
    </div>
  )
}