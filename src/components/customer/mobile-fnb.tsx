// src/components/customer/mobile-fnb.tsx
'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Wifi, WifiOff, ChevronDown, ChevronUp, ShoppingCart } from "lucide-react"
import { usePolling } from '@/hooks/use-polling'
import { useMobile } from '@/hooks/use-mobile'
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

interface MobileFnbProps {
  subdomain: string
  initialCategories: CategoryGroup[]
}

export default function MobileFnb({ subdomain, initialCategories }: MobileFnbProps) {
  const [categories, setCategories] = useState<CategoryGroup[]>(initialCategories)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const { isMobile } = useMobile()

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

  // Setup polling every 5 minutes
  const { isPolling, lastUpdated, refresh } = usePolling(fetchFnbData, {
    interval: 300000, // 5 minutes
    enabled: true,
    immediate: false
  })

  // Get all items stats
  const allItems = categories.flatMap(category => category.items)
  const availableItems = allItems.filter(item => item.isAvailable)
  const outOfStockItems = allItems.filter(item => !item.isAvailable)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              🍕 F&B Menu
              {isOnline ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
            </CardTitle>
            <CardDescription className="text-sm">
              {isOnline ? 'Fresh snacks & drinks • Auto-refresh 5min' : 'Connection lost'}
            </CardDescription>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isPolling}
            className="ml-2"
          >
            <RefreshCw className={`w-3 h-3 ${isPolling ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Mobile Quick Stats */}
        {isMobile && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">{availableItems.length}</div>
              <div className="text-xs text-green-700">Available</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <div className="text-lg font-bold text-red-600">{outOfStockItems.length}</div>
              <div className="text-xs text-red-700">Out of Stock</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-600">{categories.length}</div>
              <div className="text-xs text-blue-700">Categories</div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Connection Error</span>
            </div>
            <div className="text-red-600 text-xs mt-1">{error}</div>
          </div>
        )}

        {/* Categories - Collapsible on Mobile */}
        {categories.length > 0 ? (
          <div className="space-y-2">
            {categories.map((category, categoryIndex) => (
              <div key={`${category.categoryName}-${categoryIndex}`} className="border rounded-lg overflow-hidden">
                {/* Category Header - Clickable on Mobile */}
                <div 
                  className={`p-3 ${isMobile ? 'cursor-pointer select-none' : ''} bg-gray-50 border-b`}
                  onClick={isMobile ? () => setExpandedCategory(
                    expandedCategory === category.categoryName ? null : category.categoryName
                  ) : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{category.categoryName}</h3>
                      <Badge variant="outline" className="text-xs">
                        {category.items.length} items
                      </Badge>
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                        {category.items.filter(item => item.isAvailable).length} available
                      </Badge>
                    </div>
                    
                    {isMobile && (
                      <div>
                        {expandedCategory === category.categoryName ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Items */}
                {(!isMobile || expandedCategory === category.categoryName) && (
                  <div className="p-3 space-y-2">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-all duration-300 ${
                          isPolling ? 'opacity-80' : ''
                        } ${
                          item.isAvailable 
                            ? 'border-gray-200 bg-white' 
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0"> {/* min-w-0 for text truncation */}
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium text-sm ${!item.isAvailable ? 'text-gray-500' : ''}`}>
                              {item.name}
                            </h4>
                            {item.isAvailable && (
                              <ShoppingCart className="w-3 h-3 text-green-600" />
                            )}
                          </div>
                          
                          {item.description && (
                            <p className={`text-xs mt-1 ${!item.isAvailable ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                              {item.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">
                              Stock: {item.stockQuantity} {item.unitType}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right ml-3">
                          <div className={`font-semibold text-sm ${
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
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">🍽️</div>
            <div className="text-sm">No menu items available</div>
          </div>
        )}

        {/* Last Updated Info */}
        {lastUpdated && (
          <div className="text-center pt-2 border-t">
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString('id-ID')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}