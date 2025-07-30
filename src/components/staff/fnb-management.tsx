// src/components/staff/fnb-management.tsx - ORIGINAL LAYOUT + MINIMAL FIXES
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
// TYPES - ORIGINAL + FIX startTime
// ============================================

interface FnbItem {
  id: string
  name: string
  description?: string
  price: number
  stockQuantity: number
  unitType: string
  categoryName: string
  isAvailable: boolean
  minStockAlert: number
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
  customerName?: string
  notes?: string
  createdAt: string
}

interface ActiveSession {
  id: string
  unitName: string
  customerName?: string
  startTime: string  // FIX: Add startTime field
}

// FIX: Add callback props
interface FnbManagementProps {
  locationId: string
  activeSessions: ActiveSession[]
  onCreateOrder?: () => void
  onRefresh?: () => void  // FIX: Add refresh callback
  refreshSessions?: () => Promise<void>  // FIX: Add sessions refresh
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
// COMPONENT - ORIGINAL LAYOUT
// ============================================

export function FnbManagement({ 
  locationId, 
  activeSessions,
  onCreateOrder,
  onRefresh,  // FIX: Accept callback
  refreshSessions  // FIX: Accept sessions refresh
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
  const [selectedOrder, setSelectedOrder] = useState<FnbOrder | undefined>()
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  // ============================================
  // DATA FETCHING - ORIGINAL
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchFnbData, 30000)
    return () => clearInterval(interval)
  }, [fetchFnbData])

  // ============================================
  // ORDER STATUS MANAGEMENT - ORIGINAL
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
  // EVENT HANDLERS - FIX: Use callbacks
  // ============================================

  const handleRefresh = useCallback(async () => {
    await fetchFnbData()
    // FIX: Use callback if provided
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

      // FIX: Call refresh callback
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
    // FIX: Call refresh callback
    if (onRefresh) {
      await onRefresh()
    }
    setStatusDialogOpen(false)
    setSelectedOrder(undefined)
  }

  // ============================================
  // UTILS - ORIGINAL
  // ============================================

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // ============================================
  // RENDER - ORIGINAL LAYOUT
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
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending:</span>
              <Badge variant="outline" className="text-xs">
                {fnbData.todayStats.pendingOrders}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {fnbData.lowStockItems.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Low Stock Alert</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fnbData.lowStockItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">{item.name}</p>
                      <p className="text-xs text-red-600">
                        {item.stockQuantity} {item.unitType} left
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      Low
                    </Badge>
                  </div>
                ))}
                {fnbData.lowStockItems.length > 3 && (
                  <p className="text-xs text-red-600">
                    +{fnbData.lowStockItems.length - 3} more items
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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

      {/* ===== MAIN F&B MANAGEMENT SECTION ===== */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Coffee className="w-5 h-5 mr-2" />
                F&B Order Management
              </CardTitle>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recent Orders Section */}
            {fnbData.recentOrders.length > 0 ? (
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
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge className={getOrderStatusColor(order.status)}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1">{getOrderStatusText(order.status)}</span>
                            </Badge>
                            {order.rentalSessionId && (
                              <Badge variant="outline" className="text-xs">
                                Session Attached
                              </Badge>
                            )}
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

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center text-red-800">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Error loading F&B data</span>
                </div>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Dialog */}
      <FnbOrderStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        order={selectedOrder}
        locationId={locationId}
        onSuccess={handleStatusDialogSuccess}
      />
    </div>
  )
}