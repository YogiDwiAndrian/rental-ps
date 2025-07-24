'use client'

import { useMobileDetection } from '@/hooks/use-mobile-detection'
import { useUnitsData } from '@/hooks/use-units-data'
import { useFnbData } from '@/hooks/use-fnb-data'
import { useLocationData } from '@/hooks/use-location-data'
import { UnitsCard } from './units-card'
import { FnbCard } from './fnb-card'

// Mobile components (existing)
import { MobileStats } from './mobile-stats'
import { MobileUnits } from './mobile-units'
import { MobileFnb } from './mobile-fnb'

interface ResponsiveWrapperProps {
  subdomain: string
}

export function ResponsiveWrapper({ subdomain }: ResponsiveWrapperProps) {
  const { isMobile, isDesktop, isLoading: deviceLoading } = useMobileDetection()
  const { locationData, loading: locationLoading } = useLocationData(subdomain)
  const unitsData = useUnitsData(subdomain)
  const fnbData = useFnbData(subdomain)

  // Show loading state while detecting device type or loading location
  if (deviceLoading || locationLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gaming center information...</p>
        </div>
      </div>
    )
  }

  const locationInfo = locationData || {
    name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Gaming Center`,
    address: `Jl. Gaming Street, \${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}`,
    phone: '+628',
    whatsapp: '+628'
  }

  if (isMobile) {
    return (
      <MobileLayout 
        subdomain={subdomain}
        locationInfo={locationInfo}
        unitsData={unitsData}
        fnbData={fnbData}
      />
    )
  }

  if (isDesktop) {
    return (
      <DesktopLayout 
        subdomain={subdomain} 
        locationInfo={locationInfo}
        unitsData={unitsData}
        fnbData={fnbData}
      />
    )
  }

  // Fallback to desktop layout
  return (
    <DesktopLayout 
      subdomain={subdomain} 
      locationInfo={locationInfo}
      unitsData={unitsData}
      fnbData={fnbData}
    />
  )
}

// Mobile Layout Component (same as before)
function MobileLayout({ 
  subdomain, 
  locationInfo,
  unitsData, 
  fnbData 
}: {
  subdomain: string
  locationInfo: { name: string; address: string; phone?: string; whatsapp?: string }
  unitsData: ReturnType<typeof useUnitsData>
  fnbData: ReturnType<typeof useFnbData>
}) {
  return (
    <div className="container mx-auto p-4 space-y-6 max-w-md">
      {/* Mobile Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🎮 {locationInfo.name}
        </h1>
        <p className="text-sm text-gray-600 mb-3">
          {locationInfo.address}
        </p>
        <p className="text-xs text-gray-500">
          Live status • Auto-refreshed every 30s
        </p>
      </div>

      {/* Quick Stats */}
      <MobileStats 
        unitsStats={unitsData.stats}
        fnbStats={fnbData.stats}
      />

      {/* Mobile Units */}
      <MobileUnits
        groupedUnits={unitsData.groupedUnits}
        loading={unitsData.loading}
        lastUpdated={unitsData.lastUpdated}
        onRefresh={unitsData.refresh}
      />

      {/* Mobile F&B */}
      <MobileFnb
        categories={fnbData.categories}
        loading={fnbData.loading}
        lastUpdated={fnbData.lastUpdated}
        onRefresh={fnbData.refresh}
      />

      {/* Mobile Contact Footer */}
      <div className="text-center py-6 border-t border-gray-200 mt-8">
        <div className="flex justify-center gap-3 mb-4">
          {locationInfo.whatsapp && (
            <button 
              onClick={() => {
                const message = encodeURIComponent(`Hi! Saya tertarik untuk bermain di \${locationInfo.name}`)
                window.open(`https://wa.me/${locationInfo.whatsapp?.replace(/[^0-9]/g, '')}?text=${message}`, '_blank')
              }}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors shadow-md"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.688"/>
              </svg>
              WhatsApp
            </button>
          )}
          {locationInfo.phone && (
            <button 
              onClick={() => window.open(`tel:${locationInfo.phone}`, '_self')}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </button>
          )}
        </div>
        
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

//  Desktop Layout Component
function DesktopLayout({ 
  subdomain, 
  locationInfo,
  unitsData,
  fnbData
}: { 
  subdomain: string
  locationInfo: { name: string; address: string; phone?: string; whatsapp?: string }
  unitsData: ReturnType<typeof useUnitsData>
  fnbData: ReturnType<typeof useFnbData>
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto p-6 space-y-8 max-w-7xl">
        {/*  Desktop Components */}
        <UnitsCard
          units={unitsData.units}
          loading={unitsData.loading}
          lastUpdated={unitsData.lastUpdated}
          onRefresh={unitsData.refresh}
          locationInfo={locationInfo}
        />
        
        <FnbCard
          categories={fnbData.categories}
          loading={fnbData.loading}
          lastUpdated={fnbData.lastUpdated}
          onRefresh={fnbData.refresh}
          locationInfo={locationInfo}
        />
        
        {/* Desktop Footer */}
        <div className="text-center py-8 border-t border-gray-200 bg-white/50 rounded-xl backdrop-blur-sm">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {locationInfo.name}
            </h3>
            <p className="text-gray-600 mb-6">{locationInfo.address}</p>
            
            <div className="flex justify-center gap-4 mb-6">
              {locationInfo.whatsapp && (
                <button 
                  onClick={() => {
                    const message = encodeURIComponent(`Hi! Saya tertarik untuk bermain di ${locationInfo.name}`)
                    window.open(`https://wa.me/${locationInfo.whatsapp?.replace(/[^0-9]/g, '')}?text=${message}`, '_blank')
                  }}
                  className="flex items-center gap-3 bg-green-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.688"/>
                  </svg>
                  Contact via WhatsApp
                </button>
              )}
              {locationInfo.phone && (
                <button 
                  onClick={() => window.open(`tel:${locationInfo.phone}`, '_self')}
                  className="flex items-center gap-3 bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call {locationInfo.phone}
                </button>
              )}
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 inline-block">
              <p className="text-sm text-blue-800 font-medium mb-1">
                🔄 Live Data Updates
              </p>
              <p className="text-xs text-blue-600">
                Information refreshes automatically every 30 seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}