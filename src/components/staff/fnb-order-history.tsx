'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  History,
  RefreshCw, 
  Package2,
  Clock,
  XCircle,
  Eye,
  Filter,
  Loader2,
  CalendarX,
  User,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { FnbOrderStatusDialog } from './fnb-order-status-dialog'

// ============================================
// TYPES
// ============================================

interface FnbOrderItem {
  id: string
  fnbItemId: string
  fnbItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface FnbOrder {
  id: string
  items: FnbOrderItem[]
  totalAmount: number
  status: 'pending' | 'completed' | 'cancelled'
  paymentTiming: 'immediate' | 'end_of_session'
  rentalSessionId?: string
  unitName?: string
  customerName?: string
  notes?: string
  createdAt: string
  createdBy?: string
  createdByName?: string
  cancellationReason?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelledByName?: string
  stockRestored?: boolean
}

interface OrderHistoryResponse {
  success: boolean
  data: FnbOrder[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message: string
}

interface FnbOrderHistoryProps {
  locationId: string
  onRefresh?: () => void
}

export function FnbOrderHistory({ locationId, onRefresh }: FnbOrderHistoryProps) {
  // ===== STATE =====
  const [orders, setOrders] = useState<FnbOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Dialog state
  const [selectedOrder, setSelectedOrder] = useState<FnbOrder>()
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const ITEMS_PER_PAGE = 15

  // ===== UTILITY FUNCTIONS =====
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOrderModifiable = (createdAt: string): boolean => {
    const orderDate = new Date(createdAt)
    const now = new Date()
    const diffInHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60)
    return diffInHours <= 24
  }

  const getStatusColor = (status: FnbOrder['status']) => {
    const statusColors = {
      pending: 'bg-orange-100 text-orange-800 border-orange-200',
      completed: 'bg-green-100 text-green-800 border-green-200', 
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    }
    return statusColors[status] || statusColors.pending
  }

  const getStatusIcon = (status: FnbOrder['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'completed':
        return <DollarSign className="w-4 h-4" />
      case 'cancelled':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusText = (status: FnbOrder['status']) => {
    const statusLabels = {
      pending: 'Belum Dibayar',
      completed: 'Sudah Dibayar',
      cancelled: 'Dibatalkan'
    }
    return statusLabels[status] || status
  }

  // ===== API CALLS =====
  const fetchOrders = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString()
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/fnb/orders?${params}`, {
        headers: {
          'X-Location-ID': locationId
        }
      })

      const data: OrderHistoryResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch order history')
      }

      if (append) {
        setOrders(prev => [...prev, ...data.data])
      } else {
        setOrders(data.data)
      }

      setCurrentPage(data.pagination.page)
      setTotalPages(data.pagination.totalPages)
      setTotalOrders(data.pagination.total)

    } catch (error) {
      console.error('Error fetching order history:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [locationId, statusFilter])

  const refreshOrders = () => {
    setCurrentPage(1)
    fetchOrders(1, false)
    onRefresh?.()
  }

  const loadMoreOrders = () => {
    if (currentPage < totalPages && !loadingMore) {
      fetchOrders(currentPage + 1, true)
    }
  }

  // ===== EVENT HANDLERS =====
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleViewOrder = (order: FnbOrder) => {
    setSelectedOrder(order)
    setStatusDialogOpen(true)
  }

  const handleOrderSuccess = () => {
    refreshOrders()
  }

  // ===== EFFECTS =====
  useEffect(() => {
    fetchOrders(1, false)
  }, [fetchOrders])

  // ===== HELPER FUNCTIONS =====
  const renderSessionBadge = (order: FnbOrder) => {
    if (!order.rentalSessionId) return null
    
    return (
      <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
        <Package2 className="w-3 h-3 mr-1" />
        {order.unitName ? `📺 ${order.unitName}` : '📺 Session'}
      </Badge>
    )
  }

  // ===== GROUP BY DATE =====
  const groupOrdersByDate = (orders: FnbOrder[]) => {
    const grouped: { [key: string]: FnbOrder[] } = {}
    
    orders.forEach(order => {
      const dateKey = formatDate(order.createdAt)
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(order)
    })
    
    return grouped
  }

  const groupedOrders = groupOrdersByDate(orders)
  const sortedDates = Object.keys(groupedOrders).sort((a, b) => {
    return new Date(b.split('/').reverse().join('-')).getTime() - new Date(a.split('/').reverse().join('-')).getTime()
  })

  // ===== RENDER =====
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <History className="w-5 h-5 mr-2" />
              Order History
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{totalOrders} total</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshOrders}
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center space-x-3 pt-2">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Belum Dibayar</SelectItem>
                  <SelectItem value="completed">Sudah Dibayar</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-gray-500">
              Showing {orders.length} of {totalOrders} orders
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
              <p className="text-gray-600">Loading order history...</p>
            </div>
          ) : orders.length > 0 ? (
            <div>
              <ScrollArea className="h-96">
                <div className="space-y-6">
                  {sortedDates.map((date) => (
                    <div key={date}>
                      {/* Date Header */}
                      <div className="sticky top-0 bg-white border-b pb-2 mb-3">
                        <h4 className="font-medium text-gray-900">{date}</h4>
                      </div>
                      
                      {/* Orders for this date */}
                      <div className="space-y-3">
                        {groupedOrders[date].map((order) => {
                          const isModifiable = isOrderModifiable(order.createdAt)
                          
                          return (
                            <div
                              key={order.id}
                              className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                isModifiable 
                                  ? 'bg-gray-50 hover:bg-gray-100' 
                                  : 'bg-gray-25 border-gray-200 opacity-75'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                  <Badge variant="outline" className={getStatusColor(order.status)}>
                                    {getStatusIcon(order.status)}
                                    <span className="ml-1">{getStatusText(order.status)}</span>
                                  </Badge>
                                  {renderSessionBadge(order)}
                                  {!isModifiable && (
                                    <Badge variant="outline" className="text-xs bg-gray-100 border-gray-300 text-gray-600">
                                      <CalendarX className="w-3 h-3 mr-1" />
                                      Read-only
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-sm">
                                  <p className="font-medium">
                                    {order.items.length} items • {formatCurrency(order.totalAmount)}
                                  </p>
                                  <p className="text-gray-600">
                                    {order.customerName || 'Walk-in'} • {formatTime(order.createdAt)}
                                    {order.createdByName && (
                                      <>
                                        {' • '}
                                        <span className="inline-flex items-center">
                                          <User className="w-3 h-3 mr-1" />
                                          {order.createdByName}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                  
                                  {/* SIMPLE: Show cancellation info with text instead of badge */}
                                  {order.status === 'cancelled' && (
                                    <div className="mt-2 text-xs text-red-600 space-y-1">
                                      {order.cancellationReason && (
                                        <p className="flex items-center">
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Dibatal: {order.cancellationReason}
                                          {order.cancelledByName && ` (oleh ${order.cancelledByName})`}
                                        </p>
                                      )}
                                      
                                      {/* SIMPLE: Text keterangan stock instead of badge */}
                                      {order.stockRestored !== undefined && (
                                        <p className="text-blue-600 ml-4">
                                          Stok: {order.stockRestored ? "✓ Dikembalikan" : "✗ Tidak dikembalikan"}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                {/* Allow view ALL orders */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleViewOrder(order)}
                                  title="Lihat detail pesanan"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Load More Button */}
              {currentPage < totalPages && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={loadMoreOrders}
                    disabled={loadingMore}
                    className="w-full"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      <>Load More ({currentPage} of {totalPages})</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
              <p className="text-gray-600">
                {statusFilter !== 'all' 
                  ? `No ${statusFilter} orders found for this location.`
                  : 'No F&B orders found for this location.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Status Dialog */}
      <FnbOrderStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        order={selectedOrder}
        locationId={locationId}
        onSuccess={handleOrderSuccess}
      />
    </>
  )
}