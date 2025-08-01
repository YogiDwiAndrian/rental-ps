// src/components/staff/fnb-order-status-dialog.tsx - FIXED logic and improved wording
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
  cancellationReason?: string    // NEW: Reason for cancellation
  cancelledAt?: string          // NEW: When was it cancelled  
  cancelledBy?: string          // NEW: User ID who cancelled
  cancelledByName?: string      // NEW: Name of user who cancelled
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

// ============================================
// IMPROVED STATUS SYSTEM - Better Wording
// ============================================

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
      return <DollarSign className="w-4 h-4" />  // Changed from CheckCircle2 to DollarSign
    case 'cancelled':
      return <XCircle className="w-4 h-4" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

// IMPROVED: Better wording for F&B order statuses
const getStatusLabel = (status: FnbOrder['status']) => {
  const statusLabels = {
    pending: 'Belum Dibayar',        // Instead of "Pending"
    completed: 'Sudah Dibayar',      // Instead of "Completed"  
    cancelled: 'Pesanan Dibatal'     // Instead of "Cancelled"
  }
  return statusLabels[status] || status
}

// FIXED: Proper status transitions - completed orders cannot be cancelled
const getAvailableTransitions = (currentStatus: FnbOrder['status']): FnbOrder['status'][] => {
  switch (currentStatus) {
    case 'pending':
      return ['completed', 'cancelled']  // From pending: can be paid or cancelled
    case 'completed':
      return []  // FIXED: Completed orders cannot be changed (payment already done)
    case 'cancelled':
      return []  // Cancelled orders cannot be changed
    default:
      return []
  }
}

// ============================================
// DATE VALIDATION FUNCTIONS
// ============================================

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

  // ===== DATE VALIDATION =====
  const orderTooOld = isOrderTooOld(order.createdAt)
  const orderAge = getOrderAge(order.createdAt)

  const availableStatuses = getAvailableTransitions(order.status)
  
  // Status changes possible only if not too old AND has available transitions
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

  const handleCancel = () => {
    setFormData({
      newStatus: order.status,
      reason: '',
      restoreStock: true,
      notes: ''
    })
    onOpenChange(false)
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Coffee className="w-5 h-5 mr-2" />
            Status Pesanan F&B
          </DialogTitle>
          <DialogDescription>
            Kelola status pembayaran dan pesanan F&B
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Order #{order.id.slice(-8)}</h4>
              <Badge className={getStatusColor(order.status)}>
                {getStatusIcon(order.status)}
                <span className="ml-1">{getStatusLabel(order.status)}</span>
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Items:</span>
                <span>{order.items.map(item => `${item.quantity}x ${item.fnbItemName}`).join(', ')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Pembayaran:</span>
                <span className={isPaid ? 'text-green-600' : 'text-orange-600'}>
                  {isPaid ? 'Sudah Dibayar' : 'Belum Dibayar'}
                  {order.paymentTiming === 'end_of_session' && ' (Bayar Akhir Session)'}
                </span>
              </div>

              {order.rentalSessionId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Session:</span>
                  <span>{order.customerName || 'Terlampir'}</span>
                </div>
              )}

              {order.createdByName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Dibuat oleh:</span>
                  <span className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {order.createdByName}
                  </span>
                </div>
              )}

              {/* NEW: Show cancellation info if order is cancelled */}
              {order.status === 'cancelled' && order.cancellationReason && (
                <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Alasan Dibatal:</span>
                    <span className="text-red-600 font-medium">{order.cancellationReason}</span>
                  </div>
                  {order.cancelledByName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dibatal oleh:</span>
                      <span className="flex items-center text-red-600">
                        <User className="w-3 h-3 mr-1" />
                        {order.cancelledByName}
                      </span>
                    </div>
                  )}
                  {order.cancelledAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Waktu Dibatal:</span>
                      <span className="text-red-600">{new Date(order.cancelledAt).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Dibuat:</span>
                <span className={orderTooOld ? 'text-red-600 font-medium' : ''}>
                  {new Date(order.createdAt).toLocaleString('id-ID')} ({orderAge})
                </span>
              </div>
            </div>
          </div>

          {/* Payment Status Information */}
          {order.status === 'completed' && (
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Pesanan Sudah Dibayar</p>
                  <p className="text-sm">
                    Pesanan yang sudah dibayar tidak dapat diubah statusnya.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* DATE RESTRICTION ALERT */}
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
                      rows={2}
                      className="border-red-200"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="restoreStock"
                      checked={formData.restoreStock}
                      onChange={(e) => setFormData(prev => ({ ...prev, restoreStock: e.target.checked }))}
                      className="rounded"
                      disabled={loading}
                    />
                    <Label htmlFor="restoreStock" className="text-sm text-red-700">
                      Kembalikan stok barang
                    </Label>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Tambahkan catatan jika diperlukan..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              {orderTooOld ? (
                <>
                  <CalendarX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Periode perubahan telah berakhir</p>
                  <p className="text-xs mt-1">Pesanan hanya bisa diubah dalam 24 jam sejak dibuat</p>
                </>
              ) : order.status === 'completed' ? (
                <>
                  <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Pesanan sudah dibayar</p>
                  <p className="text-xs mt-1">Pesanan yang sudah dibayar tidak dapat diubah</p>
                </>
              ) : (
                <>
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Tidak ada perubahan status yang tersedia</p>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {orderTooOld || !isStatusChangePossible ? 'Tutup' : 'Batal'}
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