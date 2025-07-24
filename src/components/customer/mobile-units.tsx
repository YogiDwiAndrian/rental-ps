'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  ChevronDown, 
  ChevronUp, 
  GamepadIcon, 
  Clock, 
  Wrench, 
  AlertTriangle,
  RefreshCw,
  Gamepad2,
  Monitor,
  Package,
  Users,
  Star,
  Zap,
  Info
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Unit } from '@/hooks/use-units-data'

interface MobileUnitsProps {
  groupedUnits: {
    available: Unit[]
    occupied: Unit[]
    maintenance: Unit[]
    broken: Unit[]
  }
  loading: boolean
  lastUpdated: Date | null
  onRefresh: () => void
}

export function MobileUnits({ groupedUnits, loading, lastUpdated, onRefresh }: MobileUnitsProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    available: true, // Available units always open by default
    occupied: false,
    maintenance: false,
    broken: false
  })

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <Zap className="w-4 h-4" />
      case 'occupied': return <GamepadIcon className="w-4 h-4" />
      case 'maintenance': return <Wrench className="w-4 h-4" />
      case 'broken': return <AlertTriangle className="w-4 h-4" />
      default: return <Monitor className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string, remainingMinutes?: number) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500 text-white border-green-600">Available Now</Badge>
      case 'occupied':
        return (
          <Badge className="bg-orange-500 text-white border-orange-600">
            {remainingMinutes ? `${remainingMinutes}m left` : 'In Use'}
          </Badge>
        )
      case 'maintenance':
        return <Badge className="bg-yellow-500 text-white border-yellow-600">Maintenance</Badge>
      case 'broken':
        return <Badge className="bg-red-500 text-white border-red-600">Out of Order</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  // Helper functions to check if data exists
  const hasPackageRates = (unit: Unit) => {
    return unit.specifications?.packageRates && 
           typeof unit.specifications.packageRates === 'object' && 
           Object.keys(unit.specifications.packageRates).length > 0
  }

  const hasGames = (unit: Unit) => {
    return unit.specifications?.games && 
           Array.isArray(unit.specifications.games) && 
           unit.specifications.games.length > 0
  }

  const hasSpecs = (unit: Unit) => {
    return unit.specifications?.storage || 
           unit.specifications?.resolution || 
           (unit.specifications?.features && Array.isArray(unit.specifications.features) && unit.specifications.features.length > 0)
  }

  const hasDetailedInfo = (unit: Unit) => {
    return hasPackageRates(unit) || hasGames(unit) || hasSpecs(unit)
  }

  const UnitCard = ({ unit }: { unit: Unit }) => {
    const [showDetails, setShowDetails] = useState(false)
    const [showAllGames, setShowAllGames] = useState(false)
    
    return (
      <Card className="border-0 shadow-md mb-4 bg-white overflow-hidden">
        <CardContent className="p-0">
          {/* Unit Header - Always Visible */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-gray-900">
                    {unit.customerDisplayName || unit.name}
                  </h4>
                  <p className="text-sm text-gray-600 font-medium">{unit.consoleType}</p>
                </div>
              </div>
              {getStatusBadge(unit.status, unit.remainingMinutes)}
            </div>

            {/* Basic Info - Always Visible */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {unit.controllerCount} Controller{unit.controllerCount > 1 ? 's' : ''}
                </span>
              </div>
              
              {/* Basic Hourly Rate - Always Visible */}
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(unit.hourlyRate)}
                </p>
                <p className="text-xs text-gray-500">per hour</p>
              </div>
            </div>

            {/* Remaining Time for Occupied Units - Always Visible */}
            {unit.status === 'occupied' && unit.remainingMinutes && (
              <div className="bg-orange-100 border border-orange-200 rounded-lg p-3 mt-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Time Remaining</p>
                    <p className="text-lg font-bold text-orange-900">{unit.remainingMinutes} minutes</p>
                  </div>
                </div>
              </div>
            )}

            {/* Show Details Button - Only if there's detailed info */}
            {hasDetailedInfo(unit) && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Info className="w-4 h-4 mr-2" />
                  {showDetails ? 'Hide Details' : 'Show Details'}
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4 ml-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-2" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Detailed Information - Collapsible */}
          {hasDetailedInfo(unit) && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleContent>
                
                {/* Package Pricing - Only if exists */}
                {hasPackageRates(unit) && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-t border-gray-100">
                    <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-500" />
                      💎 Package Deals
                      <Badge className="bg-blue-100 text-blue-800 text-xs">Save More!</Badge>
                    </h5>
                    
                    <div className="space-y-2">
                      {Object.entries(unit.specifications!.packageRates as Record<string, number>)
                        .sort(([a], [b]) => {
                          const aHours = parseInt(a.replace(/\D/g, ''))
                          const bHours = parseInt(b.replace(/\D/g, ''))
                          return aHours - bHours
                        })
                        .map(([duration, price]) => {
                        const hourlyEquivalent = unit.hourlyRate * parseInt(duration.replace(/\D/g, ''))
                        const savings = hourlyEquivalent - price
                        const savingsPercent = Math.round((savings / hourlyEquivalent) * 100)
                        
                        return (
                          <div key={duration} className="bg-white rounded-lg p-3 border border-blue-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-bold text-blue-800">
                                  {duration.replace('hours', 'h').replace('hour', 'h')}
                                </p>
                                {savings > 0 && (
                                  <p className="text-xs text-green-600 font-medium">
                                    Save {savingsPercent}% ({formatCurrency(savings)})
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-blue-600">
                                  {formatCurrency(price)}
                                </p>
                                {savings > 0 && (
                                  <p className="text-xs text-gray-500 line-through">
                                    {formatCurrency(hourlyEquivalent)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Games Section - Only if exists */}
                {hasGames(unit) && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-t border-gray-100">
                    <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      🎮 Available Games
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        {unit.specifications!.games!.length} games
                      </Badge>
                    </h5>
                    
                    {/* Show first 3 games */}
                    <div className="space-y-2 mb-3">
                      {unit.specifications!.games!.slice(0, 3).map((game, index) => (
                        <div key={index} className="bg-white rounded-lg p-2 border border-purple-200">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-800">{game}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show more games button - Only if more than 3 games */}
                    {unit.specifications!.games!.length > 3 && (
                      <Collapsible open={showAllGames} onOpenChange={setShowAllGames}>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full border-purple-200 text-purple-700 hover:bg-purple-100"
                          >
                            {showAllGames ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Show Less Games
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                Show {unit.specifications!.games!.length - 3} More Games
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="space-y-2 mt-3">
                          {unit.specifications!.games!.slice(3).map((game, index) => (
                            <div key={index + 3} className="bg-white rounded-lg p-2 border border-purple-200">
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium text-gray-800">{game}</span>
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                )}

                {/* Specifications - Only if exists */}
                {hasSpecs(unit) && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      ⚙️ Specifications
                    </h5>
                    
                    <div className="space-y-2 text-sm">
                      {unit.specifications?.storage && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Storage:</span>
                          <span className="font-medium text-gray-900">{unit.specifications.storage}</span>
                        </div>
                      )}
                      
                      {unit.specifications?.resolution && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Resolution:</span>
                          <span className="font-medium text-gray-900">{unit.specifications.resolution}</span>
                        </div>
                      )}
                      
                      {unit.specifications?.features && Array.isArray(unit.specifications.features) && unit.specifications.features.length > 0 && (
                        <div>
                          <span className="text-gray-600 block mb-1">Features:</span>
                          <div className="flex flex-wrap gap-1">
                            {unit.specifications.features.map((feature, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    )
  }

  const UnitSection = ({ 
    title, 
    units, 
    sectionKey, 
    icon, 
    defaultOpen = false 
  }: {
    title: string
    units: Unit[]
    sectionKey: string
    icon: React.ReactNode
    defaultOpen?: boolean
  }) => {
    if (units.length === 0) return null

    return (
      <Collapsible
        open={openSections[sectionKey]}
        onOpenChange={() => toggleSection(sectionKey)}
      >
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-4 h-auto bg-gray-50 hover:bg-gray-100 mb-2 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <div className="text-white">
                  {icon}
                </div>
              </div>
              <div className="text-left">
                <span className="font-bold text-gray-900">{title}</span>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {units.length} unit{units.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>
            {openSections[sectionKey] ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-0 mb-4">
          {units.map((unit) => (
            <UnitCard key={unit.id} unit={unit} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <GamepadIcon className="h-5 w-5 text-blue-600" />
              Gaming Units
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {lastUpdated && (
            <p className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Available Units - Always expanded for easy access */}
      <UnitSection
        title="🎮 Available Now"
        units={groupedUnits.available}
        sectionKey="available"
        icon={<Zap className="w-5 h-5" />}
        defaultOpen={true}
      />

      {/* Occupied Units - Collapsible */}
      <UnitSection
        title="⏱️ Currently Playing"
        units={groupedUnits.occupied}
        sectionKey="occupied"
        icon={<GamepadIcon className="w-5 h-5" />}
      />

      {/* Maintenance Units - Collapsible */}
      <UnitSection
        title="🔧 Under Maintenance"
        units={groupedUnits.maintenance}
        sectionKey="maintenance"
        icon={<Wrench className="w-5 h-5" />}
      />

      {/* Broken Units - Collapsible */}
      <UnitSection
        title="⚠️ Out of Order"
        units={groupedUnits.broken}
        sectionKey="broken"
        icon={<AlertTriangle className="w-5 h-5" />}
      />

      {/* Empty State */}
      {Object.values(groupedUnits).every(group => group.length === 0) && !loading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Units Available</h3>
            <p className="text-gray-500">Please check back later or contact the store.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}