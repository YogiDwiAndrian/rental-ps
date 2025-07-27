// src/components/staff/start-session-dialog.tsx
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
import { 
  PlayCircle, 
  Clock, 
  Timer, 
  Package, 
  Gamepad,
  User
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// TYPES
// ============================================

interface Unit {
  id: string
  name: string
  consoleType: string
  controllerCount: number
  hourlyRate: number
  customerDisplayName?: string
  packages?: Array<{
    id: string
    name: string
    durationMinutes: number
    price: number
    description?: string
  }>
}

interface StartSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  units: Unit[]
  selectedUnit?: Unit
  locationId: string
  onSuccess?: () => void
}

interface SessionFormData {
  unitId: string
  billingModel: 'timer' | 'hourly' | 'package'
  customerName: string
  purchasedDuration: number
  packageId: string
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

// ============================================
// MAIN COMPONENT
// ============================================

export function StartSessionDialog({ 
  open, 
  onOpenChange, 
  units, 
  selectedUnit, 
  locationId, 
  onSuccess 
}: StartSessionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<SessionFormData>({
    unitId: selectedUnit?.id || '',
    billingModel: 'timer',
    customerName: '',
    purchasedDuration: 60,
    packageId: '',
    notes: ''
  })

  // Get selected unit details
  const currentUnit = units.find(unit => unit.id === formData.unitId)

  // Calculate estimated cost
  const getEstimatedCost = (): number => {
    if (!currentUnit) return 0

    switch (formData.billingModel) {
      case 'timer':
        return 0 // Pay at end
      case 'hourly':
        return (formData.purchasedDuration / 60) * currentUnit.hourlyRate
      case 'package':
        const selectedPackage = currentUnit.packages?.find(pkg => pkg.id === formData.packageId)
        return selectedPackage?.price || 0
      default:
        return 0
    }
  }

  // ============================================
  // HANDLERS
  // ============================================

  const handleSubmit = async () => {
    // Validation
    if (!formData.unitId) {
      toast.error('Please select a unit')
      return
    }

    if (formData.billingModel === 'hourly' && formData.purchasedDuration < 15) {
      toast.error('Minimum duration is 15 minutes')
      return
    }

    if (formData.billingModel === 'package' && !formData.packageId) {
      toast.error('Please select a package')
      return
    }

    setLoading(true)

    try {
      const requestBody = {
        unitId: formData.unitId,
        billingModel: formData.billingModel,
        customerName: formData.customerName || undefined,
        purchasedDuration: formData.billingModel === 'hourly' ? formData.purchasedDuration : undefined,
        packageId: formData.billingModel === 'package' ? formData.packageId : undefined,
        notes: formData.notes || undefined
      }

      const response = await fetch('/api/rentals/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Session started for ${result.data.unitName}`)
        
        // Reset form
        setFormData({
          unitId: '',
          billingModel: 'timer',
          customerName: '',
          purchasedDuration: 60,
          packageId: '',
          notes: ''
        })
        
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to start session')
      }
    } catch (error) {
      console.error('Error starting session:', error)
      toast.error('Failed to start session')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      unitId: selectedUnit?.id || '',
      billingModel: 'timer',
      customerName: '',
      purchasedDuration: 60,
      packageId: '',
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
            <PlayCircle className="w-5 h-5 mr-2" />
            Start New Session
          </DialogTitle>
          <DialogDescription>
            Configure and start a new gaming session
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Unit Selection */}
          <div className="space-y-2">
            <Label htmlFor="unit">Select Unit</Label>
            <Select 
              value={formData.unitId} 
              onValueChange={(value: string) => setFormData(prev => ({ ...prev, unitId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose available unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    <div className="flex items-center">
                      <Gamepad className="w-4 h-4 mr-2" />
                      {unit.customerDisplayName || unit.name} - {unit.consoleType}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Model */}
          <div className="space-y-2">
            <Label htmlFor="billing">Billing Model</Label>
            <Select 
              value={formData.billingModel} 
              onValueChange={(value: string) => 
                setFormData(prev => ({ ...prev, billingModel: value as 'timer' | 'hourly' | 'package', packageId: '' }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timer">
                  <div className="flex items-center">
                    <Timer className="w-4 h-4 mr-2" />
                    Timer (Pay at end)
                  </div>
                </SelectItem>
                <SelectItem value="hourly">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Hourly (Pre-paid)
                  </div>
                </SelectItem>
                <SelectItem value="package">
                  <div className="flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    Package Deal
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration for Hourly */}
          {formData.billingModel === 'hourly' && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select 
                value={formData.purchasedDuration.toString()} 
                onValueChange={(value: string) => 
                  setFormData(prev => ({ ...prev, purchasedDuration: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Package Selection */}
          {formData.billingModel === 'package' && currentUnit?.packages && (
            <div className="space-y-2">
              <Label htmlFor="package">Select Package</Label>
              <Select 
                value={formData.packageId} 
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, packageId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose package" />
                </SelectTrigger>
                <SelectContent>
                  {currentUnit.packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      <div className="flex flex-col items-start">
                        <span>{pkg.name} - {pkg.durationMinutes}m</span>
                        <span className="text-sm text-gray-500">{formatCurrency(pkg.price)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer Name (Optional)</Label>
            <Input
              id="customer"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Cost Estimation */}
          {currentUnit && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Unit Rate:</span>
                <span className="font-medium">{formatCurrency(currentUnit.hourlyRate)}/hour</span>
              </div>
              
              {formData.billingModel !== 'timer' && (
                <div className="flex justify-between text-sm">
                  <span>Estimated Cost:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(getEstimatedCost())}
                  </span>
                </div>
              )}
              
              {formData.billingModel === 'timer' && (
                <div className="text-sm text-gray-600 text-center">
                  💡 Final cost will be calculated when session ends
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.unitId}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Starting...' : 'Start Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}