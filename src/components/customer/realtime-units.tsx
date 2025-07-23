'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { GamepadIcon, Clock, RefreshCw, Wrench, AlertTriangle, Gamepad2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useUnitsData } from '@/hooks/use-units-data'

interface RealtimeUnitsProps {
  subdomain: string
}

export function RealtimeUnits({ subdomain }: RealtimeUnitsProps) {
  const { units, loading, error, lastUpdated, refresh } = useUnitsData(subdomain)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <Clock className="w-4 h-4 text-green-600" />
      case 'occupied':
        return <GamepadIcon className="w-4 h-4 text-orange-600" />
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-yellow-600" />
      case 'broken':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Gamepad2 className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Available
          </Badge>
        )
      case 'occupied':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            In Use
          </Badge>
        )
      case 'maintenance':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Maintenance
          </Badge>
        )
      case 'broken':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Out of Order
          </Badge>
        )
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Connection Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refresh}
                className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <GamepadIcon className="h-6 w-6 text-blue-600" />
            Gaming Units
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {lastUpdated && (
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading && units.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-8">
            <Gamepad2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Units Available</h3>
            <p className="text-gray-500">Please check back later or contact the store.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {units.map((unit, index) => (
              <div key={unit.id}>
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(unit.status)}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900">
                        {unit.customerDisplayName || unit.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {unit.consoleType}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {unit.controllerCount} Controller{unit.controllerCount > 1 ? 's' : ''}
                      </p>
                      {unit.status === 'available' && (
                        <p className="text-sm font-semibold text-blue-600 mt-2">
                          {formatCurrency(unit.hourlyRate)}/hour
                        </p>
                      )}
                      {unit.remainingMinutes && unit.status === 'occupied' && (
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="w-3 h-3 text-orange-600" />
                          <span className="text-xs text-orange-600 font-medium">
                            {unit.remainingMinutes} minutes remaining
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(unit.status)}
                  </div>
                </div>
                {index < units.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}