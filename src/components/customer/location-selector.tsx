'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  GamepadIcon, 
  Coffee, 
  Clock, 
  Phone,
  Users,
  ArrowRight,
  Zap,
  ShoppingCart
} from 'lucide-react'
import { LocationData } from '@/hooks/use-locations'

interface LocationSelectorProps {
  locations: LocationData[]
  tenantName: string
  onSelectLocation: (location: LocationData) => void
}

export function LocationSelector({ locations, tenantName, onSelectLocation }: LocationSelectorProps) {
  
  const getStatusColor = (available: number, total: number) => {
    const percentage = total > 0 ? (available / total) * 100 : 0
    if (percentage >= 70) return 'text-green-600'
    if (percentage >= 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCurrentDay = () => {
    const today = new Date().getDay()
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return dayKeys[today]
  }

  const isLocationOpen = (hours: Record<string, { open: string; close: string }>) => {
    const currentDay = getCurrentDay()
    const todayHours = hours[currentDay]
    
    if (!todayHours) return false
    
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [openHour, openMinute] = todayHours.open.split(':').map(Number)
    const [closeHour, closeMinute] = todayHours.close.split(':').map(Number)
    
    const openTime = openHour * 60 + openMinute
    let closeTime = closeHour * 60 + closeMinute
    
    if (closeTime < openTime) closeTime += 24 * 60
    
    return currentTime >= openTime && currentTime <= closeTime
  }

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':')
    const h = parseInt(hour)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${displayHour}:${minute} ${ampm}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-6 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎮 {tenantName}
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Choose Your Gaming Location
          </p>
          <p className="text-gray-500">
            We have {locations.length} locations ready to serve you
          </p>
        </div>

        {/* Locations Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {locations.map((location) => {
            const isOpen = isLocationOpen(location.operationalHours)
            const todayHours = location.operationalHours[getCurrentDay()]
            
            return (
              <Card 
                key={location.id}
                className="border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer bg-white"
                onClick={() => onSelectLocation(location)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-900">
                          {location.name}
                        </CardTitle>
                        <p className="text-sm text-gray-500 font-medium">
                          {location.code}
                        </p>
                      </div>
                    </div>
                    
                    {/* Open/Closed Status */}
                    <Badge className={`${
                      isOpen 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {isOpen ? '🟢 Open' : '🔴 Closed'}
                    </Badge>
                  </div>

                  {/* Address */}
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {location.address}
                  </p>

                  {/* Hours */}
                  {todayHours && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <Clock className="w-4 h-4" />
                      <span>Today: {formatTime(todayHours.open)} - {formatTime(todayHours.close)}</span>
                    </div>
                  )}

                  {/* Contact */}
                  {location.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{location.phone}</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    
                    {/* Gaming Units Stats */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <GamepadIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Gaming Units</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total</span>
                          <span className="font-semibold text-gray-900">{location.stats.totalUnits}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Available</span>
                          <span className={`font-semibold ${getStatusColor(location.stats.availableUnits, location.stats.totalUnits)}`}>
                            {location.stats.availableUnits}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* F&B Stats */}
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Coffee className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-800">F&B Menu</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Items</span>
                          <span className="font-semibold text-gray-900">{location.stats.totalFnbItems}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Available</span>
                          <span className={`font-semibold ${getStatusColor(location.stats.availableFnbItems, location.stats.totalFnbItems)}`}>
                            {location.stats.availableFnbItems}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {location.stats.totalContacts > 0 && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200 mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          {location.stats.totalContacts} WhatsApp Contact{location.stats.totalContacts > 1 ? 's' : ''}
                        </span>
                        {location.stats.primaryContacts > 0 && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            {location.stats.primaryContacts} Priority
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {location.publicDescription && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {location.publicDescription}
                    </p>
                  )}

                  {/* Action Button */}
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
                    onClick={() => onSelectLocation(location)}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isOpen ? (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>View Units & Menu</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>View Location Info</span>
                        </>
                      )}
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Footer Info */}
        <div className="text-center mt-12 p-6 bg-white/70 rounded-xl backdrop-blur-sm">
          <p className="text-gray-600 mb-2">
            ℹ️ Each location has its own gaming units, menu, and contact information
          </p>
          <p className="text-sm text-gray-500">
            You can switch between locations anytime while browsing
          </p>
        </div>
      </div>
    </div>
  )
}