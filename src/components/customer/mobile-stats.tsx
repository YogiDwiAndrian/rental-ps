'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GamepadIcon, Clock, Wrench, Coffee, ShoppingCart, AlertTriangle } from 'lucide-react'

interface MobileStatsProps {
  unitsStats: {
    total: number
    available: number
    occupied: number
    maintenance: number
    broken: number
  }
  fnbStats: {
    total: number
    available: number
    outOfStock: number
    lowStock: number
  }
}

export function MobileStats({ unitsStats, fnbStats }: MobileStatsProps) {
  return (
    <div className="space-y-3 mb-6">
      {/* Units Quick Stats */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <GamepadIcon className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Gaming Units</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Available</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                <Clock className="w-3 h-3 mr-1" />
                {unitsStats.available}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">In Use</span>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                <GamepadIcon className="w-3 h-3 mr-1" />
                {unitsStats.occupied}
              </Badge>
            </div>
            
            {unitsStats.maintenance > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Maintenance</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Wrench className="w-3 h-3 mr-1" />
                  {unitsStats.maintenance}
                </Badge>
              </div>
            )}
            
            {unitsStats.broken > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Broken</span>
                <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {unitsStats.broken}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* F&B Quick Stats */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Coffee className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Food & Beverages</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Available</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                <ShoppingCart className="w-3 h-3 mr-1" />
                {fnbStats.available}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Out of Stock</span>
              <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {fnbStats.outOfStock}
              </Badge>
            </div>
            
            {fnbStats.lowStock > 0 && (
              <div className="flex items-center justify-between col-span-2">
                <span className="text-sm text-gray-600">Low Stock Items</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {fnbStats.lowStock}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}