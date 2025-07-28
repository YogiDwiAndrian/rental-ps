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
import { Badge } from '@/components/ui/badge'
import { 
  PlayCircle, 
  Clock, 
  Timer, 
  Package, 
  Gamepad,
  User,
  AlertCircle,
  Loader2
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

interface PackageData {
  id: string
  name: string
  durationMinutes: number
  price: number
  description?: string
  displayOrder: number
  isActive: boolean
}

interface HourlyOptionData {
  id: string
  duration: number
  price: number
  label: string
  description?: string
  isPopular?: boolean
  displayOrder: number
  isActive: boolean
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

const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
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
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [hourlyOptionsLoading, setHourlyOptionsLoading] = useState(false)
  const [packages, setPackages] = useState<PackageData[]>([])
  const [hourlyOptions, setHourlyOptions] = useState<HourlyOptionData[]>([])
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

  // ============================================
  // EFFECTS
  // ============================================

  // Reset form when dialog opens/closes or selectedUnit changes
  useEffect(() => {
    if (open && selectedUnit) {
      setFormData({
        unitId: selectedUnit.id,
        billingModel: 'timer',
        customerName: '',
        purchasedDuration: 60,
        packageId: '',
        notes: ''
      })
      setPackages([])
      setHourlyOptions([])
    }
  }, [open, selectedUnit])

  // Load packages when unit changes and billing model is package
  useEffect(() => {
    if (formData.unitId && formData.billingModel === 'package') {
      fetchPackages(formData.unitId)
    } else {
      setPackages([])
    }
  }, [formData.unitId, formData.billingModel])

  // Load hourly options when unit changes and billing model is hourly
  useEffect(() => {
    if (formData.unitId && formData.billingModel === 'hourly') {
      fetchHourlyOptions(formData.unitId)
    } else {
      setHourlyOptions([])
    }
  }, [formData.unitId, formData.billingModel])

  // ============================================
  // API FUNCTIONS
  // ============================================

  const fetchHourlyOptions = async (unitId: string) => {
    try {
      setHourlyOptionsLoading(true)
      
      const response = await fetch(`/api/units/${unitId}/hourly-options`)
      const result = await response.json()

      if (result.success && result.data?.hourlyOptions) {
        const activeOptions = result.data.hourlyOptions.filter((option: HourlyOptionData) => option.isActive)
        setHourlyOptions(activeOptions)
        
        // Set default duration to first option if current duration not available
        if (activeOptions.length > 0) {
          const currentDurationExists = activeOptions.some(option => option.duration === formData.purchasedDuration)
          if (!currentDurationExists) {
            setFormData(prev => ({ ...prev, purchasedDuration: activeOptions[0].duration }))
          }
        }
      } else {
        console.warn('No hourly options found for unit:', unitId)
        setHourlyOptions([])
      }
    } catch (error) {
      console.error('Error fetching hourly options:', error)
      setHourlyOptions([])
      // Fallback to default options if API fails
      if (currentUnit) {
        setHourlyOptions([
          { 
            id: 'hourly_1h', 
            duration: 60, 
            price: currentUnit.hourlyRate, 
            label: '1 hour', 
            displayOrder: 1, 
            isActive: true 
          },
          { 
            id: 'hourly_2h', 
            duration: 120, 
            price: Math.round(currentUnit.hourlyRate * 1.8), 
            label: '2 hours', 
            displayOrder: 2, 
            isActive: true 
          }
        ])
      }
    } finally {
      setHourlyOptionsLoading(false)
    }
  }

  const fetchPackages = async (unitId: string) => {
    try {
      setPackagesLoading(true)
      
      const response = await fetch(`/api/units/${unitId}/packages`)
      const result = await response.json()

      if (result.success && result.data?.packages) {
        setPackages(result.data.packages.filter((pkg: PackageData) => pkg.isActive))
      } else {
        console.warn('No packages found for unit:', unitId)
        setPackages([])
      }
    } catch (error) {
      console.error('Error fetching packages:', error)
      setPackages([])
    } finally {
      setPackagesLoading(false)
    }
  }

  // ============================================
  // CALCULATIONS
  // ============================================

  const getEstimatedCost = (): number => {
    if (!currentUnit) return 0

    switch (formData.billingModel) {
      case 'timer':
        return 0 // Pay at end
      case 'hourly':
        // Use dynamic hourly option price instead of calculating
        const selectedHourlyOption = hourlyOptions.find(option => option.duration === formData.purchasedDuration)
        return selectedHourlyOption?.price || ((formData.purchasedDuration / 60) * currentUnit.hourlyRate)
      case 'package':
        const selectedPackage = packages.find(pkg => pkg.id === formData.packageId)
        return selectedPackage?.price || 0
      default:
        return 0
    }
  }

  const getBillingModelInfo = (model: string) => {
    switch (model) {
      case 'timer':
        return {
          icon: <Timer className="w-4 h-4" />,
          label: 'Pay at End',
          description: 'Customer pays after playing, based on actual time used'
        }
      case 'hourly':
        return {
          icon: <Clock className="w-4 h-4" />,
          label: 'Pre-paid',
          description: 'Customer pays upfront for specific duration'
        }
      case 'package':
        return {
          icon: <Package className="w-4 h-4" />,
          label: 'Package Deal',
          description: 'Fixed price packages with set duration'
        }
      default:
        return {
          icon: <Timer className="w-4 h-4" />,
          label: 'Unknown',
          description: ''
        }
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

    if (formData.billingModel === 'hourly') {
      if (hourlyOptions.length === 0) {
        toast.error('No hourly options available for this unit')
        return
      }
      if (formData.purchasedDuration < 15) {
        toast.error('Minimum duration is 15 minutes')
        return
      }
    }

    if (formData.billingModel === 'package') {
      if (packages.length === 0) {
        toast.error('No packages available for this unit')
        return
      }
      if (!formData.packageId) {
        toast.error('Please select a package')
        return
      }
    }

    setLoading(true)

    try {
      const requestBody = {
        unitId: formData.unitId,
        billingModel: formData.billingModel,
        customerName: formData.customerName.trim() || undefined,
        purchasedDuration: formData.billingModel === 'hourly' ? formData.purchasedDuration : undefined,
        packageId: formData.billingModel === 'package' ? formData.packageId : undefined,
        notes: formData.notes.trim() || undefined
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
        toast.success(`Session started for ${currentUnit?.customerDisplayName || currentUnit?.name}`)
        
        // Reset form
        setFormData({
          unitId: selectedUnit?.id || '',
          billingModel: 'timer',
          customerName: '',
          purchasedDuration: 60,
          packageId: '',
          notes: ''
        })
        
        onOpenChange(false)
        if (onSuccess) {
          onSuccess()
        }
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

  const estimatedCost = getEstimatedCost()
  const billingInfo = getBillingModelInfo(formData.billingModel)

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <PlayCircle className="w-5 h-5 mr-2 text-green-600" />
            Start New Session
          </DialogTitle>
          <DialogDescription>
            Configure and start a new gaming session
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Unit Selection */}
          <div className="space-y-2">
            <Label htmlFor="unit">Gaming Unit</Label>
            <Select 
              value={formData.unitId} 
              onValueChange={(value: string) => 
                setFormData(prev => ({ ...prev, unitId: value, packageId: '' }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Gamepad className="w-4 h-4 mr-2" />
                        <span>{unit.customerDisplayName || unit.name}</span>
                      </div>
                      <span className="text-sm text-gray-500 ml-4">
                        {formatCurrency(unit.hourlyRate)}/h
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Info */}
          {currentUnit && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Console:</span>
                  <p className="font-medium">{currentUnit.consoleType}</p>
                </div>
                <div>
                  <span className="text-gray-600">Controllers:</span>
                  <p className="font-medium">{currentUnit.controllerCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* Billing Model */}
          <div className="space-y-3">
            <Label htmlFor="billing">Billing Model</Label>
            <Select 
              value={formData.billingModel} 
              onValueChange={(value: string) => 
                setFormData(prev => ({ 
                  ...prev, 
                  billingModel: value as 'timer' | 'hourly' | 'package', 
                  packageId: '' 
                }))
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
            
            {/* Billing Model Info */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start">
                {billingInfo.icon}
                <div className="ml-2">
                  <p className="font-medium text-blue-900">{billingInfo.label}</p>
                  <p className="text-sm text-blue-700">{billingInfo.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Duration for Hourly - Now Dynamic from Database */}
          {formData.billingModel === 'hourly' && (
            <div className="space-y-3">
              <Label htmlFor="duration">Duration & Pricing</Label>
              
              {hourlyOptionsLoading ? (
                <div className="flex items-center justify-center py-4 border border-gray-200 rounded-md">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Loading duration options...</span>
                </div>
              ) : hourlyOptions.length > 0 ? (
                <Select 
                  value={formData.purchasedDuration.toString()} 
                  onValueChange={(value: string) => 
                    setFormData(prev => ({ ...prev, purchasedDuration: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourlyOptions.map((option) => (
                      <SelectItem key={option.id} value={option.duration.toString()}>
                        <div className="flex flex-col items-start py-1 w-full">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{option.label}</span>
                            {option.isPopular && (
                              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm text-blue-600 font-semibold">
                              {formatCurrency(option.price)}
                            </span>
                            {option.description && (
                              <span className="text-xs text-gray-500">{option.description}</span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center justify-center py-4 border border-orange-200 bg-orange-50 rounded-md">
                  <AlertCircle className="w-4 h-4 text-orange-600 mr-2" />
                  <span className="text-sm text-orange-700">No hourly options available for this unit</span>
                </div>
              )}
            </div>
          )}

          {/* Package Selection */}
          {formData.billingModel === 'package' && (
            <div className="space-y-2">
              <Label htmlFor="package">Select Package</Label>
              
              {packagesLoading ? (
                <div className="flex items-center justify-center py-4 border border-gray-200 rounded-md">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Loading packages...</span>
                </div>
              ) : packages.length > 0 ? (
                <Select 
                  value={formData.packageId} 
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, packageId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        <div className="flex flex-col items-start py-1">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{pkg.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {formatDuration(pkg.durationMinutes)}
                            </Badge>
                          </div>
                          <span className="text-sm text-green-600 font-semibold">
                            {formatCurrency(pkg.price)}
                          </span>
                          {pkg.description && (
                            <span className="text-xs text-gray-500">{pkg.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center justify-center py-4 border border-orange-200 bg-orange-50 rounded-md">
                  <AlertCircle className="w-4 h-4 text-orange-600 mr-2" />
                  <span className="text-sm text-orange-700">No packages available for this unit</span>
                </div>
              )}
            </div>
          )}

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer Name (Optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="customer"
                placeholder="Enter customer name"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special notes for this session..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Cost Summary */}
          {estimatedCost > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-900">Estimated Cost:</span>
                <span className="text-lg font-bold text-green-700">
                  {formatCurrency(estimatedCost)}
                </span>
              </div>
              {formData.billingModel === 'hourly' && (
                <p className="text-sm text-green-600 mt-1">
                  Pre-paid for {formatDuration(formData.purchasedDuration)}
                </p>
              )}
              {formData.billingModel === 'package' && packages.find(p => p.id === formData.packageId) && (
                <p className="text-sm text-green-600 mt-1">
                  Package: {formatDuration(packages.find(p => p.id === formData.packageId)!.durationMinutes)}
                </p>
              )}
            </div>
          )}

          {formData.billingModel === 'timer' && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="flex items-start">
                <Timer className="w-4 h-4 text-amber-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Timer Mode</p>
                  <p className="text-xs text-amber-700">
                    Customer will pay at the end based on actual time played
                  </p>
                </div>
              </div>
            </div>
          )}
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
            disabled={loading || !formData.unitId || (formData.billingModel === 'package' && !formData.packageId)}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}