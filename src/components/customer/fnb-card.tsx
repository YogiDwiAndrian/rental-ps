'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Coffee, 
  Utensils, 
  AlertTriangle,
  RefreshCw,
  ChefHat,
  IceCream,
  Cookie
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { FnbCategory, FnbItem } from '@/hooks/use-fnb-data'

interface FnbCardProps {
  categories: FnbCategory[]
  loading: boolean
  lastUpdated: Date | null
  onRefresh: () => void
}

export function FnbCard({ 
  categories, 
  loading, 
  lastUpdated, 
  onRefresh
}: FnbCardProps) {
  
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('drink') || name.includes('beverage') || name.includes('minuman')) {
      return <Coffee className="w-5 h-5 text-blue-600" />
    }
    if (name.includes('food') || name.includes('makanan') || name.includes('main')) {
      return <Utensils className="w-5 h-5 text-orange-600" />
    }
    if (name.includes('snack') || name.includes('cemilan')) {
      return <Cookie className="w-5 h-5 text-yellow-600" />
    }
    if (name.includes('dessert') || name.includes('sweet') || name.includes('ice')) {
      return <IceCream className="w-5 h-5 text-pink-600" />
    }
    return <ChefHat className="w-5 h-5 text-green-600" />
  }

  const getCategoryColor = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('drink') || name.includes('beverage') || name.includes('minuman')) {
      return {
        bg: 'from-blue-50 to-cyan-50',
        border: 'border-blue-200',
        text: 'text-blue-800'
      }
    }
    if (name.includes('food') || name.includes('makanan') || name.includes('main')) {
      return {
        bg: 'from-orange-50 to-amber-50',
        border: 'border-orange-200',
        text: 'text-orange-800'
      }
    }
    if (name.includes('snack') || name.includes('cemilan')) {
      return {
        bg: 'from-yellow-50 to-orange-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800'
      }
    }
    return {
      bg: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      text: 'text-green-800'
    }
  }

  const FnbItemCard = ({ item }: { item: FnbItem }) => (
    <Card className={`border-2 shadow-md hover:shadow-lg transition-all duration-200 h-full ${
      item.isAvailable && item.stockQuantity > 0 
        ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-300' 
        : 'border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50 opacity-75'
    }`}>
      <CardContent className="p-5 h-full flex flex-col">
        {/* Header - Removed WhatsApp button */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-bold text-lg text-gray-900 mb-1 leading-tight">
              {item.customerDisplayName || item.name}
            </h4>
            {(item.customerDescription || item.description) && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {item.customerDescription || item.description}
              </p>
            )}
          </div>
          
          {/* Simple availability badge - no stock numbers */}
          {item.isAvailable && item.stockQuantity > 0 ? (
            <Badge className="bg-green-500 text-white border-green-600 shadow-sm ml-3">
              Available
            </Badge>
          ) : (
            <Badge className="bg-gray-400 text-white border-gray-500 shadow-sm ml-3">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Unavailable
            </Badge>
          )}
        </div>

        {/* Price - Enhanced styling */}
        <div className="bg-white/80 rounded-lg p-3 border border-white shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Price</span>
            <div className="text-right">
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(item.price)}
              </span>
              <span className="text-xs text-gray-500 ml-1">per {item.unitType}</span>
            </div>
          </div>
        </div>

        {/* Spacer to push content to bottom */}
        <div className="flex-grow"></div>

        {/* Status indicator (without order button) */}
        <div className="mt-auto">
          {item.isAvailable && item.stockQuantity > 0 ? (
            <div className="text-center p-2 bg-green-100 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800">✅ Available to Order</p>
            </div>
          ) : (
            <div className="text-center p-2 bg-gray-100 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-600">❌ Currently Unavailable</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const CategorySection = ({ category }: { category: FnbCategory }) => {
    const colors = getCategoryColor(category.name)
    
    return (
      <div className="space-y-4">
        <div className={`${colors.bg} ${colors.border} border-2 rounded-xl p-4 shadow-sm`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {getCategoryIcon(category.name)}
            </div>
            <div>
              <h3 className={`text-xl font-bold ${colors.text}`}>{category.name}</h3>
              <p className="text-sm text-gray-600">
                {category.availableCount} of {category.totalCount} items available
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {category.items.map((item) => (
            <FnbItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    )
  }

  if (loading && categories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* F&B Header */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500 rounded-xl shadow-md">
                <Coffee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-emerald-900 mb-1">
                  🍕 Food & Beverages
                </h2>
                <p className="text-emerald-700">Fresh menu available • Contact us to order</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Menu
            </Button>
          </div>
          
          {lastUpdated && (
            <p className="text-xs text-emerald-600 mt-3">
              Menu updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Categories */}
      {categories.map((category, index) => (
        <div key={category.name}>
          <CategorySection category={category} />
          {index < categories.length - 1 && <Separator className="my-8" />}
        </div>
      ))}

      {/* Empty State */}
      {categories.length === 0 && !loading && (
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <Coffee className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Menu Available</h3>
            <p className="text-gray-500 mb-6">Our menu is currently being updated. Please check back later.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}