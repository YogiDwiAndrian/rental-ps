// src/components/staff/stop-session-dialog.tsx - FIXED React Hooks Rules
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
  Package,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// TYPES
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
  hourlyRate: number  // REQUIRED: No fallback, must come from unit data
}

interface FnbOrderItem {
  id: string
  fnbItemId: string
  fnbItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface AttachedFnbOrder {
  id: string
  totalAmount: number
  status: 'pending' | 'completed' | 'cancelled'
  paymentTiming: 'immediate' | 'end_of_session'
  items: FnbOrderItem[]
  createdAt: string
}

interface StopSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: ActiveSession
  locationId: string
  onSuccess?: () => void  // REMOVED: hourlyRate prop - get from session data
}

interface StopFormData {
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
  fnbAmount: number
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
  const durationMs = now - start
  const durationMinutes = Math.floor(durationMs / (1000 * 60))
  
  // DEBUG: Log time calculation details
  console.log('⏱️ Duration Calculation:', {
    startTime,
    startTimeMs: start,
    currentTime: new Date().toISOString(),
    currentTimeMs: now,
    durationMs,
    durationMinutes,
    crossesMidnight: new Date(startTime).getDate() !== new Date().getDate()
  })
  
  return durationMinutes
}

const calculateSessionCost = (
  session: ActiveSession | undefined
): { baseCost: number; overtimeCost: number; totalCost: number } => {
  if (!session) {
    return { baseCost: 0, overtimeCost: 0, totalCost: 0 }
  }
  
  // CRITICAL: hourlyRate must be provided from unit data - no fallback allowed
  if (!session.hourlyRate || session.hourlyRate <= 0) {
    console.error('❌ CRITICAL ERROR: Missing or invalid hourlyRate for session', {
      sessionId: session.id,
      unitName: session.unitName,
      hourlyRate: session.hourlyRate
    })
    throw new Error('Hourly rate missing or invalid. Cannot calculate session cost.')
  }
  
  const hourlyRate = session.hourlyRate
  const actualMinutes = calculateActualDuration(session.startTime)
  
  // DEBUG: Log calculation details
  console.log('🕐 Overtime Calculation Debug:', {
    startTime: session.startTime,
    currentTime: new Date().toISOString(),
    actualMinutes,
    purchasedDuration: session.purchasedDuration,
    extendedDuration: session.extendedDuration,
    billingModel: session.billingModel,
    hourlyRate: hourlyRate  // Log the actual hourly rate being used
  })
  
  if (session.billingModel === 'timer') {
    const cost = Math.ceil((actualMinutes / 60) * hourlyRate)
    return { baseCost: cost, overtimeCost: 0, totalCost: cost }
  }
  
  if (session.billingModel === 'hourly' || session.billingModel === 'package') {
    const baseCost = session.totalAmount || 0
    const purchasedMinutes = (session.purchasedDuration || 0) + (session.extendedDuration || 0)
    const overtimeMinutes = Math.max(0, actualMinutes - purchasedMinutes)
    
    // DEBUG: Log overtime calculation
    console.log('🚨 Overtime Details:', {
      purchasedMinutes,
      actualMinutes,
      overtimeMinutes,
      graceApplied: Math.max(0, overtimeMinutes - 5),
      hourlyRate
    })
    
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
  onSuccess 
}: StopSessionDialogProps) {
  // ============================================
  // ALL HOOKS MUST BE CALLED FIRST
  // ============================================
  
  const [loading, setLoading] = useState(false)
  const [fetchingFnb, setFetchingFnb] = useState(false)
  const [attachedFnbOrders, setAttachedFnbOrders] = useState<AttachedFnbOrder[]>([])
  const [formData, setFormData] = useState<StopFormData>({
    paymentMethod: 'cash',
    fnbAmount: 0,
    notes: ''
  })

  // ============================================
  // ALL FUNCTIONS DEFINED BEFORE EFFECTS
  // ============================================

  const handleSubmit = async (): Promise<void> => {
    if (!session) {
      toast.error('No session available')
      return
    }

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

  // ============================================
  // ALL EFFECTS MUST BE CALLED AFTER FUNCTIONS
  // ============================================

  // ============================================
  // ALL EFFECTS MUST BE CALLED AFTER FUNCTIONS
  // ============================================

  useEffect(() => {
    if (!open || !session?.id) return

    const fetchAttachedFnbOrders = async (): Promise<void> => {
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
            console.log('🍕 Fetched F&B Orders for session:', result.data)
            setAttachedFnbOrders(result.data)
          }
        }
      } catch (error) {
        console.error('Error fetching F&B orders:', error)
      } finally {
        setFetchingFnb(false)
      }
    }

    fetchAttachedFnbOrders()
  }, [open, session?.id, locationId]) // Only these dependencies needed

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
  // COMPUTED VALUES & CONDITIONAL LOGIC AFTER ALL HOOKS
  // ============================================

  // Now safe to do conditional returns after all hooks are called
  if (!session) {
    return null
  }

  // Filter F&B orders by payment timing
  const unpaidFnbOrders = attachedFnbOrders.filter(order => 
    order.paymentTiming === 'end_of_session' && order.status !== 'cancelled'
  )
  
  const paidFnbOrders = attachedFnbOrders.filter(order => 
    order.paymentTiming === 'immediate' && order.status !== 'cancelled'
  )

  const sessionCost = calculateSessionCost(session)
  
  // CRITICAL FIX: Only include unpaid F&B orders in grand total
  const unpaidFnbTotal = unpaidFnbOrders.reduce((total, order) => total + order.totalAmount, 0)
  const paidFnbTotal = paidFnbOrders.reduce((total, order) => total + order.totalAmount, 0)
  
  // Grand total only includes session cost + unpaid F&B + manual F&B amount
  const grandTotal = sessionCost.totalCost + unpaidFnbTotal + formData.fnbAmount

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
          {/* Session Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Session Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700">Duration: <span className="font-medium">{calculateDuration(session.startTime)}</span></p>
                <p className="text-blue-700">Billing: <span className="font-medium capitalize">{session.billingModel}</span></p>
              </div>
              <div>
                <p className="text-blue-700">Base Cost: <span className="font-medium">{formatCurrency(sessionCost.baseCost)}</span></p>
                {sessionCost.overtimeCost > 0 && (
                  <p className="text-red-600">Overtime: <span className="font-medium">{formatCurrency(sessionCost.overtimeCost)}</span></p>
                )}
              </div>
            </div>
          </div>

          {/* Already Paid F&B Orders (Information Only) */}
          {paidFnbOrders.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-900 mb-3 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Already Paid F&B Orders ({paidFnbOrders.length})
              </h3>
              <div className="text-sm text-green-700 mb-2">
                These orders were paid immediately and are not included in session bill.
              </div>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {paidFnbOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between bg-white p-3 rounded border border-green-200 relative">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Badge variant="outline" className="text-xs bg-green-100 border-green-300 text-green-800 flex-shrink-0">
                          Paid
                        </Badge>
                        <span className="text-sm text-green-700 truncate">
                          {order.items.length} items • {order.items.map(item => `${item.quantity}x ${item.fnbItemName}`).join(', ')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-green-700 flex-shrink-0 ml-2">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="mt-2 pt-2 border-t border-green-300">
                <div className="flex justify-between text-sm font-medium text-green-800">
                  <span>Total Already Paid:</span>
                  <span>{formatCurrency(paidFnbTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* F&B Orders - End of Session Payment Only */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Coffee className="w-4 h-4 mr-2" />
              F&B Orders - End of Session Payment
              {fetchingFnb && <div className="w-3 h-3 animate-spin rounded-full border border-gray-400 border-t-transparent ml-2" />}
            </h3>

            {unpaidFnbOrders.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Coffee className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium">No F&B orders to be paid at session end</p>
                {paidFnbOrders.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    All F&B orders for this session were paid immediately
                  </p>
                )}
              </div>
            ) : (
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {unpaidFnbOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between bg-white p-3 rounded border border-yellow-200 relative">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Badge variant="outline" className="text-xs bg-yellow-100 border-yellow-300 text-yellow-800 flex-shrink-0">
                          Pending
                        </Badge>
                        <span className="text-sm text-yellow-700 truncate">
                          {order.items.length} items • {order.items.map(item => `${item.quantity}x ${item.fnbItemName}`).join(', ')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-yellow-700 flex-shrink-0 ml-2">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Cost Breakdown - FIXED CALCULATION */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Receipt className="w-4 h-4 mr-2" />
              Session Bill - Cost Breakdown
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
                <span>F&B Orders (End of Session):</span>
                <span className="font-medium">{formatCurrency(unpaidFnbTotal)}</span>
              </div>
              {formData.fnbAmount > 0 && (
                <div className="flex justify-between">
                  <span>Additional F&B:</span>
                  <span className="font-medium">{formatCurrency(formData.fnbAmount)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-base font-bold">
                <span>Grand Total:</span>
                <span className="text-green-600">{formatCurrency(grandTotal)}</span>
              </div>

              {/* ADDITIONAL INFO: Show already paid F&B summary */}
              {paidFnbTotal > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Already Paid F&B (Not included above):</span>
                    <span>{formatCurrency(paidFnbTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-gray-800 mt-1">
                    <span>Session Total Revenue:</span>
                    <span>{formatCurrency(grandTotal + paidFnbTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
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
                      Credit/Debit Card
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
                Stop Session & Process Payment ({formatCurrency(grandTotal)})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}