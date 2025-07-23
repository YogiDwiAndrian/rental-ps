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
  Monitor
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
      case 'available': return <Clock className="w-4 h-4" />
      case 'occupied': return <GamepadIcon className="w-4 h-4" />
      case 'maintenance': return <Wrench className="w-4 h-4" />
      case 'broken': return <AlertTriangle className="w-4 h-4" />
      default: return <Monitor className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string, remainingMinutes?: number) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Available Now</Badge>
      case 'occupied':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            {remainingMinutes ? `${remainingMinutes}m left` : 'In Use'}
          </Badge>
        )
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Maintenance</Badge>
      case 'broken':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Out of Order</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const UnitCard = ({ unit }: { unit: Unit }) => (
    <Card className="border-0 shadow-sm mb-3 bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">
                {unit.customerDisplayName || unit.name}
              </h4>
              <p className="text-sm text-gray-500">{unit.consoleType}</p>
            </div>
          </div>
          {getStatusBadge(unit.status, unit.remainingMinutes)}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              {unit.controllerCount} Controller{unit.controllerCount > 1 ? 's' : ''}
            </span>
            {unit.status === 'available' && (
              <span className="font-semibold text-blue-600">
                {formatCurrency(unit.hourlyRate)}/hour
              </span>
            )}
          </div>
          
          {unit.remainingMinutes && unit.status === 'occupied' && (
            <div className="flex items-center gap-1 text-orange-600">
              <Clock className="w-3 h-3" />
              <span className="text-xs font-medium">{unit.remainingMinutes}m left</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

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
            className="w-full justify-between p-4 h-auto bg-gray-50 hover:bg-gray-100 mb-2"
          >
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-medium">{title}</span>
              <Badge variant="secondary" className="ml-2">
                {units.length}
              </Badge>
            </div>
            {openSections[sectionKey] ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
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
        title="Available Now"
        units={groupedUnits.available}
        sectionKey="available"
        icon={<Clock className="w-4 h-4 text-green-600" />}
        defaultOpen={true}
      />

      {/* Occupied Units - Collapsible */}
      <UnitSection
        title="Currently In Use"
        units={groupedUnits.occupied}
        sectionKey="occupied"
        icon={<GamepadIcon className="w-4 h-4 text-orange-600" />}
      />

      {/* Maintenance Units - Collapsible */}
      <UnitSection
        title="Under Maintenance"
        units={groupedUnits.maintenance}
        sectionKey="maintenance"
        icon={<Wrench className="w-4 h-4 text-yellow-600" />}
      />

      {/* Broken Units - Collapsible */}
      <UnitSection
        title="Out of Order"
        units={groupedUnits.broken}
        sectionKey="broken"
        icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
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