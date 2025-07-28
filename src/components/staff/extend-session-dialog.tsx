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
  Clock, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Plus,
  Timer,
  Package,
  AlertCircle,
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
  customDuration: string
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

const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

const calculateNewEndTime = (currentEndTime: string | undefined, additionalMinutes: number): string => {
  const baseTime = currentEndTime ? new Date(currentEndTime) : new Date()
  const newEndTime = new Date(baseTime.getTime() + additionalMinutes * 60 * 1000)
  return newEndTime.toISOString()
}

const calculateExtensionCost = (additionalMinutes: number, hourlyRate: number): number => {
  return Math.ceil((additionalMinutes / 60) * hourlyRate)
}

const getBillingModelInfo = (billingModel: 'timer' | 'hourly' | 'package') => {
  switch (billingModel) {
    case 'timer':
      return {
        icon: <Timer className="w-4 h-4" />,
        label: 'Pay at End',
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      }
    case 'hourly':
      return {
        icon: <Clock className="w-4 h-4" />,
        label: 'Pre-paid',
        color: 'bg-green-100 text-green-800 border-green-200'
      }
    case 'package':
      return {
        icon: <Package className="w-4 h-4" />,
        label: 'Package Deal',
        color: 'bg-purple-100 text-purple-800 border-purple-200'
      }
    default:
      return {
        icon: <CreditCard className="w-4 h-4" />,
        label: 'Unknown',
        color: 'bg-gray-100 text-gray-800 border-gray-200'
      }
  }
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
  const [useCustomDuration, setUseCustomDuration] = useState(false)
  const [formData, setFormData] = useState<ExtendFormData>({
    additionalDuration: 30,
    customDuration: '',
    paymentMethod: 'cash',
    notes: ''
  })

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        additionalDuration: 30,
        customDuration: '',
        paymentMethod: 'cash',
        notes: ''
      })
      setUseCustomDuration(false)
    }
  }, [open])

  if (!session) return null

  const actualDuration = useCustomDuration 
    ? parseInt(formData.customDuration) || 0 
    : formData.additionalDuration

  const extensionCost = calculateExtensionCost(actualDuration, hourlyRate)
  const newEndTime = calculateNewEndTime(session.estimatedEndTime, actualDuration)
  const billingInfo = getBillingModelInfo(session.billingModel)

  const isValidDuration = actualDuration >= 15 && actualDuration <= 240
  const customDurationError = useCustomDuration && formData.customDuration && !isValidDuration

  // ============================================
  // HANDLERS
  // ============================================

  const handleSubmit = async (): Promise<void> => {
    if (!isValidDuration) {
      toast.error('Duration must be between 15 minutes and 4 hours')
      return
    }

    setLoading(true)

    try {
      const requestBody = {
        additionalDuration: actualDuration,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes.trim() || undefined
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
        toast.success(`Session extended by ${formatDuration(actualDuration)}`)
        onOpenChange(false)
        onSuccess?.()} else {
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
    onOpenChange(false)
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-4 h-4" />
      case 'card':
        return <CreditCard className="w-4 h-4" />
      case 'digital_wallet':
        return <Smartphone className="w-4 h-4" />
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Extend Session Time
          </DialogTitle>
          <DialogDescription>
            Add more time to the active session for {session.unitName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Session Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-900">Current Session</h4>
              <Badge variant="outline" className={billingInfo.color}>
                {billingInfo.icon}
                <span className="ml-2">{billingInfo.label}</span>
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Unit:</span>
                <p className="text-blue-900 font-semibold">{session.unitName}</p>
              </div>
              
              <div>
                <span className="text-blue-700 font-medium">Started:</span>
                <p className="text-blue-900 font-semibold">{formatTime(session.startTime)}</p>
              </div>
              
              {session.estimatedEndTime && (
                <div>
                  <span className="text-blue-700 font-medium">Current End:</span>
                  <p className="text-blue-900 font-semibold">{formatTime(session.estimatedEndTime)}</p>
                </div>
              )}
              
              <div>
                <span className="text-blue-700 font-medium">Status:</span>
                <div className="flex items-center">
                  {session.isOvertime ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500 mr-1" />
                      <span className="text-red-600 font-semibold">Overtime</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-green-600 font-semibold">Active</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {session.remainingMinutes !== undefined && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 font-medium">Time Remaining:</span>
                  <span className={`font-bold ${session.isOvertime ? 'text-red-600' : 'text-green-600'}`}>
                    {session.isOvertime 
                      ? `+${formatDuration(Math.abs(session.remainingMinutes))} overtime`
                      : formatDuration(session.remainingMinutes)
                    }
                  </span>
                </div>
              </div>
            )}

            {session.totalAmount && session.totalAmount > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 font-medium">Current Total:</span>
                  <span className="text-blue-900 font-bold">{formatCurrency(session.totalAmount)}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Extension Configuration */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Extension Details</h4>

            {/* Duration Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Additional Duration</Label>
              
              {!useCustomDuration ? (
                <div className="space-y-2">
                  <Select 
                    value={formData.additionalDuration.toString()} 
                    onValueChange={(value: string) => 
                      setFormData(prev => ({ ...prev, additionalDuration: parseInt(value) }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={() => setUseCustomDuration(true)}
                    className="text-blue-600 hover:text-blue-700 h-8"
                  >
                    Custom duration
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Enter minutes (15-240)"
                        value={formData.customDuration}
                        onChange={(e) => setFormData(prev => ({ ...prev, customDuration: e.target.value }))}
                        min={15}
                        max={240}
                        className={customDurationError ? 'border-red-300 focus:border-red-500' : ''}
                      />
                      {customDurationError && (
                        <p className="text-xs text-red-600 mt-1">Duration must be 15-240 minutes</p>
                      )}
                    </div>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setUseCustomDuration(false)
                        setFormData(prev => ({ ...prev, customDuration: '' }))
                      }}
                      className="px-3"
                    >
                      Preset
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Method</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value: 'cash' | 'card' | 'digital_wallet') => 
                  setFormData(prev => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center">
                      <Banknote className="w-4 h-4 mr-2" />
                      Cash Payment
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Card Payment
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
              <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about the extension..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <Separator />

          {/* Extension Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-3">Extension Summary</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-green-700">Extension Duration:</span>
                <span className="font-bold text-green-900">
                  {formatDuration(actualDuration)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-green-700">Extension Cost:</span>
                <span className="font-bold text-green-900">{formatCurrency(extensionCost)}</span>
              </div>
              
              {session.estimatedEndTime && (
                <div className="flex items-center justify-between">
                  <span className="text-green-700">New End Time:</span>
                  <span className="font-bold text-green-900">{formatTime(newEndTime)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-green-700">Payment Method:</span>
                <div className="flex items-center font-medium text-green-900">
                  {getPaymentMethodIcon(formData.paymentMethod)}
                  <span className="ml-1 capitalize">
                    {formData.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-green-200">
                <span className="text-green-700">Hourly Rate:</span>
                <span className="text-sm text-green-600">{formatCurrency(hourlyRate)}/hour</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !isValidDuration}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <>
                <Timer className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Extend {formatDuration(actualDuration)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}