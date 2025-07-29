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
  // ✅ Removed notes field - not in database schema
}

interface PackageData {
  id: string
  name: string
  duration: number        // ✅ Changed from durationMinutes to duration
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
    packageId: ''
    // ✅ Removed notes field
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
        packageId: ''
        // ✅ Removed notes field
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
          const currentDurationExists = activeOptions.some((option: HourlyOptionData) => option.duration === formData.purchasedDuration)
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
        const selectedHourlyOption = hourlyOptions.find((option: HourlyOptionData) => option.duration === formData.purchasedDuration)
        return selectedHourlyOption?.price || ((formData.purchasedDuration / 60) * currentUnit.hourlyRate)
      case 'package':
        const selectedPackage = packages.find((pkg: PackageData) => pkg.id === formData.packageId)
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
          description: 'Pay based on actual playtime when finished',
          color: 'text-blue-600'
        }
      case 'hourly':
        return {
          icon: <Clock className="w-4 h-4" />,
          label: 'Pre-paid Hours',
          description: 'Pay upfront for fixed duration',
          color: 'text-green-600'
        }
      case 'package':
        return {
          icon: <Package className="w-4 h-4" />,
          label: 'Package Deals',
          description: 'Special bundled offers with savings',
          color: 'text-purple-600'
        }
      default:
        return {
          icon: <Timer className="w-4 h-4" />,
          label: 'Timer Based',
          description: 'Pay based on actual playtime',
          color: 'text-blue-600'
        }
    }
  }

  // ============================================
  // FORM HANDLERS
  // ============================================

  const handleStartSession = async () => {
    if (!currentUnit) {
      toast.error('Please select a unit')
      return
    }

    // Customer name is optional - no validation needed

    if (formData.billingModel === 'package' && !formData.packageId) {
      toast.error('Please select a package')
      return
    }

    try {
      setLoading(true)

      const requestBody = {
        unitId: formData.unitId,
        customerName: formData.customerName.trim() || undefined,
        billingModel: formData.billingModel,
        purchasedDuration: formData.billingModel === 'hourly' ? formData.purchasedDuration : undefined,
        packageId: formData.billingModel === 'package' ? formData.packageId : undefined
        // ✅ Removed notes field
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
          packageId: ''
          // ✅ Removed notes field
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
      packageId: ''
      // ✅ Removed notes field
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
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <PlayCircle className="w-5 h-5 mr-2 text-green-600" />
            Start New Session
          </DialogTitle>
          <DialogDescription>
            Configure and start a new gaming session
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
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
                        <span className="truncate">{unit.customerDisplayName || unit.name}</span>
                      </div>
                      <span className="text-sm text-gray-500 ml-2 whitespace-nowrap">
                        {formatCurrency(unit.hourlyRate)}/h
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name (Optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="customerName"
                placeholder="Enter customer name (optional)"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Billing Model */}
          <div className="space-y-3">
            <Label>Billing Model</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['timer', 'hourly', 'package'] as const).map((model) => {
                const info = getBillingModelInfo(model)
                return (
                  <Button
                    key={model}
                    type="button"
                    variant={formData.billingModel === model ? "default" : "outline"}
                    className={`h-auto p-2 flex flex-col items-center text-center ${
                      formData.billingModel === model 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, billingModel: model, packageId: '' }))}
                  >
                    <div className={formData.billingModel === model ? 'text-primary-foreground' : info.color}>
                      {info.icon}
                    </div>
                    <span className="text-xs font-medium mt-1 leading-tight">{info.label}</span>
                  </Button>
                )
              })}
            </div>
            
            {/* Billing model description */}
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
              <div className="flex items-center">
                <div className={billingInfo.color}>{billingInfo.icon}</div>
                <span className="ml-2 font-medium">{billingInfo.label}</span>
              </div>
              <p className="mt-1 text-xs">{billingInfo.description}</p>
            </div>
          </div>

          {/* Hourly Duration Selection */}
          {formData.billingModel === 'hourly' && (
            <div className="space-y-3">
              <Label htmlFor="duration">Select Duration</Label>
              
              {hourlyOptionsLoading ? (
                <div className="flex items-center justify-center py-6 border border-gray-200 rounded-lg">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-600" />
                  <span className="text-sm text-gray-600">Loading duration options...</span>
                </div>
              ) : hourlyOptions.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {hourlyOptions.map((option: HourlyOptionData) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, purchasedDuration: option.duration }))}
                      className={`relative p-3 border-2 rounded-lg text-left transition-all hover:border-blue-300 ${
                        formData.purchasedDuration === option.duration
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-blue-600 font-semibold text-lg">
                            {formatCurrency(option.price)}
                          </div>
                        </div>
                        {option.isPopular && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            Popular
                          </Badge>
                        )}
                      </div>
                      {option.description && (
                        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 border border-orange-200 bg-orange-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
                  <span className="text-sm text-orange-700">No hourly options available for this unit</span>
                </div>
              )}
            </div>
          )}

          {/* Package Selection */}
          {formData.billingModel === 'package' && (
            <div className="space-y-3">
              <Label htmlFor="package">Select Package Deal</Label>
              
              {packagesLoading ? (
                <div className="flex items-center justify-center py-6 border border-gray-200 rounded-lg">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-purple-600" />
                  <span className="text-sm text-gray-600">Loading package deals...</span>
                </div>
              ) : packages.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {packages.map((pkg: PackageData) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, packageId: pkg.id }))}
                      className={`relative p-4 border-2 rounded-lg text-left transition-all hover:border-purple-300 ${
                        formData.packageId === pkg.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-base text-gray-900">{pkg.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {formatDuration(pkg.duration)}
                          </div>
                          {pkg.description && (
                            <div className="text-xs text-gray-500 mt-2">{pkg.description}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-purple-600 font-bold text-xl">
                            {formatCurrency(pkg.price)}
                          </div>
                          {currentUnit && (
                            <div className="text-xs text-gray-500">
                              {(() => {
                                // Fixed calculation using correct property name
                                const durationHours = pkg.duration / 60
                                const hourlyEquivalent = Math.ceil(durationHours * currentUnit.hourlyRate)
                                const savings = Math.max(0, hourlyEquivalent - pkg.price)
                                
                                if (savings > 0) {
                                  const savingsPercent = Math.round((savings / hourlyEquivalent) * 100)
                                  return `Save ${formatCurrency(savings)} (${savingsPercent}%)`
                                } else {
                                  return `${formatCurrency(pkg.price)} total`
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 border border-orange-200 bg-orange-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
                  <span className="text-sm text-orange-700">No package deals available for this unit</span>
                </div>
              )}
            </div>
          )}

          {/* Cost Summary */}
          {estimatedCost > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <div className={billingInfo.color}>{billingInfo.icon}</div>
                <span className="ml-2">Session Summary</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Unit:</span>
                  <span className="font-medium text-gray-900">{currentUnit?.customerDisplayName || currentUnit?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Billing:</span>
                  <span className="font-medium text-gray-900">{billingInfo.label}</span>
                </div>
                {formData.billingModel === 'hourly' && (
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Duration:</span>
                    <span className="font-medium text-gray-900">{formatDuration(formData.purchasedDuration)}</span>
                  </div>
                )}
                {formData.billingModel === 'package' && (
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Package:</span>
                    <span className="font-medium text-gray-900">
                      {packages.find((pkg: PackageData) => pkg.id === formData.packageId)?.name}
                    </span>
                  </div>
                )}
                <div className="border-t border-blue-200 pt-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-semibold">Total Cost:</span>
                    <span className="font-bold text-blue-900 text-lg">{formatCurrency(estimatedCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleStartSession}
            disabled={loading || !formData.unitId}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
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