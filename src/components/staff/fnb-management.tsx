// src/components/staff/fnb-management.tsx - Updated to use Order History instead of Recent Orders
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ShoppingCart, 
  Plus, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle,
  Coffee
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Import the new Order History component
import { FnbOrderHistory } from './fnb-order-history'

// ============================================
// TYPES
// ============================================

interface FnbItem {
  id: string
  name: string
  description?: string
  price: number
  stockQuantity: number
  minStockAlert: number
  unitType: string
  categoryName: string
  isAvailable: boolean
}

interface FnbCategory {
  id: string
  name: string
  items: FnbItem[]
}

interface ActiveSession {
  id: string
  unitName: string
  customerName?: string
  startTime: string
}

interface TodayStats {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
}

interface FnbDashboardData {
  categories: FnbCategory[]
  todayStats: TodayStats
  lowStockItems: FnbItem[]
}

interface FnbManagementProps {
  locationId: string
  activeSessions: ActiveSession[]
  onCreateOrder?: () => void
  onRefresh?: () => void
  refreshSessions?: () => void
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FnbManagement({ 
  locationId, 
  activeSessions, 
  onCreateOrder,
  onRefresh,
  refreshSessions
}: FnbManagementProps) {
  const router = useRouter()
  
  // ===== STATE =====
  const [fnbData, setFnbData] = useState<FnbDashboardData>({
    categories: [],
    todayStats: { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 },
    lowStockItems: []
  })
  const [loading, setLoading] = useState(true)

  // ===== API CALLS =====
  const fetchFnbData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch F&B dashboard data
      const response = await fetch(`/api/dashboard/locations/${locationId}/fnb`, {
        headers: {
          'X-Location-ID': locationId
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch F&B data')
      }

      const data = await response.json()
      
      if (data.success) {
        setFnbData(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch F&B data')
      }

    } catch (error) {
      console.error('Error fetching F&B data:', error)
      toast.error('Failed to load F&B data')
    } finally {
      setLoading(false)
    }
  }, [locationId])

  // ===== EFFECTS =====
  useEffect(() => {
    fetchFnbData()
  }, [fetchFnbData])

  // ===== HANDLERS =====
  const handleCreateStandaloneOrder = () => {
    onCreateOrder?.()
  }

  const handleCreateSessionOrder = (sessionId: string) => {
    // Trigger create order dialog with specific session
    onCreateOrder?.()
  }

  const handleViewInventory = () => {
    router.push(`/staff/locations/${locationId}/fnb/inventory`)
  }

  const handleRefreshAll = async () => {
    await fetchFnbData()
    if (onRefresh) {
      await onRefresh()
    }
    if (refreshSessions) {
      await refreshSessions()
    }
  }

  // ===== UTILITY FUNCTIONS =====
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // ===== RENDER =====
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* ===== SIDEBAR - STATS & INVENTORY ===== */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Today's Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <TrendingUp className="w-4 h-4 mr-2" />
              Today&apos;s Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(fnbData.todayStats.totalRevenue)}
              </p>
              <p className="text-xs text-gray-600">Total Revenue</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-semibold">{fnbData.todayStats.totalOrders}</p>
                <p className="text-gray-600">Orders</p>
              </div>
              <div>
                <p className="font-semibold">{formatCurrency(fnbData.todayStats.averageOrderValue)}</p>
                <p className="text-gray-600">Avg Order</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {fnbData.lowStockItems.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base text-orange-800">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fnbData.lowStockItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{item.name}</span>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                      {item.stockQuantity} left
                    </Badge>
                  </div>
                ))}
                {fnbData.lowStockItems.length > 3 && (
                  <p className="text-xs text-orange-600 text-center">
                    +{fnbData.lowStockItems.length - 3} more items
                  </p>
                )}
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mt-3 border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={handleViewInventory}
              >
                <Coffee className="w-3 h-3 mr-1" />
                Manage Stock
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== MAIN CONTENT - ORDER HISTORY & ACTIVE SESSIONS ===== */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Order History Section - REPLACEMENT for Recent Orders */}
        <FnbOrderHistory 
          locationId={locationId} 
          onRefresh={handleRefreshAll}
        />

        <Separator />

        {/* Active Sessions for F&B */}
        {activeSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Active Sessions Available for F&B
                </span>
                <Badge variant="secondary">{activeSessions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-blue-900">{session.unitName}</p>
                      <p className="text-sm text-blue-700">
                        {session.customerName || 'Customer'} • Started {formatTime(session.startTime)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreateSessionOrder(session.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add F&B
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Standalone Order Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Coffee className="w-5 h-5 mr-2" />
              Create Standalone Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Create F&B orders for walk-in customers who are not using gaming units.
            </p>
            <Button onClick={handleCreateStandaloneOrder} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Create New F&B Order
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh All Data
          </Button>

          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  )
}