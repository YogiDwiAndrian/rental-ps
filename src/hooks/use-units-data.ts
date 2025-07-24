'use client'

import { useState, useCallback, useEffect } from 'react'
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
    features?: string[]
    accessories?: string[]
    [key: string]: unknown // Allow other properties but typed as unknown
  }
  locationName?: string
}

// Define proper API response types
interface ApiUnitSpecifications {
  packageRates?: Record<string, number>
  games?: string[]
  storage?: string
  resolution?: string
  features?: string[]
  accessories?: string[]
  [key: string]: unknown
}

interface ApiUnit {
  id: string
  name: string
  consoleType: string
  controllerCount: number
  status: string
  hourlyRate: number
  remainingMinutes?: number
  customerDisplayName?: string
  locationName?: string
  locationId?: string
  specifications?: ApiUnitSpecifications
  packageRates?: Record<string, number>
}

interface ApiUnitsResponse {
  success: boolean
  data: {
    units: ApiUnit[]
    locationFilter?: {
      locationId: string
      locationName: string
    } | null
    lastUpdated: string
    tenant: {
      name: string
      subdomain: string
    }
  }
}

export function useUnitsData(subdomain: string, locationId?: string) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build URL with location parameter if provided
      const url = locationId 
        ? `/api/public/${subdomain}/units?locationId=${locationId}`
        : `/api/public/${subdomain}/units`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data: ApiUnitsResponse = await response.json()
      
      // Handle the actual API response structure
      if (data.success && data.data && data.data.units) {
        // Transform API units to our Unit interface with proper type safety
        const transformedUnits: Unit[] = data.data.units.map((apiUnit: ApiUnit) => ({
          id: apiUnit.id,
          name: apiUnit.customerDisplayName || apiUnit.name,
          consoleType: apiUnit.consoleType,
          controllerCount: apiUnit.controllerCount,
          status: apiUnit.status as Unit['status'],
          hourlyRate: Number(apiUnit.hourlyRate),
          remainingMinutes: apiUnit.remainingMinutes,
          customerDisplayName: apiUnit.customerDisplayName,
          locationName: apiUnit.locationName,
          specifications: {
            // Merge package rates from both possible sources with type safety
            packageRates: {
              ...(apiUnit.specifications?.packageRates || {}),
              ...(apiUnit.packageRates || {})
            },
            // Include other specifications with proper typing
            games: Array.isArray(apiUnit.specifications?.games) 
              ? apiUnit.specifications.games 
              : [],
            storage: typeof apiUnit.specifications?.storage === 'string' 
              ? apiUnit.specifications.storage 
              : undefined,
            resolution: typeof apiUnit.specifications?.resolution === 'string' 
              ? apiUnit.specifications.resolution 
              : undefined,
            features: Array.isArray(apiUnit.specifications?.features) 
              ? apiUnit.specifications.features 
              : undefined,
            accessories: Array.isArray(apiUnit.specifications?.accessories) 
              ? apiUnit.specifications.accessories 
              : undefined,
            // Include any other specifications with unknown type for safety
            ...(apiUnit.specifications && typeof apiUnit.specifications === 'object' 
              ? Object.fromEntries(
                  Object.entries(apiUnit.specifications).filter(([key]) => 
                    !['packageRates', 'games', 'storage', 'resolution', 'features', 'accessories'].includes(key)
                  )
                )
              : {}
            )
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
  }, [subdomain, locationId])

  // Use existing polling hook - FIXED: Add locationId to dependencies
  const { lastUpdated, refresh } = usePolling(fetchUnits, { 
    interval: 30000,
    // Force refresh when locationId changes
    immediate: true
  })

  // Force refresh when locationId changes
  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

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