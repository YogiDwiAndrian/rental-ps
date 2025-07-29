'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Coffee, 
  Utensils, 
  ShoppingCart, 
  AlertTriangle, 
  Package,
  TrendingUp,
  Clock,
  Plus,
  Eye,
  RefreshCw
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

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

interface FnbOrder {
  id: string
  items: Array<{
    id: string
    fnbItemId: string
    fnbItemName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  totalAmount: number
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  paymentTiming: 'immediate' | 'end_of_session'
  rentalSessionId?: string
  customerName?: string
  notes?: string
  createdAt: string
}

interface ActiveSession {
  id: string
  unitName: string
  customerName?: string
  startTime: string
}

interface FnbManagementProps {
  locationId: string
  activeSessions: ActiveSession[]
  onCreateOrder?: () => void
}

interface FnbData {
  categories: FnbCategory[]
  recentOrders: FnbOrder[]
  lowStockItems: FnbItem[]
  todayStats: {
    totalOrders: number
    totalRevenue: number
    pendingOrders: number
  }
}

// ============================================
// COMPONENT
// ============================================

export function FnbManagement({ 
  locationId, 
  activeSessions,
  onCreateOrder
}: FnbManagementProps) {
  const router = useRouter()
  const [fnbData, setFnbData] = useState<FnbData>({
    categories: [],
    recentOrders: [],
    lowStockItems: [],
    todayStats: {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchFnbData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/dashboard/locations/${locationId}/fnb`, {
        headers: {
          'X-Location-ID': locationId
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch F&B data: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setFnbData(data.data)
      } else {
        throw new Error(data.error || 'Failed to load F&B data')
      }
    } catch (err) {
      console.error('Error fetching F&B data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load F&B data')
      toast.error('Failed to load F&B data')
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    fetchFnbData()
  }, [fetchFnbData])

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleRefresh = useCallback(async () => {
    await fetchFnbData()
    // Use Next.js router refresh for better UX
    router.refresh()
    toast.success('F&B data refreshed')
  }, [fetchFnbData, router])

  const handleCreateStandaloneOrder = () => {
    console.log('Creating F&B order - button clicked') // Debug log
    if (onCreateOrder) {
      onCreateOrder()
    } else {
      console.warn('onCreateOrder callback not provided')
    }
  }

  const handleViewInventory = () => {
    toast.info('Opening inventory management...')
  }

  const getOrderStatusColor = (status: FnbOrder['status']) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      preparing: 'bg-blue-100 text-blue-800 border-blue-200',
      ready: 'bg-green-100 text-green-800 border-green-200',
      served: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    }
    return statusColors[status] || statusColors.pending
  }

  const getOrderStatusText = (status: FnbOrder['status']) => {
    const statusText = {
      pending: 'Pending',
      preparing: 'Preparing',
      ready: 'Ready',
      served: 'Served',
      cancelled: 'Cancelled'
    }
    return statusText[status] || status
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Coffee className="w-5 h-5 mr-2" />
            F&B Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading F&B data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            F&B Management Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ===== F&B OVERVIEW CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's F&B Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today F&B Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(fnbData.todayStats.totalRevenue)}
            </div>
            <p className="text-xs text-gray-600">
              {fnbData.todayStats.totalOrders} orders completed
            </p>
            {fnbData.todayStats.pendingOrders > 0 && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-800">
                  <Clock className="w-3 h-3 mr-1" />
                  {fnbData.todayStats.pendingOrders} pending
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Items</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {fnbData.categories.reduce((total, category) => 
                total + category.items.filter(item => item.isAvailable && item.stockQuantity > 0).length, 0
              )}
            </div>
            <p className="text-xs text-gray-600">
              {fnbData.categories.reduce((total, category) => total + category.items.length, 0)} total items
            </p>
            {fnbData.lowStockItems.length > 0 && (
              <div className="mt-2">
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {fnbData.lowStockItems.length} low stock
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={handleCreateStandaloneOrder}
              size="sm" 
              className="w-full"
            >
              <Plus className="w-3 h-3 mr-2" />
              New F&B Order
            </Button>
            <Button 
              onClick={handleViewInventory}
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              <Eye className="w-3 h-3 mr-2" />
              View Inventory
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ===== MAIN F&B MANAGEMENT CARD ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Coffee className="w-5 h-5 mr-2" />
              F&B Operations
            </CardTitle>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recent Orders Section */}
          {fnbData.recentOrders.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Orders</h3>
                <Badge variant="outline">
                  {fnbData.recentOrders.length} orders
                </Badge>
              </div>
              
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {fnbData.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getOrderStatusColor(order.status)}>
                            {getOrderStatusText(order.status)}
                          </Badge>
                          {order.rentalSessionId && (
                            <Badge variant="outline" className="text-xs">
                              Session: {order.customerName || 'Attached'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {order.items.map(item => `${item.quantity}x ${item.fnbItemName}`).join(', ')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.paymentTiming === 'immediate' ? 'Paid' : 'End of session'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Coffee className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent F&B orders</p>
              <p className="text-xs">Orders will appear here once created</p>
            </div>
          )}

          <Separator />

          {/* Low Stock Alert Section */}
          {fnbData.lowStockItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-red-600">Low Stock Alert</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fnbData.lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
                  >
                    <div>
                      <div className="font-medium text-red-800">{item.name}</div>
                      <div className="text-sm text-red-600">{item.categoryName}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs">
                        {item.stockQuantity} {item.unitType}
                      </Badge>
                      <div className="text-xs text-red-500 mt-1">
                        Min: {item.minStockAlert}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session Attachment Info */}
          {activeSessions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold">Active Sessions</h3>
                  <Badge variant="outline">{activeSessions.length} active</Badge>
                </div>
                
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <p className="mb-2">You can attach F&B orders to any active session:</p>
                  <div className="space-y-1">
                    {activeSessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="flex items-center justify-between">
                        <span>{session.unitName}</span>
                        <span className="text-xs">
                          {session.customerName || 'Customer'} • 
                          {new Date(session.startTime).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                    {activeSessions.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{activeSessions.length - 3} more sessions
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}