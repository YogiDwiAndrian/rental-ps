'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  ChevronDown, 
  ChevronUp, 
  Coffee, 
  ShoppingCart, 
  AlertTriangle,
  RefreshCw,
  Utensils,
  Package
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { FnbCategory, FnbItem } from '@/hooks/use-fnb-data'

interface MobileFnbProps {
  categories: FnbCategory[]
  loading: boolean
  lastUpdated: Date | null
  onRefresh: () => void
}

export function MobileFnb({ categories, loading, lastUpdated, onRefresh }: MobileFnbProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }))
  }

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('drink') || name.includes('beverage') || name.includes('minuman')) {
      return <Coffee className="w-4 h-4" />
    }
    if (name.includes('food') || name.includes('makanan') || name.includes('snack')) {
      return <Utensils className="w-4 h-4" />
    }
    return <Package className="w-4 h-4" />
  }

  const ItemCard = ({ item }: { item: FnbItem }) => (
    <Card className="border-0 shadow-sm mb-3 bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">
              {item.customerDisplayName || item.name}
            </h4>
            {(item.customerDescription || item.description) && (
              <p className="text-sm text-gray-500 mb-2">
                {item.customerDescription || item.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-600">
                {formatCurrency(item.price)}
              </span>
              <span className="text-xs text-gray-500">
                per {item.unitType}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {item.isAvailable && item.stockQuantity > 0 ? (
              <>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Available
                </Badge>
                <span className="text-xs text-gray-500">
                  Stock: {item.stockQuantity}
                </span>
              </>
            ) : (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Out of Stock
              </Badge>
            )}
          </div>
        </div>
        
        {/* Stock warning for low stock items */}
        {item.isAvailable && item.stockQuantity > 0 && item.stockQuantity <= 5 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-600" />
              <span className="text-xs text-yellow-700">Low Stock - Only {item.stockQuantity} left!</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const CategorySection = ({ category }: { category: FnbCategory }) => {
    const isOpen = openCategories[category.name] ?? false
    
    return (
      <Collapsible
        open={isOpen}
        onOpenChange={() => toggleCategory(category.name)}
      >
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-4 h-auto bg-gray-50 hover:bg-gray-100 mb-2"
          >
            <div className="flex items-center gap-2">
              {getCategoryIcon(category.name)}
              <span className="font-medium">{category.name}</span>
              <div className="flex gap-1">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {category.availableCount} available
                </Badge>
                {category.totalCount - category.availableCount > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {category.totalCount - category.availableCount} out
                  </Badge>
                )}
              </div>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-0 mb-4">
          {category.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-emerald-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coffee className="h-5 w-5 text-emerald-600" />
              Food & Beverages
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-100"
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

      {/* Category Sections */}
      {categories.map((category) => (
        <CategorySection key={category.name} category={category} />
      ))}

      {/* Empty State */}
      {categories.length === 0 && !loading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Coffee className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Menu Items</h3>
            <p className="text-gray-500">Menu items are currently being updated.</p>
          </CardContent>
        </Card>
      )}

      {/* Quick action hint */}
      {categories.length > 0 && (
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <ShoppingCart className="w-4 h-4" />
              <span>Tap on categories to browse available items</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}