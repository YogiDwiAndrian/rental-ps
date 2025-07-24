'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, ExternalLink } from 'lucide-react'

interface LocationMapProps {
  address: string
  latitude?: number
  longitude?: number
  locationName: string
  className?: string
}

export function LocationMap({ 
  address, 
  latitude, 
  longitude, 
  locationName, 
  className 
}: LocationMapProps) {
  
  const handleOpenInMaps = () => {
    if (latitude && longitude) {
      // Use coordinates for precise location
      const url = `https://www.google.com/maps?q=${latitude},${longitude}`
      window.open(url, '_blank')
    } else {
      // Fallback to address search
      const encodedAddress = encodeURIComponent(`${locationName}, ${address}`)
      const url = `https://www.google.com/maps/search/${encodedAddress}`
      window.open(url, '_blank')
    }
  }

  const handleGetDirections = () => {
    if (latitude && longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      window.open(url, '_blank')
    } else {
      const encodedAddress = encodeURIComponent(`${locationName}, ${address}`)
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
      window.open(url, '_blank')
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-600" />
          Location & Directions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-1">{locationName}</p>
            <p className="text-sm text-gray-600">{address}</p>
          </div>
          
          {/* Embedded Google Maps */}
          {latitude && longitude ? (
            <div className="aspect-video rounded-lg overflow-hidden border">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${latitude},${longitude}&zoom=16`}
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video rounded-lg overflow-hidden border">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(`${locationName}, ${address}`)}&zoom=16`}
                allowFullScreen
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={handleOpenInMaps}
              variant="outline" 
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Maps
            </Button>
            <Button 
              onClick={handleGetDirections}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}