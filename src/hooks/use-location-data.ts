'use client'

import { useState, useEffect } from 'react'

export interface LocationData {
  name: string
  address: string
  phone?: string
  whatsapp?: string
  email?: string
  description?: string
  operationalHours?: Record<string, { open: string; close: string }>
}

interface LocationApiResponse {
  success: boolean
  data: {
    location: LocationData
    tenant: {
      name: string
      subdomain: string
    }
  }
  error?: string
}

export function useLocationData(subdomain: string) {
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/public/${subdomain}/location`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data: LocationApiResponse = await response.json()
        
        if (data.success && data.data && data.data.location) {
          setLocationData(data.data.location)
        } else {
          // Fallback data if API fails
          setLocationData({
            name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Gaming Center`,
            address: `Jl. Gaming Street, ${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}`,
            phone: '+62 812-3456-7890',
            whatsapp: '+6281234567890'
          })
        }
      } catch (err) {
        console.error('Failed to fetch location data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch location data')
        
        // Set fallback data on error
        setLocationData({
          name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Gaming Center`,
          address: `Jl. Gaming Street, ${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}`,
          phone: '+62 812-3456-7890',
          whatsapp: '+6281234567890'
        })
      } finally {
        setLoading(false)
      }
    }

    if (subdomain) {
      fetchLocationData()
    }
  }, [subdomain])

  return {
    locationData,
    loading,
    error
  }
}