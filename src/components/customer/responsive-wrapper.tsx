'use client'

import { useMobileDetection } from '@/hooks/use-mobile-detection'
import { useUnitsData } from '@/hooks/use-units-data'
import { useFnbData } from '@/hooks/use-fnb-data'
import { MapPin } from 'lucide-react'
import { useWhatsAppContacts } from '@/hooks/use-whatsapp-contacts'
import { useLocations, LocationData } from '@/hooks/use-locations'
import { UnitsCard } from './units-card'
import { FnbCard } from './fnb-card'
import { FloatingWhatsApp } from './floating-whatsapp'
import { Footer } from './footer'
import { LocationSelector } from './location-selector'
import { LocationSwitcher } from './location-switcher'

// Mobile components
import { MobileStats } from './mobile-stats'
import { MobileUnits } from './mobile-units'
import { MobileFnb } from './mobile-fnb'

interface ResponsiveWrapperProps {
  subdomain: string
}

interface WhatsAppContactFormatted {
  name: string
  role: 'owner' | 'manager' | 'staff' | 'custom'
  number: string
  isOnline: boolean
  responseTime?: string
}

interface LocationInfo {
  name: string
  address: string
  phone?: string
  whatsapp?: string
  operationalHours?: Record<string, { open: string; close: string }>
  latitude?: number
  longitude?: number
}

interface LastUpdatedData {
  units?: Date | null
  fnb?: Date | null
}

export function ResponsiveWrapper({ subdomain }: ResponsiveWrapperProps) {
  const { isMobile, isDesktop, isLoading: deviceLoading } = useMobileDetection()
  
  // Multi-location management
  const { 
    locations, 
    selectedLocation, 
    hasMultipleLocations, 
    shouldShowSelector,
    loading: locationsLoading,
    error: locationsError,
    switchLocation,
    clearSelection,
    getLocationSpecificHooks
  } = useLocations(subdomain)
  
  // SIMPLIFIED: Use selectedLocation.id directly instead of getLocationSpecificHooks()
  const currentLocationId = selectedLocation?.id
  
  console.log("🔍 Current Location Debug:", {
    selectedLocation: selectedLocation?.name,
    currentLocationId,
    hasMultipleLocations,
    shouldShowSelector
  })
  
  // Data hooks with direct location ID
  const unitsData = useUnitsData(subdomain, currentLocationId)
  const fnbData = useFnbData(subdomain, currentLocationId)
  const { contacts: dynamicContacts } = useWhatsAppContacts(subdomain, currentLocationId)
  
  // Get location data for the selected location
  const locationData: LocationInfo | null = selectedLocation ? {
    name: selectedLocation.name,
    address: selectedLocation.address,
    phone: selectedLocation.phone,
    whatsapp: selectedLocation.phone, // Will be enhanced with dynamic contacts
    operationalHours: selectedLocation.operationalHours,
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude
  } : null

  // Show loading state while detecting device type or loading locations
  if (deviceLoading || locationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gaming center information...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (locationsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading locations: {locationsError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Show location selector for multiple locations
  if (shouldShowSelector) {
    return (
      <LocationSelector
        locations={locations}
        tenantName={locations[0]?.name.split(' ')[0] + ' Gaming' || `${subdomain} Gaming`}
        onSelectLocation={switchLocation}
      />
    )
  }

  // Fallback location info if no specific location selected
  const locationInfo: LocationInfo = locationData || {
    name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Gaming Center`,
    address: `Jl. Gaming Street, ${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}`,
    phone: '+628',
    whatsapp: '+628'
  }

  // Prepare WhatsApp contacts from dynamic data
  const whatsappContacts: WhatsAppContactFormatted[] = dynamicContacts.length > 0 ? dynamicContacts.map(contact => ({
    name: contact.name,
    role: contact.role,
    number: contact.whatsappNumber,
    isOnline: contact.isOnline,
    responseTime: contact.responseTime
  })) : []
  
  // Add fallback contacts if no dynamic contacts - BUT ONLY if really empty
  if (whatsappContacts.length === 0) {
    console.log('🚨 No dynamic contacts found, adding fallback contacts')
    if (locationInfo.whatsapp) {
      whatsappContacts.push({
        name: 'Customer Service',
        role: 'staff' as const,
        number: locationInfo.whatsapp,
        isOnline: true,
        responseTime: '5 minutes'
      })
    }
    if (locationInfo.phone && locationInfo.phone !== locationInfo.whatsapp) {
      whatsappContacts.push({
        name: 'Owner',
        role: 'owner' as const,
        number: locationInfo.phone,
        isOnline: true,
        responseTime: '10 minutes'
      })
    }
  } else {
    console.log(`✅ Found ${whatsappContacts.length} dynamic contacts:`, whatsappContacts.map(c => c.name))
  }

  const lastUpdatedData: LastUpdatedData = {
    units: unitsData.lastUpdated,
    fnb: fnbData.lastUpdated
  }

  if (isMobile) {
    return (
      <>
        <MobileLayout 
          subdomain={subdomain}
          locationInfo={locationInfo}
          unitsData={unitsData}
          fnbData={fnbData}
          locations={locations}
          selectedLocation={selectedLocation}
          hasMultipleLocations={hasMultipleLocations}
          onSwitchLocation={switchLocation}
          onShowSelector={clearSelection}
        />
        <Footer 
          locationInfo={locationInfo}
          lastUpdated={lastUpdatedData}
        />
        {whatsappContacts.length > 0 && (
          <FloatingWhatsApp 
            contacts={whatsappContacts}
            locationName={locationInfo.name}
          />
        )}
      </>
    )
  }

  if (isDesktop) {
    return (
      <>
        <DesktopLayout 
          subdomain={subdomain} 
          locationInfo={locationInfo}
          unitsData={unitsData}
          fnbData={fnbData}
          locations={locations}
          selectedLocation={selectedLocation}
          hasMultipleLocations={hasMultipleLocations}
          onSwitchLocation={switchLocation}
          onShowSelector={clearSelection}
        />
        <Footer 
          locationInfo={locationInfo}
          lastUpdated={lastUpdatedData}
        />
        {whatsappContacts.length > 0 && (
          <FloatingWhatsApp 
            contacts={whatsappContacts}
            locationName={locationInfo.name}
          />
        )}
      </>
    )
  }

  // Fallback to desktop layout
  return (
    <>
      <DesktopLayout 
        subdomain={subdomain} 
        locationInfo={locationInfo}
        unitsData={unitsData}
        fnbData={fnbData}
        locations={locations}
        selectedLocation={selectedLocation}
        hasMultipleLocations={hasMultipleLocations}
        onSwitchLocation={switchLocation}
        onShowSelector={clearSelection}
      />
      <Footer 
        locationInfo={locationInfo}
        lastUpdated={lastUpdatedData}
      />
      {whatsappContacts.length > 0 && (
        <FloatingWhatsApp 
          contacts={whatsappContacts}
          locationName={locationInfo.name}
        />
      )}
    </>
  )
}

// Enhanced Mobile Layout with proper types
interface LayoutProps {
  subdomain: string
  locationInfo: LocationInfo
  unitsData: ReturnType<typeof useUnitsData>
  fnbData: ReturnType<typeof useFnbData>
  locations: LocationData[]
  selectedLocation: LocationData | null
  hasMultipleLocations: boolean
  onSwitchLocation: (location: LocationData) => void
  onShowSelector: () => void
}

function MobileLayout({ 
  subdomain, 
  locationInfo,
  unitsData, 
  fnbData,
  locations,
  selectedLocation,
  hasMultipleLocations,
  onSwitchLocation,
  onShowSelector
}: LayoutProps) {
  return (
    <div className="container mx-auto p-4 space-y-6 max-w-md">
      {/* Mobile Header with Location Switcher */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🎮 Gaming Center
        </h1>
        
        {/* Location Switcher for Mobile */}
        {hasMultipleLocations && selectedLocation && (
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Current Location:</span>
              </div>
              <LocationSwitcher
                locations={locations}
                selectedLocation={selectedLocation}
                onSwitchLocation={onSwitchLocation}
                onShowSelector={onShowSelector}
                className="w-full"
              />
            </div>
          </div>
        )}
        
        <p className="text-xs text-gray-500">
          Live status • Auto-refreshed every 30s
        </p>
      </div>

      {/* Quick Stats */}
      <MobileStats 
        unitsStats={unitsData.stats}
        fnbStats={fnbData.stats}
      />

      {/* PRIORITY ORDER: Units First, then F&B */}
      <MobileUnits
        groupedUnits={unitsData.groupedUnits}
        loading={unitsData.loading}
        lastUpdated={unitsData.lastUpdated}
        onRefresh={unitsData.refresh}
      />

      <MobileFnb
        categories={fnbData.categories}
        loading={fnbData.loading}
        lastUpdated={fnbData.lastUpdated}
        onRefresh={fnbData.refresh}
      />

      {/* Mobile Contact Footer - Simplified */}
      <div className="text-center py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">
          Data refreshes automatically every 30 seconds
        </p>
        <div className="flex justify-center gap-4 text-xs text-gray-400">
          <span>Units: {unitsData.lastUpdated?.toLocaleTimeString()}</span>
          <span>Menu: {fnbData.lastUpdated?.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  )
}

// Enhanced Desktop Layout with proper types
function DesktopLayout({ 
  subdomain, 
  locationInfo,
  unitsData,
  fnbData,
  locations,
  selectedLocation,
  hasMultipleLocations,
  onSwitchLocation,
  onShowSelector
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto p-6 space-y-8 max-w-7xl">
        
        {/* Location Switcher for Desktop - Remove since it's now in UnitsCard */}

        {/* PRIORITY ORDER: Units First (most important) */}
        <UnitsCard
          units={unitsData.units}
          loading={unitsData.loading}
          lastUpdated={unitsData.lastUpdated}
          onRefresh={unitsData.refresh}
          locationInfo={locationInfo}
          locations={locations}
          selectedLocation={selectedLocation}
          hasMultipleLocations={hasMultipleLocations}
          onSwitchLocation={onSwitchLocation}
          onShowSelector={onShowSelector}
        />
        
        {/* F&B Second (also important for revenue) */}
        <FnbCard
          categories={fnbData.categories}
          loading={fnbData.loading}
          lastUpdated={fnbData.lastUpdated}
          onRefresh={fnbData.refresh}
        />
      </div>
    </div>
  )
}