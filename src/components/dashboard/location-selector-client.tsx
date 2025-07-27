'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { 
  MapPin, 
  Building2, 
  Clock, 
  Star,
  History,
  Settings,
  Loader2,
  Check,
  Users,
  Shield
} from 'lucide-react'

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

export default function LocationSelectorClient({ user, locations }: LocationSelectorClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [rememberChoice, setRememberChoice] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' | 'loading' = 'success') => {
    // Simple console logging for now
    // TODO: Replace with proper toast library (sonner recommended)
    console.log(`${type.toUpperCase()}: ${message}`)
    
    // Optional: Simple user feedback for critical errors
    if (type === 'error') {
      // You can implement a proper toast here later
      console.error(`Toast Error: ${message}`)
    }
  }

  const handleLocationSelect = async (locationId: string) => {
    if (isPending) return
    
    setSelectedLocationId(locationId)
    const selectedLocation = locations.find(loc => loc.id === locationId)
    
    if (!selectedLocation) {
      showToast('Location not found', 'error')
      return
    }
    
    try {
      console.log('📍 Accessing location dashboard:', selectedLocation.name)
      
      // If remember choice is enabled, save preference
      if (rememberChoice) {
        const response = await fetch('/api/user/preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            preferredLocationId: locationId,
            rememberChoice: true
          }),
        })
        
        if (!response.ok) {
          console.warn('Failed to save preference, but continuing...')
        } else {
          showToast('Location preference saved!')
        }
      }
      
      // Redirect with smooth transition
      startTransition(() => {
        router.push(`/dashboard/location/${locationId}`)
      })
      
    } catch (error) {
      console.error('Error selecting location:', error)
      showToast('Failed to access location dashboard', 'error')
      setSelectedLocationId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <MapPin className="w-8 h-8 text-blue-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Select Your Location
          </h1>
          
          <p className="text-lg text-gray-600 mb-1">
            Welcome back, <span className="font-semibold">{user.name}</span>
          </p>
          
          <p className="text-sm text-gray-500">
            Choose your working location to access the dashboard
          </p>
        </div>

        {/* User Info Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role}
                    </Badge>
                    <Badge variant="outline">
                      {user.tenant?.name || 'Unknown Tenant'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-500">Available Locations</p>
                <p className="text-2xl font-bold text-blue-600">{locations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remember Choice Option */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="remember-choice"
                checked={rememberChoice}
                onCheckedChange={(checked: boolean) => setRememberChoice(checked)}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="remember-choice"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Remember my choice
                </label>
                <p className="text-xs text-gray-500">
                  Skip this selection next time and go directly to your preferred location
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Locations Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => {
            const isSelected = selectedLocationId === location.id
            const isLoading = isPending && isSelected
            
            return (
              <Card 
                key={location.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-blue-300'
                } ${isLoading ? 'opacity-75' : ''}`}
                onClick={() => !isLoading && handleLocationSelect(location.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                        isSelected ? 'bg-blue-500' : 'bg-gray-100'
                      }`}>
                        <Building2 className={`w-5 h-5 ${
                          isSelected ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {location.name}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          Code: {location.code}
                        </p>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Active Today
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Users className="w-3 h-3 mr-1" />
                        Multi-Location
                      </div>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    {/* Action Button */}
                    <Button 
                      variant={isSelected ? "default" : "outline"}
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Accessing...
                        </>
                      ) : isSelected ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Selected
                        </>
                      ) : (
                        'Select Location'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Footer Information */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                <Settings className="w-4 h-4" />
                <span>Your location preference can be changed anytime in settings</span>
              </div>
              
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <span>Secure Authentication</span>
                <span>•</span>
                <span>Multi-Location Support</span>
                <span>•</span>
                <span>Smart Preferences</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-6 flex justify-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard?select=true')}
            className="text-gray-600 hover:text-gray-900"
          >
            <History className="w-4 h-4 mr-2" />
            Refresh Options
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/auth/signout')}
            className="text-red-600 hover:text-red-700"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}