// src/components/customer/responsive-wrapper.tsx - Updated with Login Button
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
import { MobileFooter } from './mobile-footer'
import { LocationSelector } from './location-selector'
import { LocationSwitcher } from './location-switcher'
import { LoginButton } from './login-button' // NEW: Import login button

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
  availabilitySchedule?: {
    available24_7?: boolean
    workingHours?: Record<string, { start: string; end: string }>
    preferredHours?: string
  }
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
  } = useLocations(subdomain)
  
  // STABLE: Use selectedLocation.id consistently
  const currentLocationId = selectedLocation?.id
  
  // Data hooks with stable location ID
  const unitsData = useUnitsData(subdomain, currentLocationId)
  const fnbData = useFnbData(subdomain, currentLocationId)
  
  // FIXED: Use stable contact loading with proper location filtering
  const { 
    contacts: dynamicContacts, 
    loading: contactsLoading, 
    error: contactsError 
  } = useWhatsAppContacts(subdomain, currentLocationId)
  
  
  // Get location data for the selected location
  const locationData: LocationInfo | null = selectedLocation ? {
    name: selectedLocation.name,
    address: selectedLocation.address,
    phone: selectedLocation.phone,
    whatsapp: selectedLocation.phone,
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

  // STABLE: WhatsApp contacts preparation - use dynamic contacts directly
  const whatsappContacts: WhatsAppContactFormatted[] = []
  
  if (dynamicContacts.length > 0) {
    console.log(`✅ Using ${dynamicContacts.length} dynamic contacts for location: ${selectedLocation?.name || 'default'}`)
    
    dynamicContacts.forEach(contact => {
      whatsappContacts.push({
        name: contact.name,
        role: contact.role,
        number: contact.whatsappNumber,
        isOnline: contact.isOnline,
        responseTime: contact.responseTime,
        availabilitySchedule: contact.availabilitySchedule
      })
    })
  } else if (!contactsLoading) {
    // Only show fallback if not loading and no contacts found
    console.log('⚠️ No dynamic contacts found, using minimal fallback')
    
    whatsappContacts.push({
      name: 'Customer Service',
      role: 'staff',
      number: locationInfo.whatsapp || '+628123456789',
      isOnline: true,
      responseTime: '5 minutes'
    })
  }

  const lastUpdatedData: LastUpdatedData = {
    units: unitsData.lastUpdated,
    fnb: fnbData.lastUpdated
  }

  // STABLE: Only render WhatsApp button when we have contacts and not loading
  const shouldShowWhatsApp = whatsappContacts.length > 0 && !contactsLoading

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
        <MobileFooter 
          locationInfo={locationInfo}
          lastUpdated={lastUpdatedData}
        />
        {shouldShowWhatsApp && (
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
        {shouldShowWhatsApp && (
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
      {shouldShowWhatsApp && (
        <FloatingWhatsApp 
          contacts={whatsappContacts}
          locationName={locationInfo.name}
        />
      )}
    </>
  )
}

// Layout components with LOGIN BUTTON integrated
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
      
      {/* NEW: Mobile Header with Login Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🎮 Gaming Center
          </h1>
          <p className="text-xs text-gray-500">
            Live status • Auto-refreshed every 30s
          </p>
        </div>
        
        {/* Mobile Login Button - Top Right */}
        <div className="flex-shrink-0">
          <LoginButton subdomain={subdomain} className="ml-2" />
        </div>
      </div>
      
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

      <MobileStats 
        unitsStats={unitsData.stats}
        fnbStats={fnbData.stats}
      />

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
      
      {/* NEW: Desktop Header with Login Button */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            
            {/* Left: Logo/Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {locationInfo.name}
                </h1>
                <p className="text-sm text-gray-600">Live Gaming Status</p>
              </div>
            </div>
            
            {/* Right: Login Button */}
            <LoginButton subdomain={subdomain} />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="container mx-auto p-6 space-y-8 max-w-7xl">
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