// src/components/customer/realtime-units.tsx
'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Wifi, WifiOff } from "lucide-react"
import { usePolling } from '@/hooks/use-polling'
import { formatCurrency } from '@/lib/utils'

interface Unit {
  id: string
  name: string
  consoleType: string
  controllerCount: number
  status: 'available' | 'occupied' | 'maintenance' | 'broken'
  hourlyRate: number
  remainingMinutes: number | null
  estimatedEndTime: string | null
  locationName: string
}

interface RealtimeUnitsProps {
  subdomain: string
  initialUnits: Unit[]
}

export default function RealtimeUnits({ subdomain, initialUnits }: RealtimeUnitsProps) {
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  // Fetch units data
  const fetchUnits = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/${subdomain}/units`, {
        cache: 'no-cache'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setUnits(data.data.units)
        setError(null)
        setIsOnline(true)
      } else {
        throw new Error(data.error || 'Failed to fetch units')
      }
    } catch (err) {
      console.error('Error fetching units:', err)
      setError(err instanceof Error ? err.message : 'Network error')
      setIsOnline(false)
    }
  }, [subdomain])

  // Setup polling every 30 seconds
  const { isPolling, lastUpdated, refresh } = usePolling(fetchUnits, {
    interval: 30000, // 30 seconds
    enabled: true,
    immediate: false // Don't run immediately since we have initial data
  })

  // Format remaining time
  const formatRemainingTime = (minutes: number | null) => {
    if (minutes === null) return null
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m left`
    } else {
      return `${mins}m left`
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              Gaming Units Status
              {isOnline ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
            </CardTitle>
            <CardDescription>
              {isOnline ? 'Real-time availability • Auto-refresh every 30 seconds' : 'Connection lost • Check your internet'}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated: {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isPolling}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isPolling ? 'animate-spin' : ''}`} />
              {isPolling ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Connection Error</span>
            </div>
            <div className="text-red-600 text-xs mt-1">{error}</div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {units.map((unit) => (
            <div
              key={unit.id}
              className={`border rounded-lg p-4 transition-all duration-300 ${
                isPolling ? 'opacity-80' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">{unit.name}</h3>
                <Badge 
                  variant={
                    unit.status === 'available' ? 'default' :
                    unit.status === 'occupied' ? 'destructive' :
                    unit.status === 'maintenance' ? 'secondary' : 'outline'
                  }
                  className="animate-pulse"
                >
                  {unit.status === 'available' ? '🟢 Available' :
                   unit.status === 'occupied' ? '🔴 Occupied' :
                   unit.status === 'maintenance' ? '🟡 Maintenance' : '⚫ Offline'}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Console:</span>
                  <span className="font-medium">{unit.consoleType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Controllers:</span>
                  <span className="font-medium">{unit.controllerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(unit.hourlyRate)}/hour
                  </span>
                </div>
                
                {unit.status === 'occupied' && unit.remainingMinutes !== null && (
                  <div className="mt-3 p-2 bg-red-50 rounded border-l-4 border-red-400">
                    <div className="text-red-700 font-medium">⏱️ Time Remaining</div>
                    <div className="text-red-600 text-lg font-bold">
                      {formatRemainingTime(unit.remainingMinutes)}
                    </div>
                  </div>
                )}
                
                {unit.status === 'occupied' && unit.remainingMinutes === null && (
                  <div className="mt-3 p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                    <div className="text-orange-700 font-medium">🕐 Timer Mode</div>
                    <div className="text-orange-600">Pay when finished</div>
                  </div>
                )}
                
                {unit.status === 'available' && (
                  <div className="mt-3 p-2 bg-green-50 rounded border-l-4 border-green-400">
                    <div className="text-green-700 font-medium">✅ Ready to Play</div>
                    <div className="text-green-600">Come and enjoy gaming!</div>
                  </div>
                )}

                {unit.status === 'maintenance' && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                    <div className="text-yellow-700 font-medium">🔧 Under Maintenance</div>
                    <div className="text-yellow-600">Will be available soon</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {units.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">🎮</div>
            <div>No gaming units available</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}