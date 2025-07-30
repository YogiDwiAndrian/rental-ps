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
  // DERIVED STATE - ORIGINAL ORDERING
  // ============================================
  
  // Reorder units: available → occupied → broken → maintenance (last)
  const availableUnits = realTimeUnits.filter(unit => unit.status === 'available')
  const occupiedUnits = realTimeUnits.filter(unit => unit.status === 'occupied')
  const brokenUnits = realTimeUnits.filter(unit => unit.status === 'broken')
  const maintenanceUnits = realTimeUnits.filter(unit => unit.status === 'maintenance')
  
  // Ordered units array
  const orderedUnits = [...availableUnits, ...occupiedUnits, ...brokenUnits, ...maintenanceUnits]
  
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
        // FIX: Call callback
        onRefresh?.()
      } else {
        toast.error(result.error || 'Failed to change unit status')
      }
    } catch (error) {
      console.error('Error changing unit status:', error)
      toast.error('Failed to change unit status')
    }
  }, [locationId, fetchUnitsStatus, onRefresh])

  // FIX: Enhanced dialog success handler
  const handleDialogSuccess = useCallback(async (): Promise<void> => {
    await fetchActiveSessions()
    await fetchUnitsStatus()
    
    // FIX: Call parent callback
    if (onRefresh) {
      await onRefresh()
    }
    
    setStartDialogOpen(false)
    setStopDialogOpen(false)
    setExtendDialogOpen(false)
    setSelectedUnit(undefined)
    setSelectedSession(undefined)
  }, [fetchActiveSessions, fetchUnitsStatus, onRefresh])

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

  const formatRemainingTime = useCallback((minutes?: number) => {
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

      {/* Units Grid - ORIGINAL LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orderedUnits.map((unit) => {
          const isAvailable = unit.status === 'available'
          const isOccupied = unit.status === 'occupied'
          const isMaintenance = unit.status === 'maintenance'
          const isBroken = unit.status === 'broken'
          const activeSession = getUnitActiveSession(unit.id)
          const billingInfo = activeSession ? getBillingModelInfo(activeSession.billingModel) : null

          return (
            <Card 
              key={unit.id} 
              className={cn(
                "transition-all duration-200",
                isAvailable && "border-green-200 bg-green-50",
                isOccupied && "border-blue-200 bg-blue-50",
                isMaintenance && "border-orange-200 bg-orange-50",
                isBroken && "border-red-200 bg-red-50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Gamepad className="w-4 h-4" />
                    <h3 className="font-semibold text-base">{unit.name}</h3>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs font-medium",
                      isAvailable && "bg-green-100 text-green-800 border-green-300",
                      isOccupied && "bg-blue-100 text-blue-800 border-blue-300",
                      isMaintenance && "bg-orange-100 text-orange-800 border-orange-300",
                      isBroken && "bg-red-100 text-red-800 border-red-300",
                      activeSession?.isOvertime && "bg-orange-500 text-white border-orange-600"
                    )}
                  >
                    {activeSession?.isOvertime ? 'OVERTIME' :
                     isAvailable ? 'Available' :
                     isOccupied ? 'Occupied' :
                     isMaintenance ? 'Maintenance' :
                     'Broken'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Session Info */}
                {activeSession && (
                  <div className="space-y-2">
                    {/* Billing Model Badge */}
                    {billingInfo && (
                      <div className="flex justify-center">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs font-medium", billingInfo.color)}
                        >
                          {billingInfo.icon}
                          <span className="ml-1">{billingInfo.label}</span>
                        </Badge>
                      </div>
                    )}
                    
                    {/* Time Info */}
                    <div className="text-center space-y-1">
                      {activeSession.billingModel !== 'timer' && activeSession.remainingMinutes !== undefined && (
                        <p className="text-sm font-medium text-gray-700">
                          {formatRemainingTime(activeSession.remainingMinutes)} remaining
                        </p>
                      )}
                      
                      {activeSession.billingModel === 'timer' && (
                        <p className="text-sm text-gray-600">
                          Started: {new Date(activeSession.startTime).toLocaleTimeString('id-ID', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Total: {formatCurrency(activeSession.totalAmount || 0)}
                      </p>
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

                      {/* Set Broken - Small button (if needed) */}
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

                  {/* Info for timer sessions */}
                  {activeSession?.billingModel === 'timer' && (
                    <div className="text-xs text-amber-600 text-center bg-amber-50 p-2 rounded border border-amber-200">
                      Timer mode - billing calculated when stopped
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {orderedUnits.length === 0 && (
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <Gamepad className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Gaming Units</h3>
            <p className="text-gray-500 mb-6">No units configured for this location.</p>
          </CardContent>
        </Card>
      )}

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