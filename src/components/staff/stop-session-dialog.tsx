// src/components/staff/stop-session-dialog.tsx
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { 
  StopCircle, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Coffee,
  Clock,
  DollarSign,
  Receipt
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
}

interface StopSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: ActiveSession
  locationId: string
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
  
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

const calculateFinalAmount = (session: ActiveSession, fnbAmount: number): number => {
  const baseAmount = session.totalAmount || 0
  
  if (session.billingModel === 'timer') {
    // Timer mode - calculate based on actual duration
    const start = new Date(session.startTime).getTime()
    const now = Date.now()
    const durationHours = (now - start) / (1000 * 60 * 60)
    const hourlyRate = 25000 // Default rate - this should come from session data
    return Math.ceil(durationHours * hourlyRate) + fnbAmount
  }
  
  if (session.billingModel === 'hourly' && session.isOvertime) {
    // Calculate overtime charges
    const overtimeMinutes = session.remainingMinutes ? Math.abs(session.remainingMinutes) : 0
    const overtimeHours = overtimeMinutes / 60
    const hourlyRate = 25000 // This should come from session data
    const overtimeCharge = Math.ceil(overtimeHours * hourlyRate)
    return baseAmount + overtimeCharge + fnbAmount
  }
  
  return baseAmount + fnbAmount
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
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<StopFormData>({
    paymentMethod: 'cash',
    fnbAmount: 0,
    notes: ''
  })

  if (!session) return null

  const sessionDuration = calculateDuration(session.startTime)
  const finalAmount = calculateFinalAmount(session, formData.fnbAmount)

  // ============================================
  // HANDLERS
  // ============================================

  const handleSubmit = async (): Promise<void> => {
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
        
        // Reset form
        setFormData({
          paymentMethod: 'cash',
          fnbAmount: 0,
          notes: ''
        })
        
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
    setFormData({
      paymentMethod: 'cash',
      fnbAmount: 0,
      notes: ''
    })
    onOpenChange(false)
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
            <h4 className="font-medium text-gray-900">Session Summary</h4>
            
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

            {session.isOvertime && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-red-800 text-sm font-medium">
                  ⚠️ Session is in overtime - additional charges may apply
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment">Payment Method</Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value: string) => 
                setFormData(prev => ({ ...prev, paymentMethod: value as 'cash' | 'card' | 'digital_wallet' }))
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

          {/* F&B Amount */}
          <div className="space-y-2">
            <Label htmlFor="fnb">F&B Amount (Optional)</Label>
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
              Add F&B charges if customer ordered food & beverages
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

          {/* Final Amount */}
          <div className="bg-green-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Session Total:</span>
              <span className="text-sm font-medium">
                {formatCurrency(session.totalAmount || 0)}
              </span>
            </div>
            
            {formData.fnbAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">F&B:</span>
                <span className="text-sm font-medium">
                  {formatCurrency(formData.fnbAmount)}
                </span>
              </div>
            )}
            
            {session.isOvertime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600">Overtime:</span>
                <span className="text-sm font-medium text-red-600">
                  {formatCurrency(finalAmount - (session.totalAmount || 0) - formData.fnbAmount)}
                </span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">Final Total:</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(finalAmount)}
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