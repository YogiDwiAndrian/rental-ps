// src/components/staff/stop-session-dialog.tsx - ENHANCED UI/UX VERSION
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  StopCircle, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Coffee,
  Clock,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Package,
  Timer,
  Calculator,
  User,
  Calendar,
  TrendingUp,
  Info,
  Zap,
  ShoppingCart,
  DollarSign,
  PlayCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  GetSessionFnbOrdersResponse, 
  StopSessionRequest, 
  StopSessionResponse,
  ApiFnbOrder,
  isGetSessionFnbOrdersResponse
} from '@/types/api'
import { Progress } from '../ui/progress'

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
  hourlyRate?: number
  customerName?: string
}

interface Unit {
  id: string
  name: string
  consoleType: string
  controllerCount: number
  status: 'available' | 'occupied' | 'maintenance' | 'broken'
  hourlyRate: number
  customerDisplayName?: string
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
  paidAt?: string
}

interface StopSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: ActiveSession
  locationId: string
  units: Unit[]
  onSuccess?: () => void
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

const formatDuration = (startTime: string): string => {
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

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (diffMinutes < 1) return 'Baru saja'
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} jam lalu`
  
  return date.toLocaleDateString('id-ID')
}

const calculateActualDuration = (startTime: string): number => {
  const start = new Date(startTime).getTime()
  const now = Date.now()
  const durationMs = now - start
  return Math.floor(durationMs / (1000 * 60))
}

// ============================================
// HYBRID HOURLY RATE RESOLVER
// ============================================

const resolveHourlyRate = (session: ActiveSession | undefined, units: Unit[]): number => {
  if (!session) {
    throw new Error('Session data is required')
  }

  if (session.hourlyRate && session.hourlyRate > 0) {
    return session.hourlyRate
  }

  const unit = units.find(u => u.id === session.unitId)
  if (unit && unit.hourlyRate && unit.hourlyRate > 0) {
    return unit.hourlyRate
  }

  throw new Error(
    `Unable to determine hourly rate for session ${session.id}. ` +
    `Please ensure unit has valid pricing configuration.`
  )
}

const calculateSessionCost = (
  session: ActiveSession | undefined,
  units: Unit[]
): { baseCost: number; overtimeCost: number; totalCost: number; hourlyRate: number } => {
  if (!session) {
    return { baseCost: 0, overtimeCost: 0, totalCost: 0, hourlyRate: 0 }
  }
  
  const hourlyRate = resolveHourlyRate(session, units)
  
  if (session.billingModel === 'timer') {
    const actualMinutes = calculateActualDuration(session.startTime)
    const cost = Math.ceil((actualMinutes / 60) * hourlyRate)
    return { baseCost: cost, overtimeCost: 0, totalCost: cost, hourlyRate }
  }
  
  if (session.billingModel === 'hourly' || session.billingModel === 'package') {
    const baseCost = session.totalAmount || 0
    
    if (session.isOvertime && session.remainingMinutes) {
      const overtimeMinutes = session.remainingMinutes
      const chargeableOvertime = Math.max(0, overtimeMinutes - 5)
      const overtimeCost = chargeableOvertime > 0 ? 
        Math.ceil((chargeableOvertime / 60) * hourlyRate) : 0
        
      return { 
        baseCost: baseCost, 
        overtimeCost: overtimeCost, 
        totalCost: baseCost + overtimeCost,
        hourlyRate
      }
    }
    
    return { 
      baseCost: baseCost, 
      overtimeCost: 0, 
      totalCost: baseCost,
      hourlyRate
    }
  }
  
  return { baseCost: 0, overtimeCost: 0, totalCost: 0, hourlyRate }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StopSessionDialog({ 
  open, 
  onOpenChange, 
  session, 
  locationId,
  units,
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
  // SAFE CALCULATIONS WITH ERROR HANDLING
  // ============================================

  let sessionCost = { baseCost: 0, overtimeCost: 0, totalCost: 0, hourlyRate: 0 }
  let calculationError: string | null = null

  try {
    sessionCost = calculateSessionCost(session, units)
  } catch (error) {
    calculationError = error instanceof Error ? error.message : 'Failed to calculate session cost'
  }

  // ============================================
  // FUNCTIONS
  // ============================================

  const handleSubmit = async (): Promise<void> => {
    if (!session) {
      toast.error('No session available')
      return
    }

    if (calculationError) {
      toast.error(calculationError)
      return
    }

    if (formData.fnbAmount < 0) {
      toast.error('F&B amount cannot be negative')
      return
    }

    setLoading(true)

    try {
      const requestBody: StopSessionRequest = {
        paymentMethod: formData.paymentMethod,
        fnbAmount: formData.fnbAmount > 0 ? formData.fnbAmount : undefined,
        notes: formData.notes.trim() || undefined
      }

      const response = await fetch(`/api/rentals/${session.id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(requestBody)
      })

      const result: StopSessionResponse = await response.json()

      if (result.success) {
        toast.success('Session berhasil dihentikan!')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Gagal menghentikan session')
      }
    } catch (error) {
      console.error('Error stopping session:', error)
      toast.error('Gagal menghentikan session')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = (): void => {
    onOpenChange(false)
  }

  const fetchAttachedFnbOrders = async (): Promise<void> => {
    if (!session) return

    setFetchingFnb(true)
    try {
      const response = await fetch(`/api/rentals/${session.id}/fnb-orders?locationId=${locationId}`)
      const result: unknown = await response.json()
      
      if (isGetSessionFnbOrdersResponse(result) && result.success && result.data) {
        const ordersWithTiming: AttachedFnbOrder[] = result.data.map((order: ApiFnbOrder) => ({
          id: order.id,
          totalAmount: order.totalAmount,
          status: order.status,
          paymentTiming: order.paymentTiming || (order.transactions && order.transactions.length > 0 ? 'immediate' : 'end_of_session'),
          items: order.items,
          createdAt: order.createdAt,
          paidAt: order.paidAt
        }))
        
        setAttachedFnbOrders(ordersWithTiming)
      }
    } catch (error) {
      console.error('Error fetching F&B orders:', error)
    } finally {
      setFetchingFnb(false)
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4" />
      case 'card': return <CreditCard className="w-4 h-4" />
      case 'digital_wallet': return <Smartphone className="w-4 h-4" />
      default: return <CreditCard className="w-4 h-4" />
    }
  }

  const getBillingModelInfo = (billingModel: 'timer' | 'hourly' | 'package') => {
    switch (billingModel) {
      case 'timer':
        return {
          icon: <Timer className="w-4 h-4" />,
          label: 'Timer Mode',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'Pembayaran sesuai durasi bermain'
        }
      case 'hourly':
        return {
          icon: <Clock className="w-4 h-4" />,
          label: 'Hourly Rate',
          color: 'bg-green-100 text-green-800 border-green-200',
          description: 'Bayar dimuka per jam'
        }
      case 'package':
        return {
          icon: <Package className="w-4 h-4" />,
          label: 'Package Deal',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          description: 'Paket dengan durasi tetap'
        }
      default:
        return {
          icon: <Receipt className="w-4 h-4" />,
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Model billing tidak diketahui'
        }
    }
  }

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (open && session) {
      setFormData({
        paymentMethod: 'cash',
        fnbAmount: 0,
        notes: ''
      })
      setAttachedFnbOrders([])
      fetchAttachedFnbOrders()
    }
  }, [open, session])

  // ============================================
  // EARLY RETURNS
  // ============================================

  if (!session) return null

  const immediateOrders = attachedFnbOrders.filter(order => order.paymentTiming === 'immediate')
  const endOfSessionOrders = attachedFnbOrders.filter(order => order.paymentTiming === 'end_of_session')
  
  const totalImmediateFnb = immediateOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const totalEndOfSessionFnb = endOfSessionOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  
  const finalTotal = sessionCost.totalCost + totalEndOfSessionFnb + formData.fnbAmount
  const billingInfo = getBillingModelInfo(session.billingModel)

  const sessionDuration = formatDuration(session.startTime)
  const actualMinutes = calculateActualDuration(session.startTime)

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[95vh] p-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <StopCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Hentikan Session
                </DialogTitle>
                <DialogDescription className="text-base">
                  Selesaikan session dan proses pembayaran akhir
                </DialogDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">{session.unitName}</div>
              <Badge variant="outline" className={billingInfo.color}>
                {billingInfo.icon}
                <span className="ml-1">{billingInfo.label}</span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 overflow-y-auto p-6 pt-0">
          <div className="space-y-6">
            {/* Error Display */}
            {calculationError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <h4 className="font-semibold text-red-800">Calculation Error</h4>
                      <p className="text-sm text-red-700">{calculationError}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Session Overview */}
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <PlayCircle className="w-5 h-5" />
                  Session Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/60 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Durasi</span>
                    </div>
                    <div className="font-bold text-blue-900">{sessionDuration}</div>
                    <div className="text-xs text-blue-600">{actualMinutes} menit total</div>
                  </div>
                  
                  <div className="bg-white/60 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Mulai</span>
                    </div>
                    <div className="font-bold text-blue-900">
                      {new Date(session.startTime).toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className="text-xs text-blue-600">
                      {formatTimeAgo(session.startTime)}
                    </div>
                  </div>

                  <div className="bg-white/60 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-medium">Rate</span>
                    </div>
                    <div className="font-bold text-blue-900">
                      {formatCurrency(sessionCost.hourlyRate)}/jam
                    </div>
                    <div className="text-xs text-blue-600">{billingInfo.description}</div>
                  </div>

                  <div className="bg-white/60 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Customer</span>
                    </div>
                    <div className="font-bold text-blue-900">
                      {session.customerName || units.find(u => u.id === session.unitId)?.customerDisplayName || 'Walk-in'}
                    </div>
                    <div className="text-xs text-blue-600">
                      {session.isOvertime ? (
                        <span className="text-red-600 font-medium">⚠ Overtime</span>
                      ) : (
                        <span className="text-green-600">✓ Normal</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar for Session Time */}
                {session.billingModel !== 'timer' && session.purchasedDuration && (
                  <div className="bg-white/60 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-700">Progress Waktu</span>
                      <span className="text-xs text-blue-600">
                        {actualMinutes} / {(session.purchasedDuration || 0) + (session.extendedDuration || 0)} menit
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, (actualMinutes / ((session.purchasedDuration || 0) + (session.extendedDuration || 0))) * 100)}
                      className="h-2"
                    />
                    {session.isOvertime && (
                      <div className="flex items-center gap-1 mt-2 text-red-600">
                        <Zap className="w-3 h-3" />
                        <span className="text-xs font-medium">
                          Overtime: +{session.remainingMinutes} menit
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            {!calculationError && (
              <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <Calculator className="w-5 h-5" />
                    Perhitungan Biaya
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-white/60 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 font-medium">Biaya Dasar Session:</span>
                      <span className="text-green-900 font-bold">{formatCurrency(sessionCost.baseCost)}</span>
                    </div>
                    
                    {sessionCost.overtimeCost > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-red-700 font-medium">Biaya Overtime:</span>
                          <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
                            {session.remainingMinutes}min - 5min grace
                          </Badge>
                        </div>
                        <span className="text-red-900 font-bold">{formatCurrency(sessionCost.overtimeCost)}</span>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center text-lg">
                      <span className="text-green-800 font-bold">Total Session:</span>
                      <span className="text-green-900 font-bold">{formatCurrency(sessionCost.totalCost)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* F&B Orders */}
            {fetchingFnb ? (
              <Card className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center gap-3 text-gray-600">
                    <Coffee className="w-5 h-5 animate-spin" />
                    <span>Memuat pesanan F&B...</span>
                  </div>
                </CardContent>
              </Card>
            ) : attachedFnbOrders.length > 0 ? (
              <div className="space-y-4">
                {/* Already Paid F&B Orders */}
                {immediateOrders.length > 0 && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-green-900">
                        <CheckCircle2 className="w-5 h-5" />
                        F&B Sudah Dibayar ({immediateOrders.length})
                      </CardTitle>
                      <p className="text-sm text-green-700">
                        Pesanan ini sudah dibayar langsung dan tidak termasuk dalam tagihan session.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {immediateOrders.map((order) => (
                        <div key={order.id} className="bg-white p-3 rounded-lg border border-green-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <ShoppingCart className="w-4 h-4 text-green-600" />
                                <span className="font-semibold text-green-800">
                                  Order #{order.id.slice(-6)}
                                </span>
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  ✓ Lunas
                                </Badge>
                              </div>
                              <div className="text-sm text-green-700 mb-2">
                                {order.items.map(item => 
                                  `${item.quantity}× ${item.fnbItemName}`
                                ).join(', ')}
                              </div>
                              {order.paidAt && (
                                <div className="text-xs text-green-600">
                                  Dibayar: {new Date(order.paidAt).toLocaleString('id-ID')}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-900">
                                {formatCurrency(order.totalAmount)}
                              </div>
                              <div className="text-xs text-green-600">
                                {order.items.length} item
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="bg-green-100 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-green-800">Total Sudah Dibayar:</span>
                          <span className="font-bold text-green-900">{formatCurrency(totalImmediateFnb)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Unpaid F&B Orders */}
                {endOfSessionOrders.length > 0 && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-orange-900">
                        <Coffee className="w-5 h-5" />
                        F&B Belum Dibayar ({endOfSessionOrders.length})
                      </CardTitle>
                      <p className="text-sm text-orange-700">
                        Pesanan ini akan ditagih bersama dengan biaya session.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {endOfSessionOrders.map((order) => (
                        <div key={order.id} className="bg-white p-3 rounded-lg border border-orange-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <ShoppingCart className="w-4 h-4 text-orange-600" />
                                <span className="font-semibold text-orange-800">
                                  Order #{order.id.slice(-6)}
                                </span>
                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                  ⏳ Pending
                                </Badge>
                              </div>
                              <div className="text-sm text-orange-700 mb-2">
                                {order.items.map(item => 
                                  `${item.quantity}× ${item.fnbItemName}`
                                ).join(', ')}
                              </div>
                              <div className="text-xs text-orange-600">
                                Dipesan: {formatTimeAgo(order.createdAt)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-orange-900">
                                {formatCurrency(order.totalAmount)}
                              </div>
                              <div className="text-xs text-orange-600">
                                {order.items.length} item
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="bg-orange-100 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-orange-800">Total Belum Dibayar:</span>
                          <span className="font-bold text-orange-900">{formatCurrency(totalEndOfSessionFnb)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}

            {/* Payment Form */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Receipt className="w-5 h-5" />
                  Informasi Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Metode Pembayaran</Label>
                    <Select 
                      value={formData.paymentMethod} 
                      onValueChange={(value: 'cash' | 'card' | 'digital_wallet') => 
                        setFormData(prev => ({ ...prev, paymentMethod: value }))
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-3">
                            <Banknote className="w-4 h-4 text-green-600" />
                            <div>
                              <div className="font-medium">Tunai</div>
                              <div className="text-xs text-gray-500">Pembayaran cash</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="card">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            <div>
                              <div className="font-medium">Kartu</div>
                              <div className="text-xs text-gray-500">Debit/Credit card</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="digital_wallet">
                          <div className="flex items-center gap-3">
                            <Smartphone className="w-4 h-4 text-purple-600" />
                            <div>
                              <div className="font-medium">Digital Wallet</div>
                              <div className="text-xs text-gray-500">OVO, GoPay, Dana</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">F&B Tambahan (Opsional)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.fnbAmount}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          fnbAmount: Math.max(0, parseInt(e.target.value) || 0)
                        }))}
                        placeholder="0"
                        className="h-11 pl-12"
                      />
                      <DollarSign className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Tambahan pembelian F&B yang tidak tercatat
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Catatan (Opsional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Tambahkan catatan untuk session ini..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Final Bill Summary */}
            {!calculationError && (
              <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <TrendingUp className="w-5 h-5" />
                    Ringkasan Tagihan Final
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Detailed Breakdown */}
                  <div className="bg-white/70 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <PlayCircle className="w-4 h-4 text-indigo-600" />
                        <span className="text-indigo-700 font-medium">Biaya Session:</span>
                      </div>
                      <span className="text-indigo-900 font-bold">{formatCurrency(sessionCost.totalCost)}</span>
                    </div>
                    
                    {totalEndOfSessionFnb > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Coffee className="w-4 h-4 text-orange-600" />
                          <span className="text-indigo-700 font-medium">F&B (Belum Dibayar):</span>
                        </div>
                        <span className="text-indigo-900 font-bold">{formatCurrency(totalEndOfSessionFnb)}</span>
                      </div>
                    )}
                    
                    {formData.fnbAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-green-600" />
                          <span className="text-indigo-700 font-medium">F&B Tambahan:</span>
                        </div>
                        <span className="text-indigo-900 font-bold">{formatCurrency(formData.fnbAmount)}</span>
                      </div>
                    )}
                    
                    {totalImmediateFnb > 0 && (
                      <div className="flex justify-between items-center text-sm opacity-70">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span className="text-green-600">F&B Sudah Dibayar:</span>
                        </div>
                        <span className="text-green-600 line-through">{formatCurrency(totalImmediateFnb)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Grand Total */}
                  <div className="bg-indigo-100 p-4 rounded-lg border-2 border-indigo-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-200 rounded-lg">
                          <Receipt className="w-5 h-5 text-indigo-700" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-indigo-900">
                            {formatCurrency(finalTotal)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-indigo-700">
                            {getPaymentMethodIcon(formData.paymentMethod)}
                            <span className="capitalize font-medium">
                              {formData.paymentMethod.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-indigo-700 font-medium">
                          Total Items: {
                            endOfSessionOrders.reduce((sum, order) => sum + order.items.length, 0) + 
                            (formData.fnbAmount > 0 ? 1 : 0) + 1
                          }
                        </div>
                        <div className="text-xs text-indigo-600">
                          Session + F&B Combined
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-white/70 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-indigo-700">
                      <Info className="w-4 h-4" />
                      <span>
                        {totalImmediateFnb > 0 && (
                          <>F&B senilai {formatCurrency(totalImmediateFnb)} sudah dibayar sebelumnya. </>
                        )}
                        Customer perlu membayar {formatCurrency(finalTotal)} untuk session ini.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              disabled={loading}
              className="flex-1 sm:flex-none h-11"
            >
              <Clock className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !!calculationError}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white h-11"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <StopCircle className="w-4 h-4 mr-2" />
                  Hentikan Session - {formatCurrency(finalTotal)}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}