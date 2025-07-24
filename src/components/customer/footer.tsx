
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  MapPin, 
  Clock, 
  Phone, 
  Navigation, 
  ExternalLink,
  Calendar,
  Map,
  ChevronUp,
  ChevronDown,
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

interface FooterProps {
  locationInfo: LocationInfo
  lastUpdated: {
    units?: Date | null
    fnb?: Date | null
  }
}

export function Footer({ locationInfo, lastUpdated }: FooterProps) {
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
    <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-12">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          
          {/* Location Info Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">📍 Location</h3>
            </div>
            
            <div className="space-y-2">
              <p className="font-semibold text-gray-900">{locationInfo.name}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{locationInfo.address}</p>
              
              {locationInfo.latitude && locationInfo.longitude && (
                <p className="text-xs text-gray-500">
                  📍 {locationInfo.latitude.toFixed(6)}, {locationInfo.longitude.toFixed(6)}
                </p>
              )}
            </div>

            {/* Map Section */}
            <div className="space-y-3">
              {!showMap ? (
                <Button 
                  onClick={handleShowMap} 
                  variant="outline" 
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
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
                        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
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
          </div>

          {/* Operating Hours Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">🕒 Operating Hours</h3>
            </div>

            {/* Current Status */}
            <div className={`p-3 rounded-lg border-2 ${
              isCurrentlyOpen 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${
                  isCurrentlyOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <span className={`font-bold ${
                  isCurrentlyOpen ? 'text-green-800' : 'text-red-800'
                }`}>
                  {isCurrentlyOpen ? 'Open Now' : 'Closed'}
                </span>
              </div>
              {todayHours && (
                <p className={`text-sm ${
                  isCurrentlyOpen ? 'text-green-700' : 'text-red-700'
                }`}>
                  Today: {formatTime(todayHours.open)} - {formatTime(todayHours.close)}
                </p>
              )}
            </div>

            {/* Week Schedule - Compact */}
            {locationInfo.operationalHours && (
              <div className="space-y-1">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                  const dayHours = locationInfo.operationalHours![day]
                  const isToday = day === getCurrentDay()
                  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1, 3)
                  
                  return (
                    <div key={day} className={`flex justify-between text-sm py-1 px-2 rounded ${
                      isToday ? 'bg-blue-50 font-medium text-blue-900' : 'text-gray-600'
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
          </div>

          {/* Contact & Status Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">📞 Contact</h3>
            </div>

            {/* Contact Methods */}
            <div className="space-y-3">
              {locationInfo.phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">{locationInfo.phone}</p>
                  </div>
                </div>
              )}

              {locationInfo.whatsapp && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-green-800">WhatsApp</p>
                    <p className="text-sm text-green-600">{locationInfo.whatsapp}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Live Data Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Live Updates</span>
              </div>
              <div className="space-y-1 text-xs text-blue-700">
                {lastUpdated.units && (
                  <p>Units: {lastUpdated.units.toLocaleTimeString()}</p>
                )}
                {lastUpdated.fnb && (
                  <p>Menu: {lastUpdated.fnb.toLocaleTimeString()}</p>
                )}
                <p className="text-blue-600">Auto-refresh every 30 seconds</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600">
                {locationInfo.name} • Live gaming unit status & F&B menu
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Information updates automatically every 30 seconds
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">Live data</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}