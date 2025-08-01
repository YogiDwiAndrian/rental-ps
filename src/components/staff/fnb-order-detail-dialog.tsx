'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Coffee,
  Clock,
  DollarSign,
  Package2,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { GetSessionFnbOrdersResponse, ApiFnbOrder, isGetSessionFnbOrdersResponse } from '@/types/api'

// ============================================
// TYPES
// ============================================

interface FnbOrderDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  sessionUnitName: string
  locationId: string
}

export function FnbOrderDetailDialog({ 
  open, 
  onOpenChange, 
  sessionId, 
  sessionUnitName,
  locationId 
}: FnbOrderDetailDialogProps) {
  // ===== STATE =====
  const [orders, setOrders] = useState<ApiFnbOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // ===== FETCH F&B ORDERS =====
  const fetchFnbOrders = async () => {
    if (!sessionId || !locationId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/rentals/${sessionId}/fnb-orders?locationId=${locationId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch F&B orders')
      }

      if (!isGetSessionFnbOrdersResponse(data)) {
        throw new Error('Invalid API response format')
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch F&B orders')
      }

      setOrders(data.data || [])
    } catch (err) {
      console.error('Error fetching F&B orders:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch F&B orders'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // ===== EFFECTS =====
  useEffect(() => {
    if (open && sessionId) {
      fetchFnbOrders()
    }
  }, [open, sessionId, locationId])

  // ===== STATUS BADGE HELPER =====
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Selesai
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Dibatalkan
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        )
    }
  }

  // ===== PAYMENT TIMING BADGE =====
  const getPaymentTimingBadge = (paymentTiming?: string) => {
    switch (paymentTiming) {
      case 'immediate':
        return (
          <Badge variant="outline" className="text-xs">
            <DollarSign className="w-3 h-3 mr-1" />
            Bayar Langsung
          </Badge>
        )
      case 'end_of_session':
        return (
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Bayar Akhir Session
          </Badge>
        )
      default:
        return null
    }
  }

  // ===== CALCULATE TOTALS =====
  const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const totalItems = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-orange-600" />
            F&B Orders Detail
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Unit: <span className="font-medium">{sessionUnitName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header dengan refresh button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Total: <span className="font-medium">{orders.length} orders</span> | 
                Items: <span className="font-medium">{totalItems}</span>
              </div>
              {totalAmount > 0 && (
                <div className="text-sm font-medium text-green-700">
                  {formatCurrency(totalAmount)}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchFnbOrders}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>

          <Separator />

          {/* Content */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
                <p className="text-gray-600">Loading F&B orders...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-400" />
                <p className="text-red-600 mb-4">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchFnbOrders}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Coba Lagi
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Coffee className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Tidak ada F&B orders untuk session ini</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order, index) => (
                  <div key={order.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    {/* Order Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package2 className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium">Order #{index + 1}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(order.createdAt)} - {formatTime(order.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg text-green-700">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        {order.paymentTiming && getPaymentTimingBadge(order.paymentTiming)}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Items:</h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{item.fnbItemName}</div>
                              <div className="text-xs text-gray-500">
                                {item.quantity} x {formatCurrency(item.unitPrice)}
                              </div>
                            </div>
                            <div className="text-sm font-medium">
                              {formatCurrency(item.totalPrice)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Info */}
                    {(order.paidAt || order.cancelledAt) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 space-y-1">
                          {order.paidAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              Dibayar: {formatDate(order.paidAt)} - {formatTime(order.paidAt)}
                            </div>
                          )}
                          {order.cancelledAt && (
                            <div className="flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-500" />
                              Dibatalkan: {formatDate(order.cancelledAt)} - {formatTime(order.cancelledAt)}
                            </div>
                          )}
                          {order.cancellationReason && (
                            <div className="text-xs text-red-600 mt-1">
                              Alasan: {order.cancellationReason}
                            </div>
                          )}
                          {order.stockRestored !== undefined && order.status === 'cancelled' && (
                            <div className="flex items-center gap-1">
                              <Package2 className="w-3 h-3" />
                              Stock {order.stockRestored ? 'dikembalikan' : 'tidak dikembalikan'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer dengan summary */}
          {orders.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{orders.length}</span> orders, 
                  <span className="font-medium ml-1">{totalItems}</span> total items
                </div>
                <div className="text-lg font-semibold text-green-700">
                  Total: {formatCurrency(totalAmount)}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}