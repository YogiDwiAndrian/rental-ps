'use client'

import { useMobileDetection } from '@/hooks/use-mobile-detection'
import { useUnitsData } from '@/hooks/use-units-data'
import { useFnbData } from '@/hooks/use-fnb-data'

// Mobile components
import { MobileStats } from './mobile-stats'
import { MobileUnits } from './mobile-units'
import { MobileFnb } from './mobile-fnb'

// Desktop components (existing)
import { RealtimeUnits } from './realtime-units'
import { RealtimeFnb } from './realtime-fnb'

interface ResponsiveWrapperProps {
  subdomain: string
}

export function ResponsiveWrapper({ subdomain }: ResponsiveWrapperProps) {
  const { isMobile, isDesktop, isLoading } = useMobileDetection()
  const unitsData = useUnitsData(subdomain)
  const fnbData = useFnbData(subdomain)

  // Show loading state while detecting device type
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <MobileLayout 
        subdomain={subdomain}
        unitsData={unitsData}
        fnbData={fnbData}
      />
    )
  }

  if (isDesktop) {
    return (
      <DesktopLayout subdomain={subdomain} />
    )
  }

  // Fallback to desktop layout
  return <DesktopLayout subdomain={subdomain} />
}

// Mobile Layout Component
function MobileLayout({ 
  subdomain, 
  unitsData, 
  fnbData 
}: {
  subdomain: string
  unitsData: ReturnType<typeof useUnitsData>
  fnbData: ReturnType<typeof useFnbData>
}) {
  return (
    <div className="container mx-auto p-4 space-y-6 max-w-md">
      {/* Mobile Header with Quick Stats */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🎮 {subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Gaming
        </h1>
        <p className="text-sm text-gray-600">
          Live unit status & menu • Auto-refreshed
        </p>
      </div>

      {/* Quick Stats Cards */}
      <MobileStats 
        unitsStats={unitsData.stats}
        fnbStats={fnbData.stats}
      />

      {/* Mobile Units Section */}
      <MobileUnits
        groupedUnits={unitsData.groupedUnits}
        loading={unitsData.loading}
        lastUpdated={unitsData.lastUpdated}
        onRefresh={unitsData.refresh}
      />

      {/* Mobile F&B Section */}
      <MobileFnb
        categories={fnbData.categories}
        loading={fnbData.loading}
        lastUpdated={fnbData.lastUpdated}
        onRefresh={fnbData.refresh}
      />

      {/* Mobile Footer */}
      <div className="text-center py-6 border-t border-gray-200 mt-8">
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

// Desktop Layout Component (uses existing components)
function DesktopLayout({ subdomain }: { subdomain: string }) {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Desktop Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🎮 {subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Gaming Center
        </h1>
        <p className="text-xl text-gray-600">
          Live Unit Status & F&B Menu
        </p>
      </div>

      {/* Existing Desktop Components */}
      <RealtimeUnits subdomain={subdomain} />
      <RealtimeFnb subdomain={subdomain} />
    </div>
  )
}