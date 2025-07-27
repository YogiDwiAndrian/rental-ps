// src/hooks/use-session-management.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { BillingType } from '@prisma/client'

// ============================================
// LOCAL TYPE DEFINITIONS (to avoid import issues)
// ============================================

export interface ActiveSession {
  id: string
  unitId: string
  unitName: string
  billingModel: BillingType
  startTime: Date
  estimatedEndTime?: Date
  remainingMinutes?: number
  totalAmount?: number
  isOvertime: boolean
}

export interface StartSessionRequest {
  unitId: string
  billingModel: 'timer' | 'hourly' | 'package'
  customerName?: string
  purchasedDuration?: number
  packageId?: string
  notes?: string
}

export interface StartSessionResponse {
  success: boolean
  data?: {
    sessionId: string
    unitName: string
    billingModel: BillingType
    startTime: string
    purchasedDuration?: number
    totalAmount?: number
    estimatedEndTime?: string
  }
  error?: string
  details?: unknown
}

export interface StopSessionRequest {
  paymentMethod?: 'cash' | 'card' | 'digital_wallet'
  notes?: string
  fnbAmount?: number
}

export interface StopSessionResponse {
  success: boolean
  data?: {
    sessionId: string
    unitName: string
    duration: string
    totalAmount: number
    paymentMethod: string
    receipt: {
      sessionId: string
      unitName: string
      startTime: string
      endTime: string
      duration: string
      billingModel: string
      totalAmount: number
      paymentMethod: string
    }
  }
  error?: string
  details?: unknown
}

export interface ExtendSessionRequest {
  additionalDuration: number
  paymentMethod?: 'cash' | 'card' | 'digital_wallet'
  notes?: string
}

export interface ExtendSessionResponse {
  success: boolean
  data?: {
    sessionId: string
    unitName: string
    originalEndTime: string
    newEndTime: string
    additionalAmount: number
    totalPaid: number
    extensionCount: number
  }
  error?: string
  details?: unknown
}

export interface SessionCalculation {
  durationMinutes: number
  durationFormatted: string
  totalAmount: number
  isOvertime: boolean
  overtimeMinutes?: number
}

export interface UseSessionManagementReturn {
  // State
  activeSessions: ActiveSession[]
  loading: boolean
  error: string | null
  
  // Actions
  startSession: (request: StartSessionRequest) => Promise<StartSessionResponse>
  stopSession: (sessionId: string, request: StopSessionRequest) => Promise<StopSessionResponse>
  extendSession: (sessionId: string, request: ExtendSessionRequest) => Promise<ExtendSessionResponse>
  refreshSessions: () => Promise<void>
  
  // Utils
  calculateSessionDuration: (startTime: Date, endTime?: Date) => SessionCalculation
  formatSessionDuration: (minutes: number) => string
  getSessionStatus: (session: ActiveSession) => 'normal' | 'overtime' | 'ending_soon'
}

// ============================================
// UTILITY FUNCTIONS (local implementations)
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function calculateSessionDuration(startTime: Date, endTime?: Date): SessionCalculation {
  const end = endTime || new Date()
  const durationMs = end.getTime() - startTime.getTime()
  const durationMinutes = Math.ceil(durationMs / (1000 * 60))
  
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  const durationFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  
  const isOvertime = durationMinutes > 720 // 12 hours
  const overtimeMinutes = isOvertime ? durationMinutes - 720 : undefined

  return {
    durationMinutes,
    durationFormatted,
    totalAmount: 0,
    isOvertime,
    overtimeMinutes
  }
}

function formatSessionDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${remainingMinutes}m`
}

function getSessionStatus(session: ActiveSession): 'normal' | 'overtime' | 'ending_soon' {
  if (!session.estimatedEndTime) {
    return 'normal'
  }

  if (session.isOvertime) {
    return 'overtime'
  }

  if (session.remainingMinutes && session.remainingMinutes <= 15) {
    return 'ending_soon'
  }

  return 'normal'
}

// ============================================
// API RESPONSE TYPES
// ============================================

interface ApiActiveSession {
  id: string
  unitId: string
  billingModel: string
  startTime: string
  purchasedDuration: number
  extendedDuration: number
  totalAmount: number
  unit?: {
    name: string
    customerDisplayName?: string
  }
  estimatedEndTime?: string
  remainingMinutes?: number
  isOvertime?: boolean
}

interface ApiActiveSessionsResponse {
  success: boolean
  data?: ApiActiveSession[]
  error?: string
}

// ============================================
// MAIN HOOK
// ============================================

export function useSessionManagement(locationId: string): UseSessionManagementReturn {
  const { data: session } = useSession()
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startSession = useCallback(async (request: StartSessionRequest): Promise<StartSessionResponse> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/rentals/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(request)
      })

      const result: StartSessionResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start session')
      }

      if (result.success && result.data) {
        toast.success(`Session started for ${result.data.unitName}`)
        
        const newSession: ActiveSession = {
          id: result.data.sessionId,
          unitId: request.unitId,
          unitName: result.data.unitName,
          billingModel: result.data.billingModel,
          startTime: new Date(result.data.startTime),
          estimatedEndTime: result.data.estimatedEndTime ? new Date(result.data.estimatedEndTime) : undefined,
          totalAmount: result.data.totalAmount,
          isOvertime: false
        }

        setActiveSessions(prev => [...prev, newSession])
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`Failed to start session: ${errorMessage}`)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }, [locationId])

  const stopSession = useCallback(async (
    sessionId: string, 
    request: StopSessionRequest
  ): Promise<StopSessionResponse> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/rentals/${sessionId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(request)
      })

      const result: StopSessionResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to stop session')
      }

      if (result.success && result.data) {
        toast.success(`Session stopped for ${result.data.unitName}. Total: ${formatCurrency(result.data.totalAmount)}`)
        
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId))
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`Failed to stop session: ${errorMessage}`)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }, [locationId])

  const extendSession = useCallback(async (
    sessionId: string, 
    request: ExtendSessionRequest
  ): Promise<ExtendSessionResponse> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/rentals/${sessionId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(request)
      })

      const result: ExtendSessionResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extend session')
      }

      if (result.success && result.data) {
        toast.success(`Session extended for ${result.data.unitName}. Additional: ${formatCurrency(result.data.additionalAmount)}`)
        
        setActiveSessions(prev => 
          prev.map(activeSession => 
            activeSession.id === sessionId 
              ? {
                  ...activeSession,
                  estimatedEndTime: new Date(result.data!.newEndTime),
                  totalAmount: result.data!.totalPaid
                }
              : activeSession
          )
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`Failed to extend session: ${errorMessage}`)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }, [locationId])

  const refreshSessions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/rentals/active?locationId=${locationId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch active sessions')
      }

      const data: ApiActiveSessionsResponse = await response.json()
      
      if (data.success && data.data) {
        const sessions: ActiveSession[] = data.data.map((apiSession: ApiActiveSession) => ({
          id: apiSession.id,
          unitId: apiSession.unitId,
          unitName: apiSession.unit?.customerDisplayName || apiSession.unit?.name || 'Unknown Unit',
          billingModel: apiSession.billingModel as BillingType,
          startTime: new Date(apiSession.startTime),
          estimatedEndTime: apiSession.estimatedEndTime ? new Date(apiSession.estimatedEndTime) : undefined,
          remainingMinutes: apiSession.remainingMinutes,
          totalAmount: typeof apiSession.totalAmount === 'number' ? apiSession.totalAmount : Number(apiSession.totalAmount),
          isOvertime: apiSession.isOvertime || false
        }))

        setActiveSessions(sessions)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching active sessions:', error)
    } finally {
      setLoading(false)
    }
  }, [locationId])

  // Auto-refresh effects
  useEffect(() => {
    if (locationId && session?.user) {
      refreshSessions()
    }
  }, [locationId, session?.user, refreshSessions])

  useEffect(() => {
    if (!locationId || !session?.user) return

    const interval = setInterval(() => {
      refreshSessions()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [locationId, session?.user, refreshSessions])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSessions(prev => 
        prev.map(activeSession => {
          if (activeSession.estimatedEndTime) {
            const now = new Date()
            const remainingMs = activeSession.estimatedEndTime.getTime() - now.getTime()
            const remainingMinutes = Math.max(0, Math.floor(remainingMs / (1000 * 60)))
            const isOvertime = remainingMs < 0

            return {
              ...activeSession,
              remainingMinutes,
              isOvertime
            }
          }
          return activeSession
        })
      )
    }, 60000) // 1 minute

    return () => clearInterval(interval)
  }, [])

  return {
    // State
    activeSessions,
    loading,
    error,
    
    // Actions
    startSession,
    stopSession,
    extendSession,
    refreshSessions,
    
    // Utils
    calculateSessionDuration,
    formatSessionDuration,
    getSessionStatus
  }
}

// ============================================
// UNITS STATUS HOOK
// ============================================

interface ApiUnit {
  id: string
  name: string
  status: string
  currentSession?: {
    sessionId: string
    remainingMinutes?: number
  }
}

interface ApiUnitsResponse {
  success: boolean
  data?: {
    units: ApiUnit[]
  }
  error?: string
}

interface UseUnitsStatusReturn {
  units: Array<{
    id: string
    name: string
    status: string
    currentSession?: {
      sessionId: string
      remainingMinutes?: number
    }
  }>
  loading: boolean
  refreshUnits: () => Promise<void>
}

export function useUnitsStatus(locationId: string): UseUnitsStatusReturn {
  const [units, setUnits] = useState<Array<{
    id: string
    name: string
    status: string
    currentSession?: {
      sessionId: string
      remainingMinutes?: number
    }
  }>>([])
  const [loading, setLoading] = useState(false)

  const refreshUnits = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/units?locationId=${locationId}`)
      const data: ApiUnitsResponse = await response.json()
      
      if (data.success && data.data) {
        setUnits(data.data.units)
      }
    } catch (error) {
      console.error('Error fetching units:', error)
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    if (locationId) {
      refreshUnits()
      
      const interval = setInterval(refreshUnits, 30000)
      return () => clearInterval(interval)
    }
  }, [locationId, refreshUnits])

  return {
    units,
    loading,
    refreshUnits
  }
}