'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Building2, 
  Clock, 
  ArrowRight,
  User,
  Star,
  History,
  Settings
} from 'lucide-react'
import {
  getLocationHistory,
  saveLocationPreference,
  shouldRememberLocation,
  setRememberLocationPreference,
  getLastSelectedLocation,
  debugPreferences
} from '@/lib/session-storage'

interface Location {
  id: string
  name: string
  code: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
  tenant: {
    id: string
    name: string
    subdomain: string
  } | null
}

interface LocationSelectorClientProps {
  user: User
  locations: Location[]
}

interface LocationHistoryItem {
  locationId: string
  locationName: string
  locationCode: string
  lastAccessed: string
  accessCount: number
}

export default function LocationSelectorClient({ user, locations }: LocationSelectorClientProps) {
  const router = useRouter()
  const [rememberChoice, setRememberChoice] = useState(false)
  const [locationHistory, setLocationHistory] = useState<LocationHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  useEffect(() => {
    // Load user preferences on mount
    const remember = shouldRememberLocation(user.id, user.tenantId)
    setRememberChoice(remember)
    
    // Load location history for sorting
    const history = getLocationHistory(user.id, user.tenantId)
    setLocationHistory(history)
    
    // Check for auto-redirect if remember is enabled
    const lastLocation = getLastSelectedLocation(user.id, user.tenantId, locations)
    if (lastLocation && remember) {
      console.log('🎯 Auto-redirecting to remembered location:', lastLocation.locationName)
      handleLocationSelect(lastLocation.locationId, false) // Don't save again
    }
    
    // Debug in development
    if (process.env.NODE_ENV === 'development') {
      debugPreferences(user.id)
    }
  }, [user.id, user.tenantId, locations])

  const handleLocationSelect = async (locationId: string, savePreference = true) => {
    setLoading(true)
    setSelectedLocationId(locationId)
    
    const selectedLocation = locations.find(loc => loc.id === locationId)
    if (!selectedLocation) {
      setLoading(false)
      return
    }
    
    try {
      // Save preference if requested
      if (savePreference) {
        saveLocationPreference(user.id, user.tenantId, selectedLocation, rememberChoice)
        setRememberLocationPreference(user.id, user.tenantId, rememberChoice)
      }
      
      console.log('📍 Redirecting to location dashboard:', selectedLocation.name)
      
      // Redirect to location dashboard
      router.push(`/dashboard/location/${locationId}`)
      
    } catch (error) {
      console.error('Failed to save location preference:', error)
      setLoading(false)
    }
  }

  const getLocationStats = (locationId: string) => {
    const history = locationHistory.find(loc => loc.locationId === locationId)
    return {
      accessCount: history?.accessCount || 0,
      lastAccessed: history?.lastAccessed ? new Date(history.lastAccessed) : null,
      isFrequent: (history?.accessCount || 0) >= 3
    }
  }

  // Sort locations: frequent first, then alphabetically
  const sortedLocations = [...locations].sort((a, b) => {
    const aStats = getLocationStats(a.id)
    const bStats = getLocationStats(b.id)
    
    // Frequent locations first
    if (aStats.isFrequent && !bStats.isFrequent) return -1
    if (!aStats.isFrequent && bStats.isFrequent) return 1
    
    // Then by access count
    if (bStats.accessCount !== aStats.accessCount) {
      return bStats.accessCount - aStats.accessCount
    }
    
    // Finally alphabetically
    return a.name.localeCompare(b.name)
  })

  const LocationCard = ({ location }: { location: Location }) => {
    const stats = getLocationStats(location.id)
    const isSelected = selectedLocationId === location.id
    
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg
          ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}
        `}
        onClick={() => handleLocationSelect(location.id)}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{location.name}</h3>
                <p className="text-sm text-gray-600 font-medium">{location.code}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {stats.isFrequent && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Star className="w-3 h-3 mr-1" />
                  Frequent
                </Badge>
              )}
              {stats.accessCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <History className="w-3 h-3 mr-1" />
                  {stats.accessCount} visits
                </Badge>
              )}
            </div>
          </div>
          
          {stats.lastAccessed && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Clock className="w-4 h-4" />
              <span>Last accessed: {stats.lastAccessed.toLocaleDateString()}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>Location Dashboard</span>
            </div>
            
            <Button 
              variant={isSelected ? "default" : "outline"}
              size="sm"
              disabled={loading}
              className={isSelected ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {loading && isSelected ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  Select
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-6 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-500 rounded-xl">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-gray-900">
                Choose Your Location
              </h1>
              <p className="text-blue-700">
                Welcome back, {user.name}
              </p>
            </div>
          </div>
          
          <div className="bg-white/70 rounded-xl p-4 inline-block">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              <span>You have access to {locations.length} location{locations.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Location Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {sortedLocations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>

        {/* Remember Choice - Simple Toggle */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-3">
              <button
                onClick={() => setRememberChoice(!rememberChoice)}
                disabled={loading}
                className={`
                  relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${rememberChoice ? 'bg-blue-600' : 'bg-gray-200'}
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${rememberChoice ? 'translate-x-4' : 'translate-x-0'}
                  `}
                />
              </button>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 cursor-pointer">
                  Remember my choice and automatically redirect next time
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  You can change this preference anytime in your dashboard settings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            💡 Select your primary working location to access the dashboard
          </p>
        </div>
      </div>
    </div>
  )
}