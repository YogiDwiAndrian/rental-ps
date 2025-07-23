// src/components/customer/mobile-units.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Wifi, WifiOff, ChevronDown, ChevronUp, Gamepad2, Clock, Users } from "lucide-react"
import { useUnitsData, Unit } from '@/hooks/use-units-data'
import { formatCurrency } from '@/lib/utils'

interface MobileUnitsProps {
  subdomain: string
  initialUnits: Unit[]
}

export default function MobileUnits({ subdomain, initialUnits }: MobileUnitsProps) {
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'available' | 'occupied' | 'all'>('available')

  const {
    units,
    stats,
    groupedUnits,
    isPolling,
    isOnline,
    error,
    lastUpdated,
    refresh,
    formatRemainingTime
  } = useUnitsData({
    subdomain,
    initialData: initialUnits,
    pollingInterval: 30000,
    enabled: true
  })

  const getTabUnits = () => {
    switch (activeTab) {
      case 'available':
        return groupedUnits.available
      case 'occupied':
        return groupedUnits.occupied
      case 'all':
        return units
      default:
        return groupedUnits.available
    }
  }

  const getTabBadgeVariant = (tab: string) => {
    return activeTab === tab ? 'default' : 'outline'
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        {/* Header dengan connection status */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <Gamepad2 className="w-5 h-5" />
              Gaming Units
            </CardTitle>
            <CardDescription className="text-sm">
              {isOnline ? 'Live status • Auto-refresh 30s' : 'Connection lost'}
            </CardDescription>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={isPolling}
            className="ml-2"
          >
            <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-3 bg-green-50 rounded-lg border">
            <div className="text-xl font-bold text-green-600">{stats.available}</div>
            <div className="text-xs text-green-700 font-medium">Available</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border">
            <div className="text-xl font-bold text-red-600">{stats.occupied}</div>
            <div className="text-xs text-red-700 font-medium">Playing</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border">
            <div className="text-xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-blue-700 font-medium">Total</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={getTabBadgeVariant('available')}
            size="sm"
            onClick={() => setActiveTab('available')}
            className="flex-1"
          >
            🟢 Available ({stats.available})
          </Button>
          <Button
            variant={getTabBadgeVariant('occupied')}
            size="sm"
            onClick={() => setActiveTab('occupied')}
            className="flex-1"
          >
            🔴 Playing ({stats.occupied})
          </Button>
          <Button
            variant={getTabBadgeVariant('all')}
            size="sm"
            onClick={() => setActiveTab('all')}
            className="flex-1"
          >
            All ({stats.total})
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Connection Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Connection Error</span>
            </div>
            <div className="text-red-600 text-xs mt-1">{error}</div>
          </div>
        )}

        {/* Empty State */}
        {getTabUnits().length === 0 && (
          <div className="text-center py-8">
            <Gamepad2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <div className="text-gray-500 font-medium">
              {activeTab === 'available' ? 'No units available' :
               activeTab === 'occupied' ? 'No units currently playing' :
               'No gaming units found'}
            </div>
            <div className="text-gray-400 text-sm mt-1">
              {activeTab === 'available' ? 'Check back in a few minutes' :
               activeTab === 'occupied' ? 'All units are free to play!' :
               'Contact us for more information'}
            </div>
          </div>
        )}

        {/* Units List */}
        <div className="space-y-2">
          {getTabUnits().map((unit) => (
            <MobileUnitCard
              key={unit.id}
              unit={unit}
              isExpanded={expandedUnit === unit.id}
              onToggle={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
              formatRemainingTime={formatRemainingTime}
              isPolling={isPolling}
            />
          ))}
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-center pt-3 border-t">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Wifi className="w-3 h-3" />
              <span>Updated: {lastUpdated.toLocaleTimeString('id-ID')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Mobile-optimized unit card
interface MobileUnitCardProps {
  unit: Unit
  isExpanded: boolean
  onToggle: () => void
  formatRemainingTime: (minutes: number | null) => string | null
  isPolling: boolean
}

function MobileUnitCard({ 
  unit, 
  isExpanded, 
  onToggle, 
  formatRemainingTime,
  isPolling 
}: MobileUnitCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-50 border-green-200'
      case 'occupied': return 'bg-red-50 border-red-200'
      case 'maintenance': return 'bg-yellow-50 border-yellow-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return { variant: 'default' as const, text: '🟢 Available', color: 'text-green-700' }
      case 'occupied': return { variant: 'destructive' as const, text: '🔴 Playing', color: 'text-red-700' }
      case 'maintenance': return { variant: 'secondary' as const, text: '🟡 Maintenance', color: 'text-yellow-700' }
      default: return { variant: 'outline' as const, text: '⚫ Offline', color: 'text-gray-700' }
    }
  }

  const statusConfig = getStatusBadge(unit.status)

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${getStatusColor(unit.status)} ${isPolling ? 'opacity-80' : ''}`}>
      {/* Main Card - Always Visible */}
      <div 
        className="p-4 cursor-pointer active:bg-black/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Unit Name & Status */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-base truncate">{unit.name}</h3>
              <Badge variant={statusConfig.variant} className="text-xs shrink-0">
                {statusConfig.text}
              </Badge>
            </div>
            
            {/* Key Info Row */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <span className="truncate">{unit.consoleType}</span>
                <span className="text-green-600 font-semibold">
                  {formatCurrency(unit.hourlyRate)}/hr
                </span>
              </div>
              
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            {/* Remaining Time (Prominent for Occupied) */}
            {unit.status === 'occupied' && unit.remainingMinutes !== null && (
              <div className="mt-2 flex items-center gap-1 text-red-600 font-medium text-sm">
                <Clock className="w-3 h-3" />
                {formatRemainingTime(unit.remainingMinutes)}
              </div>
            )}

            {unit.status === 'occupied' && unit.remainingMinutes === null && (
              <div className="mt-2 flex items-center gap-1 text-orange-600 font-medium text-sm">
                <Clock className="w-3 h-3" />
                Timer mode
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t bg-white/50">
          <div className="space-y-3 pt-3">
            {/* Detailed Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Multiplayer:</span>
              </div>
              <Badge variant="outline" className="text-xs justify-self-end">
                {unit.controllerCount === 1 ? 'Single Player' : 
                 unit.controllerCount === 2 ? 'Up to 2 Players' :
                 unit.controllerCount === 4 ? 'Party (4 Players)' : 
                 `${unit.controllerCount} Controllers`}
              </Badge>
            </div>
            
            {/* Status-specific Info Cards */}
            {unit.status === 'available' && (
              <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                <div className="text-green-700 font-medium text-sm flex items-center gap-1">
                  ✅ Ready to Play
                </div>
                <div className="text-green-600 text-xs mt-1">Come and enjoy gaming!</div>
              </div>
            )}

            {unit.status === 'occupied' && (
              <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                <div className="text-red-700 font-medium text-sm">
                  🎮 Currently Playing
                </div>
                <div className="text-red-600 text-xs mt-1">
                  {unit.remainingMinutes ? 'Check back later or wait for availability' : 'Pay-per-minute billing'}
                </div>
              </div>
            )}

            {unit.status === 'maintenance' && (
              <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                <div className="text-yellow-700 font-medium text-sm">🔧 Under Maintenance</div>
                <div className="text-yellow-600 text-xs mt-1">Will be available soon</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}