// src/components/customer/realtime-fnb.tsx
'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Package } from "lucide-react"
import { usePolling } from '@/hooks/use-polling'
import { formatCurrency } from '@/lib/utils'

interface FnbItem {
  id: string
  name: string
  description: string | null
  price: number
  stockQuantity: number
  isAvailable: boolean
  unitType: string
  locationName: string
}

interface CategoryGroup {
  categoryName: string
  items: FnbItem[]
  locationName: string
}

interface LowStockItem {
  id: string
  name: string
  stockQuantity: number
  minStockAlert: number
  locationName: string
}

interface RealtimeFnbProps {
  subdomain: string
  initialCategories: CategoryGroup[]
  showLowStockAlerts?: boolean
}

export default function RealtimeFnb({ 
  subdomain, 
  initialCategories,
  showLowStockAlerts = false 
}: RealtimeFnbProps) {
  const [categories, setCategories] = useState<CategoryGroup[]>(initialCategories)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  // Fetch F&B data
  const fetchFnbData = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/${subdomain}/fnb`, {
        cache: 'no-cache'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data.categories)
        setLowStockItems(data.data.lowStockItems || [])
        setError(null)
        setIsOnline(true)
      } else {
        throw new Error(data.error || 'Failed to fetch F&B data')
      }
    } catch (err) {
      console.error('Error fetching F&B data:', err)
      setError(err instanceof Error ? err.message : 'Network error')
      setIsOnline(false)
    }
  }, [subdomain])

  // Setup polling every 5 minutes (300 seconds)
  const { isPolling, lastUpdated, refresh } = usePolling(fetchFnbData, {
    interval: 300000, // 5 minutes
    enabled: true,
    immediate: false // Don't run immediately since we have initial data
  })

  // Get all items from all categories
  const allItems = categories.flatMap(category => category.items)
  const availableItems = allItems.filter(item => item.isAvailable)
  const outOfStockItems = allItems.filter(item => !item.isAvailable)

  return (
    <div className="space-y-6">
      {/* Low Stock Alerts (for staff view) */}
      {showLowStockAlerts && lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="destructive" className="text-xs">
                    {item.stockQuantity} left (min: {item.minStockAlert})
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main F&B Menu */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🍕 Food & Beverage Menu
                {isOnline ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
              </CardTitle>
              <CardDescription>
                {isOnline ? 'Fresh snacks and drinks • Auto-refresh every 5 minutes' : 'Connection lost • Check your internet'}
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

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{availableItems.length}</div>
              <div className="text-sm text-green-700">Available</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{outOfStockItems.length}</div>
              <div className="text-sm text-red-700">Out of Stock</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
              <div className="text-sm text-blue-700">Categories</div>
            </div>
          </div>

          {/* Categories and Items */}
          {categories.length > 0 ? (
            <div className="space-y-6">
              {categories.map((category, categoryIndex) => (
                <div key={`${category.categoryName}-${categoryIndex}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">{category.categoryName}</h3>
                    <Badge variant="outline" className="text-xs">
                      {category.items.length} items
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-all duration-300 ${
                          isPolling ? 'opacity-80' : ''
                        } ${
                          item.isAvailable 
                            ? 'border-gray-200 hover:border-gray-300 bg-white' 
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex-1">
                          <h4 className={`font-medium ${!item.isAvailable ? 'text-gray-500' : ''}`}>
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className={`text-sm ${!item.isAvailable ? 'text-gray-400' : 'text-gray-500'}`}>
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">
                              Stock: {item.stockQuantity} {item.unitType}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`font-semibold ${
                            item.isAvailable ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {formatCurrency(item.price)}
                          </div>
                          <Badge 
                            variant={item.isAvailable ? 'default' : 'destructive'}
                            className="text-xs mt-1"
                          >
                            {item.isAvailable ? 'Available' : 'Out of Stock'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">🍽️</div>
              <div>No menu items available</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}