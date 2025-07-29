'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
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
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Timer
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { FnbOrderStatusDialog } from './fnb-order-status-dialog'

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
  const [selectedOrder, setSelectedOrder] = useState<FnbOrder | undefined>()
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

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
    router.refresh()
    toast.success('F&B data refreshed')
  }, [fetchFnbData, router])

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
        reason: newStatus === 'cancelled' ? 'Quick action cancellation' : undefined,
        restore_stock: newStatus === 'cancelled',
        notes: undefined
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

      toast.success(`Order status updated to ${getOrderStatusText(newStatus)}`)
      await fetchFnbData() // Refresh data

    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update order status')
    }
  }

  const handleOpenStatusDialog = (order: FnbOrder) => {
    setSelectedOrder(order)
    setStatusDialogOpen(true)
  }

  const handleStatusDialogSuccess = () => {
    fetchFnbData() // Refresh data after successful update
  }

  // ============================================
  // RENDER
  // ============================================

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-red-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <p>Error: {error}</p>
            <Button onClick={fetchFnbData} variant="outline" size="sm" className="mt-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* ===== SIDEBAR STATS ===== */}
      <div className="lg:col-span-1 space-y-4">
        {/* Today's Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today F&B</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(fnbData.todayStats.totalRevenue)}
                </div>
                <p className="text-xs text-gray-600">Revenue</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold">{fnbData.todayStats.totalOrders}</div>
                  <p className="text-xs text-gray-600">Orders</p>
                </div>
                <div>
                  <div className="text-lg font-semibold text-yellow-600">
                    {fnbData.todayStats.pendingOrders}
                  </div>
                  <p className="text-xs text-gray-600">Pending</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Available items:</span>
                <Badge variant="outline">
                  {fnbData.categories.reduce((sum, cat) => 
                    sum + cat.items.filter(item => item.isAvailable).length, 0
                  )}
                </Badge>
              </div>
              
              {fnbData.lowStockItems.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600">Low stock:</span>
                  <Badge variant="destructive">
                    {fnbData.lowStockItems.length}
                  </Badge>
                </div>
              )}
            </div>
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Recent Orders</h3>
                  <Badge variant="outline">
                    {fnbData.recentOrders.length} orders
                  </Badge>
                </div>
                
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {fnbData.recentOrders.map((order) => {
                      const nextStatus = getNextStatus(order.status)
                      const canUpdate = canQuickUpdate(order.status)
                      
                      return (
                        <Card key={order.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Order Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-semibold">
                                    Order #{order.id.slice(-8)}
                                  </h4>
                                  <Badge className={getOrderStatusColor(order.status)}>
                                    {getStatusIcon(order.status)}
                                    <span className="ml-1">{getOrderStatusText(order.status)}</span>
                                  </Badge>
                                  {order.rentalSessionId && (
                                    <Badge variant="outline" className="text-xs">
                                      <Timer className="w-3 h-3 mr-1" />
                                      Session: {order.customerName || 'Attached'}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  {/* Quick Next Status Button */}
                                  {canUpdate && nextStatus && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleQuickStatusUpdate(order.id, nextStatus)}
                                      className="h-8"
                                    >
                                      {getStatusIcon(nextStatus)}
                                      <span className="ml-1">{getOrderStatusText(nextStatus)}</span>
                                    </Button>
                                  )}
                                  
                                  {/* Quick Cancel Button */}
                                  {canUpdate && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleQuickStatusUpdate(order.id, 'cancelled')}
                                      className="h-8"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Cancel
                                    </Button>
                                  )}
                                  
                                  {/* More Actions */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenStatusDialog(order)}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleOpenStatusDialog(order)}>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Change Status
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              {/* Order Details */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Items:</span>
                                  <div className="font-medium">
                                    {order.items.map(item => 
                                      `${item.quantity}x ${item.fnbItemName}`
                                    ).join(', ')}
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-gray-600">Total:</span>
                                  <div className="font-semibold text-lg">
                                    {formatCurrency(order.totalAmount)}
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-gray-600">Payment:</span>
                                  <div className={cn(
                                    "font-medium",
                                    order.paymentTiming === 'immediate' ? 'text-green-600' : 'text-yellow-600'
                                  )}>
                                    {order.paymentTiming === 'immediate' ? 'Paid' : 'End of Session'}
                                  </div>
                                </div>
                              </div>

                              {/* Timestamp */}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Created: {new Date(order.createdAt).toLocaleString()}</span>
                                {order.status === 'pending' && (
                                  <span className="text-yellow-600 font-medium animate-pulse">
                                    Awaiting completion
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
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
                    <Badge variant="outline">{activeSessions.length}</Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Available sessions for F&B order attachment:
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-2 border rounded bg-blue-50"
                      >
                        <div>
                          <div className="font-medium">{session.unitName}</div>
                          <div className="text-xs text-gray-600">
                            {session.customerName || 'No name'}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
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