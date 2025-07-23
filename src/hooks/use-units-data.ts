// src/hooks/use-units-data.ts
'use client'

import { useState, useCallback } from 'react'
import { usePolling } from './use-polling'

export interface Unit {
  id: string
  name: string
  consoleType: string
  controllerCount: number
  status: 'available' | 'occupied' | 'maintenance' | 'broken'
  hourlyRate: number
  remainingMinutes: number | null
  estimatedEndTime: string | null
  locationName: string
}

interface UseUnitsDataOptions {
  subdomain: string
  initialData: Unit[]
  pollingInterval?: number
  enabled?: boolean
}

export function useUnitsData({
  subdomain,
  initialData,
  pollingInterval = 30000, // 30 seconds
  enabled = true
}: UseUnitsDataOptions) {
  const [units, setUnits] = useState<Unit[]>(initialData)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  // Fetch units data
  const fetchUnits = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/${subdomain}/units`, {
        cache: 'no-cache'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setUnits(data.data.units)
        setError(null)
        setIsOnline(true)
      } else {
        throw new Error(data.error || 'Failed to fetch units')
      }
    } catch (err) {
      console.error('Error fetching units:', err)
      setError(err instanceof Error ? err.message : 'Network error')
      setIsOnline(false)
    }
  }, [subdomain])

  // Setup polling
  const { isPolling, lastUpdated, refresh } = usePolling(fetchUnits, {
    interval: pollingInterval,
    enabled,
    immediate: false // Don't run immediately since we have initial data
  })

  // Computed values for easy consumption
  const stats = {
    available: units.filter(u => u.status === 'available').length,
    occupied: units.filter(u => u.status === 'occupied').length,
    maintenance: units.filter(u => u.status === 'maintenance').length,
    total: units.length
  }

  const groupedUnits = {
    available: units.filter(u => u.status === 'available'),
    occupied: units.filter(u => u.status === 'occupied'),
    maintenance: units.filter(u => u.status === 'maintenance'),
    broken: units.filter(u => u.status === 'broken')
  }

  // Utility functions
  const formatRemainingTime = (minutes: number | null) => {
    if (minutes === null) return null
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m left`
    } else {
      return `${mins}m left`
    }
  }

  return {
    // Data
    units,
    stats,
    groupedUnits,
    
    // Status
    isPolling,
    isOnline,
    error,
    lastUpdated,
    
    // Actions
    refresh,
    
    // Utilities
    formatRemainingTime
  }
}