'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  GamepadIcon, 
  Clock, 
  Wrench, 
  AlertTriangle,
  Gamepad2,
  Package,
  Users,
  Zap,
  Timer,
  MapPin,
  RefreshCw,
  ChevronDown,
  Building2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Unit } from '@/hooks/use-units-data'
import { LocationData } from '@/hooks/use-locations'
import { GamesTooltip } from './games-tooltip'
import { LocationSwitcher } from './location-switcher'

interface UnitsCardProps {
  units: Unit[]
  loading: boolean
  lastUpdated: Date | null
  onRefresh: () => void
  locationInfo: {
    name: string
    address: string
    operationalHours?: Record<string, { open: string; close: string }>
    latitude?: number
    longitude?: number
  }
  // New props for location management
  locations?: LocationData[]
  selectedLocation?: LocationData | null
  hasMultipleLocations?: boolean
  onSwitchLocation?: (location: LocationData) => void
  onShowSelector?: () => void
}

export function UnitsCard({ 
  units, 
  loading, 
  lastUpdated, 
  onRefresh,
  locationInfo,
  locations = [],
  selectedLocation,
  hasMultipleLocations = false,
  onSwitchLocation,
  onShowSelector
}: UnitsCardProps) {
  
  const getStatusConfig = (status: string, remainingMinutes?: number) => {
    switch (status) {
      case 'available':
        return {
          icon: <Zap className="w-4 h-4" />,
          badge: (
            <Badge className="bg-emerald-500 text-white border-emerald-600 shadow-sm">
              <Zap className="w-3 h-3 mr-1" />
              Available Now
            </Badge>
          ),
          cardClass: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 hover:shadow-lg",
          headerClass: "text-emerald-700"
        }
      case 'occupied':
        return {
          icon: <Timer className="w-4 h-4" />,
          badge: (
            <Badge className="bg-orange-500 text-white border-orange-600 shadow-sm">
              <Timer className="w-3 h-3 mr-1" />
              {remainingMinutes ? `${remainingMinutes}m left` : 'In Use'}
            </Badge>
          ),
          cardClass: "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50",
          headerClass: "text-orange-700"
        }
      case 'maintenance':
        return {
          icon: <Wrench className="w-4 h-4" />,
          badge: (
            <Badge className="bg-yellow-500 text-white border-yellow-600 shadow-sm">
              <Wrench className="w-3 h-3 mr-1" />
              Maintenance
            </Badge>
          ),
          cardClass: "border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50",
          headerClass: "text-yellow-700"
        }
      case 'broken':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          badge: (
            <Badge className="bg-red-500 text-white border-red-600 shadow-sm">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Out of Order
            </Badge>
          ),
          cardClass: "border-red-200 bg-gradient-to-br from-red-50 to-pink-50",
          headerClass: "text-red-700"
        }
      default:
        return {
          icon: <Gamepad2 className="w-4 h-4" />,
          badge: <Badge variant="secondary">Unknown</Badge>,
          cardClass: "border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50",
          headerClass: "text-gray-700"
        }
    }
  }

  // Group units by status for better organization
  const availableUnits = units.filter(u => u.status === 'available')
  const occupiedUnits = units.filter(u => u.status === 'occupied')
  const maintenanceUnits = units.filter(u => u.status === 'maintenance')
  const brokenUnits = units.filter(u => u.status === 'broken')

  const UnitCard = ({ unit }: { unit: Unit }) => {
    const config = getStatusConfig(unit.status, unit.remainingMinutes)
    
    return (
      <Card className={`${config.cardClass} border-2 shadow-md transition-all duration-200 h-full transform hover:scale-[1.02]`}>
        <CardContent className="p-6 h-full flex flex-col">
          {/* Header with status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg bg-white shadow-sm ${config.headerClass}`}>
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-bold text-lg ${config.headerClass}`}>
                  {unit.customerDisplayName || unit.name}
                </h3>
                <p className="text-sm text-gray-600 font-medium">
                  {unit.consoleType}
                </p>
              </div>
            </div>
            {config.badge}
          </div>

          {/* Unit Details */}
          <div className="space-y-3 flex-grow">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span className="font-medium">
                {unit.controllerCount} Controller{unit.controllerCount > 1 ? 's' : ''}
              </span>
            </div>

            {/* Enhanced Pricing Information */}
            <div className="bg-white/80 rounded-lg p-4 border border-white shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Hourly Rate</span>
                  <span className="font-bold text-xl text-gray-900">
                    {formatCurrency(unit.hourlyRate)}/hour
                  </span>
                </div>
                
                {/* Package Pricing */}
                {unit.specifications?.packageRates && Object.keys(unit.specifications.packageRates).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 mb-2">
                      <Package className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">Package Deals</span>
                    </div>
                    <div className="bg-blue-50 rounded-md p-3 space-y-1">
                      {Object.entries(unit.specifications.packageRates as Record<string, number>).map(([duration, price]) => (
                        <div key={duration} className="flex justify-between text-sm">
                          <span className="text-blue-700 font-medium">{duration.replace('hours', 'h')}</span>
                          <span className="font-bold text-blue-800">{formatCurrency(price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Remaining Time for Occupied Units */}
            {unit.status === 'occupied' && unit.remainingMinutes && (
              <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Time Remaining</p>
                    <p className="text-lg font-bold text-orange-900">{unit.remainingMinutes} minutes</p>
                  </div>
                </div>
              </div>
            )}

            {/* Available Games with Enhanced Tooltip */}
            {unit.specifications?.games && Array.isArray(unit.specifications.games) && unit.specifications.games.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-200">
                <p className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-1">
                  <Gamepad2 className="w-4 h-4" />
                  Available Games
                </p>
                <GamesTooltip games={unit.specifications.games} maxVisible={3} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const SectionHeader = ({ title, count, icon }: { title: string; count: number; icon: React.ReactNode }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-3 bg-white rounded-xl shadow-md">
        {icon}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{count} unit{count !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )

  if (loading && units.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Location Header with Integrated Switcher */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            
            {/* Main Header Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-blue-500 rounded-xl shadow-md">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold text-blue-900">
                      🎮 Gaming Units
                    </h1>
                    {hasMultipleLocations && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        <Building2 className="w-3 h-3 mr-1" />
                        {locations.length} locations
                      </Badge>
                    )}
                  </div>
                  <p className="text-blue-700 text-lg">{locationInfo.name}</p>
                  <p className="text-blue-600 text-sm">{locationInfo.address}</p>
                </div>
              </div>
              
              <div className="flex flex-col md:items-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {lastUpdated && (
                  <p className="text-xs text-blue-600">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            {/* Location Switcher Row - Prominently Displayed */}
            {hasMultipleLocations && selectedLocation && onSwitchLocation && (
              <div className="border-t border-blue-200 pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Choose Location to View Units:
                  </span>
                </div>
                <LocationSwitcher
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onSwitchLocation={onSwitchLocation}
                  onShowSelector={onShowSelector}
                  className="max-w-md"
                />
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-blue-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{availableUnits.length}</div>
                <div className="text-xs text-gray-600">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{occupiedUnits.length}</div>
                <div className="text-xs text-gray-600">In Use</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{maintenanceUnits.length}</div>
                <div className="text-xs text-gray-600">Maintenance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{brokenUnits.length}</div>
                <div className="text-xs text-gray-600">Out of Order</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Units - PRIORITY #1 */}
      {availableUnits.length > 0 && (
        <div>
          <SectionHeader 
            title="🎮 Available Now" 
            count={availableUnits.length}
            icon={<Zap className="w-6 h-6 text-emerald-600" />}
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableUnits.map((unit) => (
              <UnitCard key={unit.id} unit={unit} />
            ))}
          </div>
        </div>
      )}

      {/* Occupied Units */}
      {occupiedUnits.length > 0 && (
        <div>
          <SectionHeader 
            title="⏱️ Currently Playing" 
            count={occupiedUnits.length}
            icon={<Timer className="w-6 h-6 text-orange-600" />}
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {occupiedUnits.map((unit) => (
              <UnitCard key={unit.id} unit={unit} />
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Units */}
      {maintenanceUnits.length > 0 && (
        <div>
          <SectionHeader 
            title="🔧 Under Maintenance" 
            count={maintenanceUnits.length}
            icon={<Wrench className="w-6 h-6 text-yellow-600" />}
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {maintenanceUnits.map((unit) => (
              <UnitCard key={unit.id} unit={unit} />
            ))}
          </div>
        </div>
      )}

      {/* Broken Units */}
      {brokenUnits.length > 0 && (
        <div>
          <SectionHeader 
            title="⚠️ Out of Order" 
            count={brokenUnits.length}
            icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {brokenUnits.map((unit) => (
              <UnitCard key={unit.id} unit={unit} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {units.length === 0 && !loading && (
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <Gamepad2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Gaming Units</h3>
            <p className="text-gray-500 mb-6">Please check back later or contact us directly.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}