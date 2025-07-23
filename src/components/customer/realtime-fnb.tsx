'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Coffee, RefreshCw, AlertTriangle, ShoppingCart, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useFnbData } from '@/hooks/use-fnb-data'

interface RealtimeFnbProps {
  subdomain: string
}

export function RealtimeFnb({ subdomain }: RealtimeFnbProps) {
  const { items, loading, error, lastUpdated, refresh, categorizedItems } = useFnbData(subdomain)

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
            <Coffee className="h-6 w-6 text-emerald-600" />
            Food & Beverages
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
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Coffee className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Menu Items</h3>
            <p className="text-gray-500">Menu items are currently being updated.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(categorizedItems).map(([categoryName, categoryItems], categoryIndex) => (
              <div key={categoryName}>
                {categoryIndex > 0 && <Separator className="mb-6" />}
                
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-gray-600" />
                  {categoryName}
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryItems.map((item, index) => (
                    <div key={item.id}>
                      <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900">
                            {item.customerDisplayName || item.name}
                          </h4>
                          {(item.customerDescription || item.description) && (
                            <p className="text-sm text-gray-500 mt-1">
                              {item.customerDescription || item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-lg font-semibold text-emerald-600">
                              {formatCurrency(item.price)}
                            </span>
                            <span className="text-xs text-gray-500">
                              per {item.unitType}
                            </span>
                          </div>
                          {item.isAvailable && item.stockQuantity > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Stock: {item.stockQuantity} {item.unitType}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 ml-4">
                          {item.isAvailable && item.stockQuantity > 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              Available
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Out of Stock
                            </Badge>
                          )}
                          
                          {item.isAvailable && item.stockQuantity > 0 && item.stockQuantity <= 5 && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}