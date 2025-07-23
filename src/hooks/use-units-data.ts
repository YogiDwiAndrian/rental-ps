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
  remainingMinutes?: number
  customerDisplayName?: string
  specifications: Record<string, unknown>
}

export function useUnitsData(subdomain: string) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/public/${subdomain}/units`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Handle the actual API response structure
      if (data.success && data.data && data.data.units) {
        setUnits(data.data.units)
      } else {
        setUnits([])
        console.warn('Unexpected API response structure:', data)
      }
    } catch (err) {
      console.error('Failed to fetch units:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch units')
    } finally {
      setLoading(false)
    }
  }, [subdomain])

  // Use existing polling hook with correct interface
  const { lastUpdated, refresh } = usePolling(fetchUnits, { interval: 30000 })

  // Manual refresh function (use the one from usePolling)
  // const refresh = useCallback(() => {
  //   fetchUnits()
  // }, [fetchUnits])

  // Computed values for mobile stats
  const stats = {
    total: units.length,
    available: units.filter(u => u.status === 'available').length,
    occupied: units.filter(u => u.status === 'occupied').length,
    maintenance: units.filter(u => u.status === 'maintenance').length,
    broken: units.filter(u => u.status === 'broken').length
  }

  // Grouped units for mobile display
  const groupedUnits = {
    available: units.filter(u => u.status === 'available'),
    occupied: units.filter(u => u.status === 'occupied'),
    maintenance: units.filter(u => u.status === 'maintenance'),
    broken: units.filter(u => u.status === 'broken')
  }

  return {
    units,
    loading,
    error,
    lastUpdated,
    refresh,
    stats,
    groupedUnits
  }
}