// src/components/staff/fnb-order-status-dialog.tsx - FIXED with stockRestored field
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Coffee, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  AlertTriangle,
  CalendarX,
  User,
  DollarSign,
  Package
} from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '../ui/card'

// ============================================
// TYPES
// ============================================

interface FnbOrderItem {
  id: string
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
  customerName?: string
  notes?: string
  createdAt: string
  createdBy?: string
  createdByName?: string
  cancellationReason?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelledByName?: string
  stockRestored?: boolean  // NEW: Add stockRestored field
}

interface FnbOrderStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: FnbOrder
  locationId: string
  onSuccess?: () => void
}

interface StatusUpdateFormData {
  newStatus: FnbOrder['status']
  reason: string
  restoreStock: boolean
  notes: string
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

const getStatusLabel = (status: FnbOrder['status']) => {
  const statusLabels = {
    pending: 'Belum Dibayar',
    completed: 'Sudah Dibayar',
    cancelled: 'Pesanan Dibatal'
  }
  return statusLabels[status] || status
}

const getAvailableTransitions = (currentStatus: FnbOrder['status']): FnbOrder['status'][] => {
  switch (currentStatus) {
    case 'pending':
      return ['completed', 'cancelled']
    case 'completed':
      return [] // Completed orders cannot be changed
    case 'cancelled':
      return [] // Cancelled orders cannot be changed
    default:
      return []
  }
}

const isOrderTooOld = (createdAt: string): boolean => {
  const orderDate = new Date(createdAt)
  const now = new Date()
  const diffInHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60)
  return diffInHours > 24
}

const getOrderAge = (createdAt: string): string => {
  const orderDate = new Date(createdAt)
  const now = new Date()
  const diffInHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60)
    return `${diffInMinutes} menit lalu`
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} jam lalu`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} hari lalu`
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FnbOrderStatusDialog({
  open,
  onOpenChange,
  order,
  locationId,
  onSuccess
}: FnbOrderStatusDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<StatusUpdateFormData>({
    newStatus: order?.status || 'pending',
    reason: '',
    restoreStock: true,
    notes: ''
  })

  if (!order) return null

  const orderTooOld = isOrderTooOld(order.createdAt)
  const orderAge = getOrderAge(order.createdAt)
  const availableStatuses = getAvailableTransitions(order.status)
  const isStatusChangePossible = availableStatuses.length > 0 && !orderTooOld
  const isCancellation = formData.newStatus === 'cancelled'
  const isPaid = order.status === 'completed'

  // ============================================
  // HANDLERS
  // ============================================

  const handleStatusUpdate = async () => {
    if (orderTooOld) {
      toast.error('Pesanan yang sudah lebih dari 24 jam tidak bisa diubah')
      return
    }

    if (formData.newStatus === order.status) {
      toast.error('Pilih status yang berbeda')
      return
    }

    if (isCancellation && !formData.reason.trim()) {
      toast.error('Alasan pembatalan harus diisi')
      return
    }

    try {
      setLoading(true)

      const requestBody = {
        status: formData.newStatus,
        reason: formData.reason.trim() || undefined,
        restore_stock: isCancellation ? formData.restoreStock : false,
        notes: formData.notes.trim() || undefined
      }

      const response = await fetch(`/api/fnb/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengubah status pesanan')
      }

      toast.success(`Pesanan ${getStatusLabel(formData.newStatus).toLowerCase()}!`)
      onSuccess?.()
      onOpenChange(false)

    } catch (err) {
      console.error('Error updating order status:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status pesanan')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Coffee className="w-5 h-5 mr-2" />
            Detail Pesanan F&B
          </DialogTitle>
          <DialogDescription>
            Kelola status pesanan dan pembayaran F&B
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <Card className="p-4 bg-gray-50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status Saat Ini</span>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusIcon(order.status)}
                  <span className="ml-1">{getStatusLabel(order.status)}</span>
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Pesanan</span>
                <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Jumlah Item</span>
                <span className="font-medium">{order.items.length} items</span>
              </div>
              {order.customerName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Customer</span>
                  <span className="font-medium">{order.customerName}</span>
                </div>
              )}
              
              {/* Show cancellation info if cancelled */}
              {order.status === 'cancelled' && (
                <div className="pt-2 border-t space-y-1">
                  {order.cancellationReason && (
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-red-600">Alasan Dibatal</span>
                      <span className="text-sm text-red-800 font-medium text-right max-w-48">
                        {order.cancellationReason}
                      </span>
                    </div>
                  )}
                  {order.cancelledByName && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600">Dibatal Oleh</span>
                      <span className="text-sm text-red-800">{order.cancelledByName}</span>
                    </div>
                  )}
                  {/* NEW: Show stock restoration status */}
                  {order.stockRestored !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600">Status Stok</span>
                      <Badge 
                        variant="outline"
                        className={
                          order.stockRestored 
                            ? "bg-blue-100 text-blue-800 border-blue-200" 
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }
                      >
                        <Package className="w-3 h-3 mr-1" />
                        {order.stockRestored ? "Dikembalikan" : "Tidak Dikembalikan"}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Order Items */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Item Pesanan</Label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                  <span>{item.fnbItemName}</span>
                  <span>{item.quantity}x {formatCurrency(item.unitPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Date restriction alert */}
          {orderTooOld && (
            <Alert variant="destructive">
              <CalendarX className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Pesanan Terlalu Lama</p>
                  <p className="text-sm">
                    Pesanan F&B tidak dapat diubah setelah 24 jam sejak dibuat. 
                    Pesanan ini dibuat {orderAge}.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Update */}
          {isStatusChangePossible ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ubah Status</Label>
                <Select 
                  value={formData.newStatus} 
                  onValueChange={(value: FnbOrder['status']) => 
                    setFormData(prev => ({ ...prev, newStatus: value }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={order.status} disabled>
                      <div className="flex items-center">
                        {getStatusIcon(order.status)}
                        <span className="ml-2">{getStatusLabel(order.status)} (Saat Ini)</span>
                      </div>
                    </SelectItem>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center">
                          {getStatusIcon(status)}
                          <span className="ml-2">{getStatusLabel(status)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cancellation Options */}
              {isCancellation && (
                <div className="space-y-3 p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                    <Label className="text-red-700 font-medium">Detail Pembatalan</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-red-700">Alasan Pembatalan (Wajib Diisi)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Mengapa pesanan ini dibatalkan?"
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      className="border-red-200 focus:border-red-400"
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="restoreStock"
                      checked={formData.restoreStock}
                      onChange={(e) => setFormData(prev => ({ ...prev, restoreStock: e.target.checked }))}
                      className="rounded border-red-300"
                      disabled={loading}
                    />
                    <Label htmlFor="restoreStock" className="text-red-700 text-sm">
                      Kembalikan stok item ke inventory
                    </Label>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Catatan internal atau informasi tambahan..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {orderTooOld 
                  ? `Pesanan ini sudah terlalu lama (${orderAge}) dan tidak dapat diubah.`
                  : `Status pesanan "${getStatusLabel(order.status)}" tidak dapat diubah lagi.`
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {isStatusChangePossible ? 'Batal' : 'Tutup'}
          </Button>
          {isStatusChangePossible && (
            <Button 
              onClick={handleStatusUpdate}
              disabled={loading || formData.newStatus === order.status || orderTooOld}
              variant={isCancellation ? "destructive" : "default"}
            >
              {loading ? (
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Mengubah...
                </div>
              ) : (
                <>
                  {isCancellation ? <XCircle className="w-4 h-4 mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                  Ubah Status
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}