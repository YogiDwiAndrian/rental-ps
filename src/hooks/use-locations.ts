// src/hooks/use-locations.ts - FIXED VERSION
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export interface LocationData {
  id: string
  name: string
  code: string
  address: string
  phone?: string
  email?: string
  publicDescription?: string
  operationalHours: Record<string, { open: string; close: string }>
  latitude?: number
  longitude?: number
  stats: {
    totalUnits: number
    availableUnits: number
    occupiedUnits: number
    totalFnbItems: number
    availableFnbItems: number
    totalContacts: number
    primaryContacts: number
  }
}

interface LocationsApiResponse {
  success: boolean
  data: {
    tenant: {
      name: string
      subdomain: string
    }
    locations: LocationData[]
    defaultLocation: LocationData | null
    hasMultipleLocations: boolean
    locationCount: number
    lastUpdated: string
  }
}

export function useLocations(subdomain: string) {
  const [locations, setLocations] = useState<LocationData[]>([])
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/public/${subdomain}/locations`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data: LocationsApiResponse = await response.json()
      
      if (data.success && data.data && data.data.locations) {
        setLocations(data.data.locations)
        
        // For single location, auto-select it
        if (data.data.locations.length === 1) {
          const singleLocation = data.data.locations[0]
          setSelectedLocation(singleLocation)
          return
        }
        
        // For multiple locations, check URL params
        const locationParam = searchParams.get('location')
        let targetLocation: LocationData | null = null
        
        if (locationParam) {
          targetLocation = data.data.locations.find(loc => 
            loc.code.toLowerCase() === locationParam.toLowerCase() ||
            loc.name.toLowerCase().includes(locationParam.toLowerCase())
          ) || null
        }
        
        // Fallback to default location (first one) for multiple locations
        if (!targetLocation && data.data.defaultLocation) {
          targetLocation = data.data.defaultLocation
        }
        
        setSelectedLocation(targetLocation)
      } else {
        console.error('❌ Invalid locations API response:', data)
        setLocations([])
        setSelectedLocation(null)
      }
    } catch (err) {
      console.error('❌ Failed to fetch locations:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch locations')
    } finally {
      setLoading(false)
    }
  }, [subdomain, searchParams])

  // Fetch locations on mount and when subdomain changes
  useEffect(() => {
    if (subdomain) {
      fetchLocations()
    }
  }, [fetchLocations])

  // Function to switch location and update URL
  const switchLocation = useCallback((location: LocationData) => {
    setSelectedLocation(location)
    
    // Update URL with location parameter - only for multiple locations
    if (locations.length > 1) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('location', location.code.toLowerCase())
      
      // Use replace to avoid adding to history stack
      router.replace(`?${params.toString()}`, { scroll: false })
    }
  }, [router, searchParams, locations.length])

  // Function to clear location selection (go to selector)
  const clearSelection = useCallback(() => {
    setSelectedLocation(null)
    
    // Remove location parameter from URL
    const params = new URLSearchParams(searchParams.toString())
    params.delete('location')
    
    const newUrl = params.toString() ? `?${params.toString()}` : ''
    router.replace(newUrl, { scroll: false })
  }, [router, searchParams])

  // Check if should show location selector page
  const shouldShowSelector = !loading && !error && locations.length > 1 && !selectedLocation

  // Get location-specific data hooks parameters
  const getLocationSpecificHooks = useCallback((locationId?: string) => {
    const targetLocationId = locationId || selectedLocation?.id
    
    return {
      locationId: targetLocationId,
      locationCode: selectedLocation?.code,
      apiParams: targetLocationId ? `?locationId=${targetLocationId}` : ''
    }
  }, [selectedLocation])

  return {
    // Location data
    locations,
    selectedLocation,
    hasMultipleLocations: locations.length > 1,
    locationCount: locations.length,
    
    // State
    loading,
    error,
    shouldShowSelector,
    
    // Actions
    switchLocation,
    clearSelection,
    refresh: fetchLocations,
    
    // Utilities
    getLocationSpecificHooks
  }
}