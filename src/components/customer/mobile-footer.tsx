'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  MapPin, 
  Clock, 
  Navigation, 
  ExternalLink,
  Map,
  RefreshCw
} from 'lucide-react'

interface LocationInfo {
  name: string
  address: string
  phone?: string
  whatsapp?: string
  operationalHours?: Record<string, { open: string; close: string }>
  latitude?: number
  longitude?: number
}

interface MobileFooterProps {
  locationInfo: LocationInfo
  lastUpdated: {
    units?: Date | null
    fnb?: Date | null
  }
}

export function MobileFooter({ locationInfo, lastUpdated }: MobileFooterProps) {
  const [showMap, setShowMap] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Operating Hours Logic
  const getCurrentDay = () => {
    const today = new Date().getDay()
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return dayKeys[today]
  }

  const isOpenNow = () => {
    if (!locationInfo.operationalHours) return false
    
    const now = new Date()
    const currentDay = getCurrentDay()
    const todayHours = locationInfo.operationalHours[currentDay]
    
    if (!todayHours) return false
    
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

  const getTodayHours = () => {
    if (!locationInfo.operationalHours) return null
    const currentDay = getCurrentDay()
    return locationInfo.operationalHours[currentDay]
  }

  const handleShowMap = () => {
    setShowMap(true)
    setTimeout(() => setMapLoaded(true), 100)
  }

  const handleOpenInMaps = () => {
    if (locationInfo.latitude && locationInfo.longitude) {
      const url = `https://www.google.com/maps?q=${locationInfo.latitude},${locationInfo.longitude}`
      window.open(url, '_blank')
    } else {
      const encodedAddress = encodeURIComponent(`${locationInfo.name}, ${locationInfo.address}`)
      const url = `https://www.google.com/maps/search/${encodedAddress}`
      window.open(url, '_blank')
    }
  }

  const handleGetDirections = () => {
    if (locationInfo.latitude && locationInfo.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${locationInfo.latitude},${locationInfo.longitude}`
      window.open(url, '_blank')
    } else {
      const encodedAddress = encodeURIComponent(`${locationInfo.name}, ${locationInfo.address}`)
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
      window.open(url, '_blank')
    }
  }

  const isCurrentlyOpen = isOpenNow()
  const todayHours = getTodayHours()
  const hasGoogleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-8">
      <div className="container mx-auto px-4 py-6 max-w-md">
        
        {/* Mobile Location Info */}
        <Card className="mb-4 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-blue-900">📍 Location</h3>
            </div>
            
            <div className="space-y-2 mb-4">
              <p className="font-semibold text-gray-900">{locationInfo.name}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{locationInfo.address}</p>
            </div>

            {/* Mobile Map Section */}
            <div className="space-y-3">
              {!showMap ? (
                <Button 
                  onClick={handleShowMap} 
                  variant="outline" 
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-100"
                  size="sm"
                >
                  <Map className="w-4 h-4 mr-2" />
                  Show Map
                </Button>
              ) : (
                <div className="space-y-2">
                  {hasGoogleMapsKey && mapLoaded ? (
                    <div className="aspect-video rounded-lg overflow-hidden border shadow-sm">
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={
                          locationInfo.latitude && locationInfo.longitude
                            ? `https://www.google.com/maps/embed/v1/place?key=${hasGoogleMapsKey}&q=${locationInfo.latitude},${locationInfo.longitude}&zoom=16`
                            : `https://www.google.com/maps/embed/v1/place?key=${hasGoogleMapsKey}&q=${encodeURIComponent(`${locationInfo.name}, ${locationInfo.address}`)}&zoom=16`
                        }
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg border bg-gray-100 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Interactive Map</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={handleOpenInMaps}
                      variant="outline" 
                      size="sm"
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open
                    </Button>
                    <Button 
                      onClick={handleGetDirections}
                      size="sm"
                      className="text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      <Navigation className="w-3 h-3 mr-1" />
                      Directions
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mobile Operating Hours */}
        <Card className="mb-4 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-green-900">🕒 Operating Hours</h3>
            </div>

            {/* Current Status */}
            <div className={`p-3 rounded-lg border-2 mb-3 ${
              isCurrentlyOpen 
                ? 'bg-green-100 border-green-300' 
                : 'bg-red-100 border-red-300'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${
                  isCurrentlyOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <span className={`font-bold text-sm ${
                  isCurrentlyOpen ? 'text-green-800' : 'text-red-800'
                }`}>
                  {isCurrentlyOpen ? 'Open Now' : 'Closed'}
                </span>
              </div>
              {todayHours && (
                <p className={`text-xs ${
                  isCurrentlyOpen ? 'text-green-700' : 'text-red-700'
                }`}>
                  Today: {formatTime(todayHours.open)} - {formatTime(todayHours.close)}
                </p>
              )}
            </div>

            {/* Week Schedule - Mobile Compact */}
            {locationInfo.operationalHours && (
              <div className="space-y-1">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                  const dayHours = locationInfo.operationalHours![day]
                  const isToday = day === getCurrentDay()
                  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1, 3)
                  
                  return (
                    <div key={day} className={`flex justify-between text-xs py-1 px-2 rounded ${
                      isToday ? 'bg-blue-100 font-medium text-blue-900' : 'text-gray-600'
                    }`}>
                      <span>{dayLabel}</span>
                      <span>
                        {dayHours 
                          ? `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`
                          : 'Closed'
                        }
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile Live Data Status */}
        <Card className="mb-4 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-bold text-purple-800">📊 Live Updates</span>
            </div>
            <div className="space-y-2 text-xs text-purple-700">
              {lastUpdated.units && (
                <div className="flex justify-between">
                  <span>Gaming Units:</span>
                  <span className="font-medium">{lastUpdated.units.toLocaleTimeString()}</span>
                </div>
              )}
              {lastUpdated.fnb && (
                <div className="flex justify-between">
                  <span>F&B Menu:</span>
                  <span className="font-medium">{lastUpdated.fnb.toLocaleTimeString()}</span>
                </div>
              )}
              <div className="text-center pt-2 border-t border-purple-200">
                <span className="text-purple-600 font-medium">⚡ Auto-refresh every 30 seconds</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Footer Bottom */}
        <div className="text-center py-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-1">
            {locationInfo.name} • Live gaming unit status & F&B menu
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Real-time data</span>
          </div>
        </div>
      </div>
    </footer>
  )
}