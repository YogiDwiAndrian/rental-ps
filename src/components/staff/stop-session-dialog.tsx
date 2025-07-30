// src/components/staff/stop-session-dialog.tsx - FIXED F&B ITEM DISPLAY
'use client'

import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  StopCircle, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Coffee,
  Clock,
  Receipt,
  AlertTriangle,
  ShoppingBag,
  Package
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// TYPES - FIXED F&B ORDER STRUCTURE
// ============================================

interface ActiveSession {
  id: string
  unitId: string
  unitName: string
  billingModel: 'timer' | 'hourly' | 'package'
  startTime: string
  estimatedEndTime?: string
  remainingMinutes?: number
  totalAmount?: number
  isOvertime: boolean
  purchasedDuration?: number
  extendedDuration?: number
}

// FIXED: Updated F&B types to match API response
interface FnbOrderItem {
  id: string
  fnbItemId: string
  fnbItemName: string  // FIXED: This should contain the item name
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface AttachedFnbOrder {
  id: string
  totalAmount: number
  status: 'pending' | 'completed' | 'cancelled'
  paymentTiming: 'immediate' | 'end_of_session'
  items: FnbOrderItem[]  // FIXED: Include items array
  createdAt: string
}

interface StopSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: ActiveSession
  locationId: string
  hourlyRate?: number
  onSuccess?: () => void
}

interface StopFormData {
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
  fnbAmount: number
  notes: string
}

// ============================================
// UTILS
// ============================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const calculateDuration = (startTime: string): string => {
  const start = new Date(startTime).getTime()
  const now = Date.now()
  const durationMs = now - start
  const totalMinutes = Math.floor(durationMs / (1000 * 60))
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  if (hours === 0) return `${minutes} menit`
  if (minutes === 0) return `${hours} jam`
  return `${hours} jam ${minutes} menit`
}

const calculateActualDuration = (startTime: string): number => {
  const start = new Date(startTime).getTime()
  const now = Date.now()
  return Math.floor((now - start) / (1000 * 60))
}

const calculateSessionCost = (
  session: ActiveSession, 
  hourlyRate: number = 25000
): { baseCost: number; overtimeCost: number; totalCost: number } => {
  const actualMinutes = calculateActualDuration(session.startTime)
  
  if (session.billingModel === 'timer') {
    const cost = Math.ceil((actualMinutes / 60) * hourlyRate)
    return { baseCost: cost, overtimeCost: 0, totalCost: cost }
  }
  
  if (session.billingModel === 'hourly' || session.billingModel === 'package') {
    const baseCost = session.totalAmount || 0
    const purchasedMinutes = (session.purchasedDuration || 0) + (session.extendedDuration || 0)
    const overtimeMinutes = Math.max(0, actualMinutes - purchasedMinutes)
    
    // 5 minute grace period
    const chargeableOvertime = Math.max(0, overtimeMinutes - 5)
    const overtimeCost = chargeableOvertime > 0 ? 
      Math.ceil((chargeableOvertime / 60) * hourlyRate) : 0
    
    return { 
      baseCost: baseCost, 
      overtimeCost: overtimeCost, 
      totalCost: baseCost + overtimeCost 
    }
  }
  
  return { baseCost: 0, overtimeCost: 0, totalCost: 0 }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StopSessionDialog({ 
  open, 
  onOpenChange, 
  session, 
  locationId, 
  hourlyRate = 25000,
  onSuccess 
}: StopSessionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [fetchingFnb, setFetchingFnb] = useState(false)
  const [attachedFnbOrders, setAttachedFnbOrders] = useState<AttachedFnbOrder[]>([])
  const [formData, setFormData] = useState<StopFormData>({
    paymentMethod: 'cash',
    fnbAmount: 0,
    notes: ''
  })

  // ============================================
  // EFFECTS
  // ============================================

  // Fetch attached F&B orders when dialog opens
  useEffect(() => {
    if (open && session) {
      fetchAttachedFnbOrders()
    }
  }, [open, session])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        paymentMethod: 'cash',
        fnbAmount: 0,
        notes: ''
      })
      setAttachedFnbOrders([])
    }
  }, [open])

  // ============================================
  // HANDLERS
  // ============================================

  const fetchAttachedFnbOrders = async (): Promise<void> => {
    if (!session) return

    setFetchingFnb(true)
    try {
      const response = await fetch(`/api/fnb/orders?sessionId=${session.id}`, {
        headers: {
          'X-Location-ID': locationId
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setAttachedFnbOrders(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching F&B orders:', error)
      // Don't show error toast as this is not critical
    } finally {
      setFetchingFnb(false)
    }
  }

  const handleSubmit = async (): Promise<void> => {
    if (!session) return

    if (formData.fnbAmount < 0) {
      toast.error('F&B amount cannot be negative')
      return
    }

    setLoading(true)

    try {
      const requestBody = {
        paymentMethod: formData.paymentMethod,
        fnbAmount: formData.fnbAmount > 0 ? formData.fnbAmount : undefined,
        notes: formData.notes || undefined
      }

      const response = await fetch(`/api/rentals/${session.id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Session stopped for ${session.unitName}`)
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to stop session')
      }
    } catch (error) {
      console.error('Error stopping session:', error)
      toast.error('Failed to stop session')
    } finally {
      setLoading(false)
    }
  }

  if (!session) return null

  // ============================================
  // CALCULATIONS
  // ============================================

  const sessionCost = calculateSessionCost(session, hourlyRate)
  const fnbTotal = attachedFnbOrders.reduce((total, order) => total + order.totalAmount, 0)
  const grandTotal = sessionCost.totalCost + fnbTotal + formData.fnbAmount

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <StopCircle className="w-5 h-5 mr-2 text-red-600" />
            Stop Session - {session.unitName}
          </DialogTitle>
          <DialogDescription>
            Calculate final bill and process payment for this gaming session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* Session Details */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Session Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Unit:</span>
                <div className="font-medium">{session.unitName}</div>
              </div>
              <div>
                <span className="text-blue-700">Duration:</span>
                <div className="font-medium">{calculateDuration(session.startTime)}</div>
              </div>
              <div>
                <span className="text-blue-700">Billing:</span>
                <div className="font-medium capitalize">{session.billingModel}</div>
              </div>
              <div>
                <span className="text-blue-700">Started:</span>
                <div className="font-medium">{new Date(session.startTime).toLocaleString()}</div>
              </div>
            </div>
            
            {session.isOvertime && (
              <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded">
                <div className="flex items-center text-red-700">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Session is overtime</span>
                </div>
              </div>
            )}
          </div>

          {/* F&B Orders - FIXED DISPLAY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 flex items-center">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Attached F&B Orders
              </h3>
              {fetchingFnb && (
                <div className="text-sm text-gray-500">Loading...</div>
              )}
            </div>

            {attachedFnbOrders.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Coffee className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No F&B orders attached to this session</p>
              </div>
            ) : (
              <ScrollArea className="max-h-48">
                <div className="space-y-3">
                  {attachedFnbOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            Order #{order.id.substring(0, 8)}
                          </Badge>
                          <Badge 
                            variant={order.status === 'completed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium">
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </div>

                      {/* FIXED: Display F&B items with names */}
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <Package className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-700">{item.fnbItemName}</span>
                              <span className="text-gray-500">x{item.quantity}</span>
                            </div>
                            <span className="text-gray-700 font-medium">
                              {formatCurrency(item.totalPrice)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Payment:</span>
                          <span className={order.paymentTiming === 'immediate' ? 'text-green-600' : 'text-yellow-600'}>
                            {order.paymentTiming === 'immediate' ? 'Already Paid' : 'End of Session'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Created:</span>
                          <span>{new Date(order.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Cost Breakdown */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Receipt className="w-4 h-4 mr-2" />
              Cost Breakdown
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Session Cost:</span>
                <span className="font-medium">{formatCurrency(sessionCost.baseCost)}</span>
              </div>
              {sessionCost.overtimeCost > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Overtime Cost:</span>
                  <span className="font-medium">{formatCurrency(sessionCost.overtimeCost)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>F&B Orders:</span>
                <span className="font-medium">{formatCurrency(fnbTotal)}</span>
              </div>
              {formData.fnbAmount > 0 && (
                <div className="flex justify-between">
                  <span>Additional F&B:</span>
                  <span className="font-medium">{formatCurrency(formData.fnbAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Grand Total:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value: 'cash' | 'card' | 'digital_wallet') => 
                setFormData(prev => ({ ...prev, paymentMethod: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center">
                    <Banknote className="w-4 h-4 mr-2" />
                    Cash
                  </div>
                </SelectItem>
                <SelectItem value="card">
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Card
                  </div>
                </SelectItem>
                <SelectItem value="digital_wallet">
                  <div className="flex items-center">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Digital Wallet
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional F&B Amount */}
          <div className="space-y-2">
            <Label htmlFor="fnbAmount">Additional F&B Amount</Label>
            <Input
              id="fnbAmount"
              type="number"
              placeholder="0"
              value={formData.fnbAmount || ''}
              onChange={(e) => 
                setFormData(prev => ({ 
                  ...prev, 
                  fnbAmount: Math.max(0, parseInt(e.target.value) || 0)
                }))
              }
            />
            <p className="text-xs text-gray-600">
              Add any additional F&B purchases not recorded in the system
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this session..."
              value={formData.notes}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              <>
                <StopCircle className="w-4 h-4 mr-2" />
                Stop Session & Process Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}