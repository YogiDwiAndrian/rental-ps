'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  GamepadIcon, 
  Coffee,
  Check,
  Grid3X3
} from 'lucide-react'
import { LocationData } from '@/hooks/use-locations'

interface LocationSwitcherProps {
  locations: LocationData[]
  selectedLocation: LocationData
  onSwitchLocation: (location: LocationData) => void
  onShowSelector?: () => void
  className?: string
}

export function LocationSwitcher({ 
  locations, 
  selectedLocation, 
  onSwitchLocation, 
  onShowSelector,
  className 
}: LocationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (locations.length <= 1) return null

  const otherLocations = locations.filter(loc => loc.id !== selectedLocation.id)

  const getStatusColor = (available: number, total: number) => {
    const percentage = total > 0 ? (available / total) * 100 : 0
    if (percentage >= 70) return 'bg-green-100 text-green-800 border-green-200'
    if (percentage >= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current Location Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between bg-white border-2 border-blue-200 hover:bg-blue-50 p-4 h-auto"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">{selectedLocation.name}</p>
            <p className="text-sm text-gray-600">{selectedLocation.code}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            {locations.length} locations
          </Badge>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl border-2 border-blue-200 bg-white">
          <CardContent className="p-4">
            <div className="space-y-3">
              
              {/* View All Locations Button */}
              {onShowSelector && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onShowSelector()
                    setIsOpen(false)
                  }}
                  className="w-full justify-start p-3 h-auto hover:bg-blue-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-500 rounded-lg">
                      <Grid3X3 className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">View All Locations</p>
                      <p className="text-sm text-gray-600">Compare all {locations.length} locations</p>
                    </div>
                  </div>
                </Button>
              )}

              {onShowSelector && <div className="border-t border-gray-200"></div>}

              {/* Current Location (marked) */}
              <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900">{selectedLocation.name}</p>
                      <p className="text-sm text-blue-700">{selectedLocation.address}</p>
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
                
                {/* Current Location Stats */}
                <div className="flex gap-2 mt-3">
                  <Badge className={getStatusColor(selectedLocation.stats.availableUnits, selectedLocation.stats.totalUnits)}>
                    <GamepadIcon className="w-3 h-3 mr-1" />
                    {selectedLocation.stats.availableUnits}/{selectedLocation.stats.totalUnits}
                  </Badge>
                  <Badge className={getStatusColor(selectedLocation.stats.availableFnbItems, selectedLocation.stats.totalFnbItems)}>
                    <Coffee className="w-3 h-3 mr-1" />
                    {selectedLocation.stats.availableFnbItems}/{selectedLocation.stats.totalFnbItems}
                  </Badge>
                </div>
              </div>

              {/* Other Locations */}
              {otherLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    onSwitchLocation(location)
                    setIsOpen(false)
                  }}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-400 rounded-lg">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{location.name}</p>
                      <p className="text-sm text-gray-600">{location.address}</p>
                    </div>
                  </div>
                  
                  {/* Location Stats */}
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(location.stats.availableUnits, location.stats.totalUnits)}>
                      <GamepadIcon className="w-3 h-3 mr-1" />
                      {location.stats.availableUnits}/{location.stats.totalUnits}
                    </Badge>
                    <Badge className={getStatusColor(location.stats.availableFnbItems, location.stats.totalFnbItems)}>
                      <Coffee className="w-3 h-3 mr-1" />
                      {location.stats.availableFnbItems}/{location.stats.totalFnbItems}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}