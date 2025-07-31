// src/components/staff/fnb-management.tsx - Fixed API Endpoints & Error Handling
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ShoppingCart, 
  Plus, 
  RefreshCw, 
  Package2, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Coffee
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { FnbOrderStatusDialog } from './fnb-order-status-dialog'

// ============================================
// TYPES - Updated with Unit Name
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
  status: 'pending' | 'completed' | 'cancelled'
  paymentTiming: 'immediate' | 'end_of_session'
  rentalSessionId?: string
  unitName?: string  // Unit name for session attached orders
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
  onRefresh?: () => void
  refreshSessions?: () => void
}

interface FnbData {
  categories: FnbCategory[]
  recentOrders: FnbOrder[]
  todayStats: {
    totalRevenue: number
    totalOrders: number
  }
  lowStockItems: FnbItem[]
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
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<FnbOrder | undefined>()
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  
  const [fnbData, setFnbData] = useState<FnbData>({
    categories: [],
    recentOrders: [],
    todayStats: { totalRevenue: 0, totalOrders: 0 },
    lowStockItems: []
  })

  // ============================================
  // DATA FETCHING - Fixed API Endpoints
  // ============================================

  const fetchFnbData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Use the correct API endpoints that exist in the project
      const [dashboardRes, ordersRes] = await Promise.all([
        fetch(`/api/dashboard/locations/${locationId}/fnb`),
        fetch(`/api/fnb/orders?limit=10`, {
          headers: { 'X-Location-ID': locationId }
        })
      ])

      console.log('📊 Dashboard API Status:', dashboardRes.status)
      console.log('📦 Orders API Status:', ordersRes.status)

      if (!dashboardRes.ok) {
        console.error('Dashboard API failed:', dashboardRes.status, dashboardRes.statusText)
        throw new Error(`Dashboard API failed: ${dashboardRes.status}`)
      }

      if (!ordersRes.ok) {
        console.error('Orders API failed:', ordersRes.status, ordersRes.statusText)
        throw new Error(`Orders API failed: ${ordersRes.status}`)
      }

      const [dashboardData, ordersData] = await Promise.all([
        dashboardRes.json(),
        ordersRes.json()
      ])

      console.log('📊 Dashboard Response:', dashboardData)
      console.log('📦 Orders Response:', ordersData)
      
      // Handle API response structure
      const fnbDashboard = dashboardData?.data || {}
      const ordersResult = ordersData?.data || []
      
      setFnbData({
        categories: fnbDashboard.categories || [],
        recentOrders: ordersResult,
        todayStats: {
          totalRevenue: fnbDashboard.todayStats?.totalRevenue || 0,
          totalOrders: fnbDashboard.todayStats?.totalOrders || 0
        },
        lowStockItems: fnbDashboard.lowStockItems || []
      })

    } catch (err) {
      console.error('Error fetching F&B data:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to load F&B data')
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    fetchFnbData()
  }, [fetchFnbData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchFnbData, 30000)
    return () => clearInterval(interval)
  }, [fetchFnbData])

  // ============================================
  // ORDER STATUS MANAGEMENT
  // ============================================

  const getOrderStatusColor = (status: FnbOrder['status']) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    }
    return statusColors[status] || statusColors.pending
  }

  const getOrderStatusText = (status: FnbOrder['status']) => {
    const statusText = {
      pending: 'Pending',
      completed: 'Completed',
      cancelled: 'Cancelled'
    }
    return statusText[status] || status
  }

  const getStatusIcon = (status: FnbOrder['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3 h-3" />
      case 'completed':
        return <CheckCircle2 className="w-3 h-3" />
      case 'cancelled':
        return <XCircle className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  const getNextStatus = (currentStatus: FnbOrder['status']): FnbOrder['status'] | null => {
    const nextStatuses: Record<FnbOrder['status'], FnbOrder['status'] | null> = {
      pending: 'completed',
      completed: null,
      cancelled: null
    }
    return nextStatuses[currentStatus]
  }

  const canQuickUpdate = (status: FnbOrder['status']): boolean => {
    return status === 'pending'
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleRefresh = useCallback(async () => {
    await fetchFnbData()
    if (onRefresh) {
      await onRefresh()
    } else {
      router.refresh()
    }
    toast.success('F&B data refreshed')
  }, [fetchFnbData, onRefresh, router])

  const handleCreateStandaloneOrder = () => {
    console.log('Creating F&B order - button clicked')
    if (onCreateOrder) {
      onCreateOrder()
    } else {
      console.warn('onCreateOrder callback not provided')
    }
  }

  const handleViewInventory = () => {
    toast.info('Opening inventory management...')
  }

  const handleQuickStatusUpdate = async (orderId: string, newStatus: FnbOrder['status']) => {
    try {
      const requestBody = {
        status: newStatus,
        reason: newStatus === 'cancelled' ? 'staff_cancelled' : undefined
      }

      const response = await fetch(`/api/fnb/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order status')
      }

      toast.success(`Order ${newStatus}!`)
      await fetchFnbData()

      if (onRefresh) {
        await onRefresh()
      }

    } catch (err) {
      console.error('Error updating order status:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update order status')
    }
  }

  const handleViewOrder = (order: FnbOrder) => {
    setSelectedOrder(order)
    setStatusDialogOpen(true)
  }

  const handleStatusDialogSuccess = async () => {
    await fetchFnbData()
    if (onRefresh) {
      await onRefresh()
    }
    setStatusDialogOpen(false)
    setSelectedOrder(undefined)
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // ============================================
  // RENDER SESSION BADGE - With Unit Name
  // ============================================

  const renderSessionBadge = (order: FnbOrder) => {
    if (!order.rentalSessionId) return null

    return (
      <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
        {order.unitName ? `Session Attached - ${order.unitName}` : 'Session Attached'}
      </Badge>
    )
  }

  // ============================================
  // RENDER COMPONENT
  // ============================================

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* ===== SIDEBAR - F&B METRICS & QUICK ACTIONS ===== */}
      <div className="space-y-4">
        
        {/* Today's F&B Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today F&B</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(fnbData.todayStats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {fnbData.todayStats.totalOrders} orders
              </p>
            </div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={handleCreateStandaloneOrder}
                className="flex-1"
              >
                <Plus className="w-3 h-3 mr-1" />
                New Order
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRefresh}
                className="px-2"
              >
                <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {fnbData.lowStockItems.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Low Stock Alert</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fnbData.lowStockItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="text-orange-800 font-medium">{item.name}</span>
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                      {item.stockQuantity} {item.unitType}
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

      {/* ===== MAIN CONTENT - RECENT ORDERS & ACTIVE SESSIONS ===== */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Recent Orders Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent F&B Orders
              </span>
              <Badge variant="secondary">{fnbData.recentOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
                <p className="text-gray-600">Loading F&B orders...</p>
              </div>
            ) : fnbData.recentOrders.length > 0 ? (
              <div>
                <h3 className="font-medium mb-4 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Recent Orders ({fnbData.recentOrders.length})
                </h3>
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {fnbData.recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1 flex-wrap">
                            <Badge className={getOrderStatusColor(order.status)}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1">{getOrderStatusText(order.status)}</span>
                            </Badge>
                            {/* Session Badge with Unit Name */}
                            {renderSessionBadge(order)}
                          </div>
                          <div className="text-sm">
                            <p className="font-medium">
                              {order.items.length} items • {formatCurrency(order.totalAmount)}
                            </p>
                            <p className="text-gray-600">
                              {order.customerName || 'Walk-in'} • {new Date(order.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {canQuickUpdate(order.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              onClick={() => handleQuickStatusUpdate(order.id, getNextStatus(order.status)!)}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Orders</h3>
                <p className="text-gray-600 mb-4">Start taking F&B orders to see them here</p>
                
                {/* Debug info for development */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="text-left text-xs text-gray-500 mt-4 border rounded p-2">
                    <summary className="cursor-pointer font-medium">🔍 Debug Info</summary>
                    <pre className="mt-2 bg-gray-100 p-2 rounded text-left overflow-auto whitespace-pre-wrap">
                      {JSON.stringify({
                        locationId,
                        categoriesCount: fnbData.categories.length,
                        ordersCount: fnbData.recentOrders.length,
                        todayStats: fnbData.todayStats,
                        lowStockCount: fnbData.lowStockItems.length,
                        loading,
                        apiEndpoints: [
                          `/api/dashboard/locations/${locationId}/fnb`,
                          `/api/fnb/orders?limit=10`
                        ]
                      }, null, 2)}
                    </pre>
                  </details>
                )}
                
                <Button onClick={handleCreateStandaloneOrder}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Order
                </Button>
              </div>
            )}

            <Separator />

            {/* Active Sessions for F&B */}
            {activeSessions.length > 0 && (
              <div>
                <h3 className="font-medium mb-4 flex items-center">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Active Sessions Available for F&B ({activeSessions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-blue-900">{session.unitName}</div>
                        <div className="text-sm text-blue-700">
                          {session.customerName || 'No name'} • {new Date(session.startTime).toLocaleTimeString()}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs border-blue-300 text-blue-800">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status Dialog */}
      {selectedOrder && (
        <FnbOrderStatusDialog
          order={selectedOrder}
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          onSuccess={handleStatusDialogSuccess}
          locationId={locationId}
        />
      )}
    </div>
  )
}