// src/components/staff/stop-session-dialog.tsx
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
import { 
  StopCircle, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Coffee,
  Clock,
  Receipt,
  AlertTriangle,
  ShoppingBag
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
}

interface FnbOrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface AttachedFnbOrder {
  id: string
  totalAmount: number
  status: string
  items: FnbOrderItem[]
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
    const overtimeCost = chargeableOvertime > 0 ? Math.ceil((chargeableOvertime / 60) * hourlyRate) : 0
    
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

  const handleCancel = (): void => {
    onOpenChange(false)
  }

  // ============================================
  // CALCULATIONS
  // ============================================

  if (!session) return null

  const sessionDuration = calculateDuration(session.startTime)
  const sessionCosts = calculateSessionCost(session, hourlyRate)
  const totalAttachedFnb = attachedFnbOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const finalTotal = sessionCosts.totalCost + totalAttachedFnb + formData.fnbAmount

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <StopCircle className="w-5 h-5 mr-2" />
            Stop Session
          </DialogTitle>
          <DialogDescription>
            Complete the session and process payment
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Session Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Session Summary</h4>
              {session.isOvertime && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Overtime
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Unit:</span>
                <p className="font-medium">{session.unitName}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Duration:</span>
                <p className="font-medium">{sessionDuration}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Billing:</span>
                <p className="font-medium capitalize">{session.billingModel}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Status:</span>
                <p className={`font-medium ${session.isOvertime ? 'text-red-600' : 'text-green-600'}`}>
                  {session.isOvertime ? 'Overtime' : 'Normal'}
                </p>
              </div>
            </div>
          </div>

          {/* F&B Orders */}
          {fetchingFnb ? (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Coffee className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-sm text-blue-700">Loading F&B orders...</span>
              </div>
            </div>
          ) : attachedFnbOrders.length > 0 ? (
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center">
                <ShoppingBag className="w-4 h-4 mr-2 text-blue-600" />
                <h4 className="font-medium text-blue-900">Attached F&B Orders</h4>
              </div>
              
              <div className="space-y-2">
                {attachedFnbOrders.map((order) => (
                  <div key={order.id} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">Order #{order.id.slice(-6)}</span>
                      <span className="text-sm font-bold text-blue-600">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs text-gray-600">
                          <span>{item.quantity}x {item.name}</span>
                          <span>{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium text-blue-900">Total F&B Attached:</span>
                  <span className="text-sm font-bold text-blue-600">
                    {formatCurrency(totalAttachedFnb)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center text-gray-600">
                <Coffee className="w-4 h-4 mr-2" />
                <span className="text-sm">No F&B orders attached to this session</span>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
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
            <Label htmlFor="fnb">Additional F&B Amount (Optional)</Label>
            <div className="relative">
              <Input
                id="fnb"
                type="number"
                placeholder="0"
                min="0"
                step="1000"
                value={formData.fnbAmount || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData(prev => ({ ...prev, fnbAmount: parseFloat(e.target.value) || 0 }))
                }
                className="pl-8"
              />
              <Coffee className="w-4 h-4 absolute left-2.5 top-3 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500">
              Add manual F&B charges not in the attached orders
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                setFormData(prev => ({ ...prev, notes: e.target.value }))
              }
              rows={2}
            />
          </div>

          <Separator />

          {/* Payment Breakdown */}
          <div className="bg-green-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-green-900 mb-3">Payment Breakdown</h4>
            
            <div className="space-y-1 text-sm">
              {/* Session Cost */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Session ({session.billingModel}):</span>
                <span className="font-medium">
                  {formatCurrency(sessionCosts.baseCost)}
                </span>
              </div>
              
              {/* Overtime if any */}
              {sessionCosts.overtimeCost > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-red-600">Overtime:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(sessionCosts.overtimeCost)}
                  </span>
                </div>
              )}
              
              {/* Attached F&B */}
              {totalAttachedFnb > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">F&B (Attached):</span>
                  <span className="font-medium">
                    {formatCurrency(totalAttachedFnb)}
                  </span>
                </div>
              )}
              
              {/* Manual F&B */}
              {formData.fnbAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">F&B (Additional):</span>
                  <span className="font-medium">
                    {formatCurrency(formData.fnbAmount)}
                  </span>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="font-medium text-green-900">Final Total:</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Processing...' : (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                Stop & Process Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}