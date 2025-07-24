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
  Cookie,
  ShoppingCart,
  Star,
  TrendingUp
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
        text: 'text-blue-800',
        headerBg: 'bg-blue-500'
      }
    }
    if (name.includes('food') || name.includes('makanan') || name.includes('main')) {
      return {
        bg: 'from-orange-50 to-amber-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        headerBg: 'bg-orange-500'
      }
    }
    if (name.includes('snack') || name.includes('cemilan')) {
      return {
        bg: 'from-yellow-50 to-orange-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        headerBg: 'bg-yellow-500'
      }
    }
    return {
      bg: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      text: 'text-green-800',
      headerBg: 'bg-green-500'
    }
  }

  const FnbItemCard = ({ item, isPopular = false }: { item: FnbItem; isPopular?: boolean }) => (
    <Card className={`${
      item.isAvailable && item.stockQuantity > 0 
        ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg hover:border-green-300 transform hover:scale-[1.02]' 
        : 'border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50 opacity-75'
    } border-2 shadow-md transition-all duration-200 h-full relative overflow-hidden`}>
      
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-red-500 text-white border-red-600 shadow-sm">
            <Star className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}

      <CardContent className="p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-2">
            <h4 className="font-bold text-lg text-gray-900 mb-1 leading-tight">
              {item.customerDisplayName || item.name}
            </h4>
            {(item.customerDescription || item.description) && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {item.customerDescription || item.description}
              </p>
            )}
          </div>
          
          {/* Availability Status */}
          {item.isAvailable && item.stockQuantity > 0 ? (
            <Badge className="bg-green-500 text-white border-green-600 shadow-sm">
              <ShoppingCart className="w-3 h-3 mr-1" />
              Available
            </Badge>
          ) : (
            <Badge className="bg-red-400 text-white border-red-500 shadow-sm">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Unavailable
            </Badge>
          )}
        </div>

        {/* Price Section - Enhanced */}
        <div className="bg-white/90 rounded-xl p-4 border-2 border-white shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-600 block">Price</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(item.price)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">per {item.unitType}</span>
              {item.isAvailable && item.stockQuantity > 0 && item.stockQuantity <= 5 && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 mt-1">
                  Only {item.stockQuantity} left
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-grow"></div>

        {/* Status Section - Simplified */}
        <div className="mt-auto">
          {item.isAvailable && item.stockQuantity > 0 ? (
            <div className="text-center p-3 bg-green-100 rounded-xl border-2 border-green-200">
              <div className="flex items-center justify-center gap-2">
                <ShoppingCart className="w-4 h-4 text-green-700" />
                <span className="font-semibold text-green-800">✅ Available</span>
              </div>
            </div>
          ) : (
            <div className="text-center p-3 bg-gray-100 rounded-xl border-2 border-gray-200">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-gray-700">❌ Unavailable</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const CategorySection = ({ category }: { category: FnbCategory }) => {
    const colors = getCategoryColor(category.name)
    
    // Sort items: available first, then by price
    const sortedItems = [...category.items].sort((a, b) => {
      // Available items first
      if (a.isAvailable && a.stockQuantity > 0 && (!b.isAvailable || b.stockQuantity === 0)) return -1
      if ((!a.isAvailable || a.stockQuantity === 0) && b.isAvailable && b.stockQuantity > 0) return 1
      
      // Then sort by price (ascending)
      return a.price - b.price
    })

    // Mark popular items (available items with stock > 10 or premium priced)
    const itemsWithPopularity = sortedItems.map(item => ({
      ...item,
      isPopular: item.isAvailable && item.stockQuantity > 0 && (
        item.stockQuantity > 10 || item.price > 20000
      )
    }))
    
    return (
      <div className="space-y-6">
        {/* Category Header */}
        <div className={`${colors.bg} ${colors.border} border-2 rounded-xl p-6 shadow-sm`}>
          <div className="flex items-center gap-4 mb-3">
            <div className={`p-3 ${colors.headerBg} rounded-xl shadow-md`}>
              <div className="text-white">
                {getCategoryIcon(category.name)}
              </div>
            </div>
            <div>
              <h3 className={`text-2xl font-bold ${colors.text}`}>{category.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <Badge className="bg-white/80 text-gray-700 border-white">
                  {category.availableCount} available
                </Badge>
                {category.totalCount - category.availableCount > 0 && (
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    {category.totalCount - category.availableCount} unavailable
                  </Badge>
                )}
                {category.availableCount > 0 && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {Math.round((category.availableCount / category.totalCount) * 100)}% in stock
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Items Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {itemsWithPopularity.map((item) => (
            <FnbItemCard key={item.id} item={item} isPopular={item.isPopular} />
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
      {/* F&B Header - Enhanced */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-500 rounded-xl shadow-md">
                <Coffee className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-emerald-900 mb-1">
                  🍕 Food & Beverages
                </h2>
                <p className="text-emerald-700 text-lg">Fresh menu available at our location</p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    {categories.reduce((acc, cat) => acc + cat.availableCount, 0)} items available
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {categories.length} categories
                  </Badge>
                </div>
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
            <p className="text-gray-500 mb-6">Our menu is currently being updated. Please check back later or contact us directly.</p>
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Contact CTA - Removed, replaced with simple info */}
      {categories.length > 0 && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold text-blue-900 mb-2">
              🍽️ Food & Beverages Available
            </h3>
            <p className="text-blue-700 mb-4">
              Visit our location to order fresh food and beverages
            </p>
            <div className="bg-white/70 rounded-lg p-3 inline-block">
              <p className="text-sm text-blue-800 font-medium">
                💡 Perfect for your gaming session! Order at our counter.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}