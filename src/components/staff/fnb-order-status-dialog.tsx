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
import { 
  Coffee, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

// ============================================
// TYPES (SIMPLIFIED)
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
// UTILS (SIMPLIFIED)
// ============================================

const getStatusColor = (status: FnbOrder['status']) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
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
      return <CheckCircle2 className="w-4 h-4" />
    case 'cancelled':
      return <XCircle className="w-4 h-4" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

const getStatusLabel = (status: FnbOrder['status']) => {
  const statusLabels = {
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }
  return statusLabels[status] || status
}

const getAvailableTransitions = (currentStatus: FnbOrder['status']): FnbOrder['status'][] => {
  switch (currentStatus) {
    case 'pending':
      return ['completed', 'cancelled']
    case 'completed':
      return ['cancelled'] // For refund scenarios
    case 'cancelled':
      return [] // No transitions from cancelled
    default:
      return []
  }
}

// ============================================
// COMPONENT
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

  const availableStatuses = getAvailableTransitions(order.status)
  const isStatusChangePossible = availableStatuses.length > 0
  const isCancellation = formData.newStatus === 'cancelled'
  const isPaid = order.paymentTiming === 'immediate' || order.status === 'completed'

  // ============================================
  // HANDLERS
  // ============================================

  const handleStatusUpdate = async () => {
    if (formData.newStatus === order.status) {
      toast.error('Please select a different status')
      return
    }

    if (isCancellation && !formData.reason.trim()) {
      toast.error('Please provide a reason for cancellation')
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
        throw new Error(data.error || 'Failed to update order status')
      }

      toast.success(`Order ${getStatusLabel(formData.newStatus).toLowerCase()}!`)
      onSuccess?.()
      onOpenChange(false)

    } catch (err) {
      console.error('Error updating order status:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update order status')
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
            F&B Order Status
          </DialogTitle>
          <DialogDescription>
            Update order status for this F&B order
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
                <span className="text-gray-600">Payment:</span>
                <span className={isPaid ? 'text-green-600' : 'text-yellow-600'}>
                  {isPaid ? 'Paid' : 'Pending'}
                  {order.paymentTiming === 'end_of_session' && ' (End of Session)'}
                </span>
              </div>

              {order.rentalSessionId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Session:</span>
                  <span>{order.customerName || 'Attached'}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Status Update */}
          {isStatusChangePossible ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select 
                  value={formData.newStatus} 
                  onValueChange={(value: FnbOrder['status']) => 
                    setFormData(prev => ({ ...prev, newStatus: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={order.status} disabled>
                      <div className="flex items-center">
                        {getStatusIcon(order.status)}
                        <span className="ml-2">{getStatusLabel(order.status)} (Current)</span>
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
                    <Label className="text-red-700 font-medium">Cancellation Details</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-red-700">Reason (Required)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Why is this order being cancelled?"
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      rows={2}
                      className="border-red-200"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="restoreStock"
                      checked={formData.restoreStock}
                      onChange={(e) => setFormData(prev => ({ ...prev, restoreStock: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="restoreStock" className="text-sm text-red-700">
                      Restore stock quantities
                    </Label>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No status changes available for this order</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          {isStatusChangePossible && (
            <Button 
              onClick={handleStatusUpdate}
              disabled={loading || formData.newStatus === order.status}
              variant={isCancellation ? "destructive" : "default"}
            >
              {loading ? (
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </div>
              ) : (
                <>
                  {isCancellation ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Update Status
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}