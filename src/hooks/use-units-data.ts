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
  specifications: {
    packageRates?: Record<string, number>
    games?: string[]
    storage?: string
    resolution?: string
    [key: string]: any
  }
  locationName?: string
}

interface ApiUnitsResponse {
  success: boolean
  data: {
    units: Array<{
      id: string
      name: string
      consoleType: string
      controllerCount: number
      status: string
      hourlyRate: number
      remainingMinutes?: number
      customerDisplayName?: string
      locationName?: string
      // Add specifications from API
      specifications?: any
      packageRates?: any
    }>
    lastUpdated: string
    tenant: {
      name: string
      subdomain: string
    }
  }
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
      
      const data: ApiUnitsResponse = await response.json()
      
      // Handle the actual API response structure
      if (data.success && data.data && data.data.units) {
        // Transform API units to our Unit interface
        const transformedUnits: Unit[] = data.data.units.map(apiUnit => ({
          id: apiUnit.id,
          name: apiUnit.customerDisplayName || apiUnit.name,
          consoleType: apiUnit.consoleType,
          controllerCount: apiUnit.controllerCount,
          status: apiUnit.status as Unit['status'],
          hourlyRate: apiUnit.hourlyRate,
          remainingMinutes: apiUnit.remainingMinutes,
          customerDisplayName: apiUnit.customerDisplayName,
          locationName: apiUnit.locationName,
          specifications: {
            // Merge package rates from both possible sources
            packageRates: apiUnit.specifications?.packageRates || apiUnit.packageRates || {},
            // Include other specifications if available
            games: apiUnit.specifications?.games || [],
            storage: apiUnit.specifications?.storage,
            resolution: apiUnit.specifications?.resolution,
            // Include any other specifications
            ...apiUnit.specifications
          }
        }))
        
        setUnits(transformedUnits)
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

  // Use existing polling hook
  const { lastUpdated, refresh } = usePolling(fetchUnits, { interval: 30000 })

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