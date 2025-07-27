// src/components/staff/extend-session-dialog.tsx
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
  Clock, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Plus,
  DollarSign,
  Timer
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

interface ExtendSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: ActiveSession
  locationId: string
  hourlyRate: number
  onSuccess?: () => void
}

interface ExtendFormData {
  additionalDuration: number
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
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

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const calculateNewEndTime = (currentEndTime: string | undefined, additionalMinutes: number): string => {
  const baseTime = currentEndTime ? new Date(currentEndTime) : new Date()
  const newEndTime = new Date(baseTime.getTime() + additionalMinutes * 60 * 1000)
  return newEndTime.toISOString()
}

const calculateExtensionCost = (additionalMinutes: number, hourlyRate: number): number => {
  return Math.ceil((additionalMinutes / 60) * hourlyRate)
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ExtendSessionDialog({ 
  open, 
  onOpenChange, 
  session, 
  locationId,
  hourlyRate,
  onSuccess 
}: ExtendSessionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ExtendFormData>({
    additionalDuration: 30,
    paymentMethod: 'cash',
    notes: ''
  })

  if (!session) return null

  const extensionCost = calculateExtensionCost(formData.additionalDuration, hourlyRate)
  const newEndTime = calculateNewEndTime(session.estimatedEndTime, formData.additionalDuration)

  // ============================================
  // HANDLERS
  // ============================================

  const handleSubmit = async (): Promise<void> => {
    if (formData.additionalDuration < 15) {
      toast.error('Minimum extension is 15 minutes')
      return
    }

    if (formData.additionalDuration > 240) {
      toast.error('Maximum extension is 4 hours (240 minutes)')
      return
    }

    setLoading(true)

    try {
      const requestBody = {
        additionalDuration: formData.additionalDuration,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes || undefined
      }

      const response = await fetch(`/api/rentals/${session.id}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Session extended by ${formData.additionalDuration} minutes`)
        
        // Reset form
        setFormData({
          additionalDuration: 30,
          paymentMethod: 'cash',
          notes: ''
        })
        
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to extend session')
      }
    } catch (error) {
      console.error('Error extending session:', error)
      toast.error('Failed to extend session')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = (): void => {
    setFormData({
      additionalDuration: 30,
      paymentMethod: 'cash',
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
            <Clock className="w-5 h-5 mr-2" />
            Extend Session Time
          </DialogTitle>
          <DialogDescription>
            Add more time to the active session
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Session Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-gray-900">Current Session</h4>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Unit:</span>
                <p className="font-medium">{session.unitName}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Billing:</span>
                <p className="font-medium capitalize">{session.billingModel}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Started:</span>
                <p className="font-medium">{formatTime(session.startTime)}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Status:</span>
                <p className={`font-medium ${session.isOvertime ? 'text-red-600' : 'text-green-600'}`}>
                  {session.isOvertime ? 'Overtime' : 'Active'}
                </p>
              </div>
            </div>

            {session.estimatedEndTime && (
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-600">Current End Time:</span>
                <span className="font-medium">{formatTime(session.estimatedEndTime)}</span>
              </div>
            )}

            {session.remainingMinutes !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Time Remaining:</span>
                <span className={`font-medium ${session.isOvertime ? 'text-red-600' : 'text-blue-600'}`}>
                  {session.isOvertime 
                    ? `+${session.remainingMinutes}m overtime`
                    : `${session.remainingMinutes}m left`
                  }
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Extension Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Extension Details</h4>

            {/* Additional Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Additional Duration</Label>
              <Select 
                value={formData.additionalDuration.toString()} 
                onValueChange={(value: string) => 
                  setFormData(prev => ({ ...prev, additionalDuration: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Duration Input */}
            <div className="space-y-2">
              <Label htmlFor="custom-duration">Or Custom Duration (minutes)</Label>
              <Input
                id="custom-duration"
                type="number"
                placeholder="Enter minutes (15-240)"
                min="15"
                max="240"
                value={formData.additionalDuration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData(prev => ({ ...prev, additionalDuration: parseInt(e.target.value) || 30 }))
                }
              />
              <p className="text-xs text-gray-500">Minimum 15 minutes, maximum 4 hours (240 minutes)</p>
            </div>

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
          </div>

          <Separator />

          {/* Extension Summary */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-blue-900">Extension Summary</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-700">Additional Time:</span>
                <span className="font-medium text-blue-900">
                  {Math.floor(formData.additionalDuration / 60) > 0 && `${Math.floor(formData.additionalDuration / 60)}h `}
                  {formData.additionalDuration % 60 > 0 && `${formData.additionalDuration % 60}m`}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-blue-700">Extension Cost:</span>
                <span className="font-bold text-blue-900">{formatCurrency(extensionCost)}</span>
              </div>
              
              {session.estimatedEndTime && (
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">New End Time:</span>
                  <span className="font-medium text-blue-900">{formatTime(newEndTime)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                <span className="text-blue-700">Hourly Rate:</span>
                <span className="text-sm text-blue-600">{formatCurrency(hourlyRate)}/hour</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || formData.additionalDuration < 15}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Processing...' : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Extend Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}