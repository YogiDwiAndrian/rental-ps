// src/components/staff/fnb-order-history.tsx - Order History with Pagination and Date Restrictions
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  History,
  RefreshCw, 
  Package2,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
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
  createdBy?: string        // NEW: User ID who created the order
  createdByName?: string    // NEW: Name of user who created the order
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

// ============================================
// MAIN COMPONENT
// ============================================

export function FnbOrderHistory({ locationId, onRefresh }: FnbOrderHistoryProps) {
  // ===== STATE =====
  const [orders, setOrders] = useState<FnbOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Dialog state
  const [selectedOrder, setSelectedOrder] = useState<FnbOrder>()
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const ITEMS_PER_PAGE = 15

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
      toast.error(error instanceof Error ? error.message : 'Failed to fetch order history')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [locationId, statusFilter])

  const refreshOrders = useCallback(() => {
    setCurrentPage(1)
    fetchOrders(1, false)
  }, [fetchOrders])

  const loadMoreOrders = useCallback(() => {
    if (currentPage < totalPages && !loadingMore) {
      const nextPage = currentPage + 1
      fetchOrders(nextPage, true)
    }
  }, [currentPage, totalPages, loadingMore, fetchOrders])

  // ===== EFFECTS =====
  useEffect(() => {
    fetchOrders(1, false)
  }, [fetchOrders])

  // ===== UTILITY FUNCTIONS =====
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <DollarSign className="w-3 h-3" />  // Changed from CheckCircle2
      case 'cancelled':
        return <XCircle className="w-3 h-3" />
      case 'pending':
        return <Clock className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'pending':
        return 'bg-orange-50 text-orange-700 border-orange-200'  // Changed from yellow
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Sudah Dibayar'    // Instead of "Completed"
      case 'cancelled':
        return 'Dibatalkan'       // Instead of "Cancelled"
      case 'pending':
        return 'Belum Dibayar'    // Instead of "Pending"
      default:
        return status
    }
  }

  const canViewOrder = (status: string): boolean => {
    return true // Can view all orders
  }

  const isOrderModifiable = (createdAt: string): boolean => {
    const orderDate = new Date(createdAt)
    const now = new Date()
    const diffInHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60)
    
    // Return true if order is less than 24 hours old
    return diffInHours <= 24
  }

  // ===== HANDLERS =====
  const handleViewOrder = (order: FnbOrder) => {
    setSelectedOrder(order)
    setStatusDialogOpen(true)
  }

  const handleStatusDialogSuccess = async () => {
    await refreshOrders()
    if (onRefresh) {
      await onRefresh()
    }
    setStatusDialogOpen(false)
    setSelectedOrder(undefined)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  // ===== SESSION BADGE RENDERING =====
  const renderSessionBadge = (order: FnbOrder) => {
    if (!order.rentalSessionId) return null

    return (
      <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
        {order.unitName ? `📺 ${order.unitName}` : '📺 Session'}
      </Badge>
    )
  }

  // ===== FILTER BY DATE LOGIC =====
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
                                  {/* NEW: Show cancellation reason if cancelled */}
                                  {order.status === 'cancelled' && order.cancellationReason && (
                                    <p className="text-red-600 text-xs mt-1 flex items-center">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Dibatal: {order.cancellationReason}
                                      {order.cancelledByName && ` (oleh ${order.cancelledByName})`}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                {canViewOrder(order.status) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleViewOrder(order)}
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                )}
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
                        Loading more orders...
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-4 h-4 mr-2" />
                        Load More Orders ({totalOrders - orders.length} remaining)
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Pagination Info */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages} • {orders.length} of {totalOrders} orders loaded
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Order History</h3>
              <p className="text-gray-600 mb-4">
                {statusFilter !== 'all' 
                  ? `No ${statusFilter} orders found`
                  : 'No F&B orders have been placed yet'
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
        onSuccess={handleStatusDialogSuccess}
      />
    </>
  )
}