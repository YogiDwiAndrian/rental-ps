// src/components/staff/stop-session-dialog-content.tsx - FIXED total calculation
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calculator, 
  AlertTriangle, 
  Coffee, 
  RefreshCw,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  cancellationReason?: string    // FIXED: Add this field
  cancelledAt?: string          // FIXED: Add this field
  cancelledByName?: string      // FIXED: Add this field
}

interface StopFormData {
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
  fnbAmount: number
  notes: string
}

interface SessionCost {
  baseCost: number
  overtimeCost: number
  totalCost: number
  hourlyRate: number
}

interface StopSessionDialogContentProps {
  session: ActiveSession
  sessionCost: SessionCost
  attachedFnbOrders: AttachedFnbOrder[]
  formData: StopFormData
  onFormDataChange: (data: Partial<StopFormData>) => void
  fetchingFnb: boolean
  onRefreshFnb: () => void
  calculationError: string | null
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

const getPaymentMethodInfo = (method: string) => {
  switch (method) {
    case 'cash':
      return {
        label: 'Tunai',
        icon: <Banknote className="w-4 h-4" />,
        color: 'bg-green-50 text-green-700 border-green-200'
      }
    case 'card':
      return {
        label: 'Kartu',
        icon: <CreditCard className="w-4 h-4" />,
        color: 'bg-blue-50 text-blue-700 border-blue-200'
      }
    case 'digital_wallet':
      return {
        label: 'E-Wallet',
        icon: <Smartphone className="w-4 h-4" />,
        color: 'bg-purple-50 text-purple-700 border-purple-200'
      }
    default:
      return {
        label: 'Unknown',
        icon: <CreditCard className="w-4 h-4" />,
        color: 'bg-gray-50 text-gray-700 border-gray-200'
      }
  }
}

const getFnbStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <DollarSign className="w-3 h-3" />
    case 'cancelled':
      return <XCircle className="w-3 h-3" />
    case 'pending':
      return <Clock className="w-3 h-3" />
    default:
      return <Clock className="w-3 h-3" />
  }
}

const getFnbStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'pending':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

const getFnbStatusText = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'Sudah Dibayar'
    case 'cancelled':
      return 'Dibatalkan'
    case 'pending':
      return 'Belum Dibayar'
    default:
      return status
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StopSessionDialogContent({
  session,
  sessionCost,
  attachedFnbOrders,
  formData,
  onFormDataChange,
  fetchingFnb,
  onRefreshFnb,
  calculationError
}: StopSessionDialogContentProps) {
  const paymentInfo = getPaymentMethodInfo(formData.paymentMethod)
  
  // FIXED: Separate orders by payment timing AND exclude cancelled orders
  const immediateOrders = attachedFnbOrders.filter(order => 
    order.paymentTiming === 'immediate' && order.status !== 'cancelled'
  )
  const endOfSessionOrders = attachedFnbOrders.filter(order => 
    order.paymentTiming === 'end_of_session' && order.status !== 'cancelled'
  )
  const cancelledOrders = attachedFnbOrders.filter(order => order.status === 'cancelled')
  
  // FIXED: Calculate totals - only include non-cancelled orders
  const totalImmediateFnb = immediateOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const totalEndOfSessionFnb = endOfSessionOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const finalTotal = sessionCost.totalCost + totalEndOfSessionFnb + formData.fnbAmount

  return (
    <div className="space-y-3 pb-2">
      {/* Calculation Error Alert */}
      {calculationError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium text-sm">
            {calculationError}
          </AlertDescription>
        </Alert>
      )}

      {/* Session Cost Breakdown */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="w-4 h-4 text-blue-600" />
            Biaya Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm text-gray-600">Rate: {formatCurrency(sessionCost.hourlyRate)}/jam</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{session.billingModel === 'timer' ? 'Durasi Bermain' : 'Biaya Dasar'}:</span>
              <span className="font-medium">{formatCurrency(sessionCost.baseCost)}</span>
            </div>
            
            {sessionCost.overtimeCost > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-600">Biaya Overtime:</span>
                <span className="font-medium text-amber-600">+ {formatCurrency(sessionCost.overtimeCost)}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-base font-semibold border-t pt-1">
              <span>Total Session:</span>
              <span className="text-blue-600">{formatCurrency(sessionCost.totalCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* F&B Orders Attached to Session */}
      {attachedFnbOrders.length > 0 && (
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Coffee className="w-4 h-4 text-orange-600" />
                Pesanan F&B Terlampir
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRefreshFnb}
                disabled={fetchingFnb}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={cn("w-3 h-3", fetchingFnb && "animate-spin")} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            
            {/* Active Orders (will be paid with session) */}
            {endOfSessionOrders.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-green-700 mb-2">
                  Akan Dibayar Bersamaan (End of Session)
                </h5>
                <div className="space-y-2">
                  {endOfSessionOrders.map((order) => (
                    <div key={order.id} className="p-2 bg-green-50 rounded border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className={getFnbStatusColor(order.status)}>
                          {getFnbStatusIcon(order.status)}
                          <span className="ml-1">{getFnbStatusText(order.status)}</span>
                        </Badge>
                        <span className="font-medium text-green-700">{formatCurrency(order.totalAmount)}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {order.items.map(item => `${item.quantity}x ${item.fnbItemName}`).join(', ')}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-medium border-t pt-1">
                    <span>Subtotal F&B:</span>
                    <span className="text-green-600">{formatCurrency(totalEndOfSessionFnb)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Already Paid Orders (immediate payment) */}
            {immediateOrders.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-blue-700 mb-2">
                  Sudah Dibayar Sebelumnya (Immediate)
                </h5>
                <div className="space-y-2">
                  {immediateOrders.map((order) => (
                    <div key={order.id} className="p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className={getFnbStatusColor(order.status)}>
                          {getFnbStatusIcon(order.status)}
                          <span className="ml-1">{getFnbStatusText(order.status)}</span>
                        </Badge>
                        <span className="font-medium text-blue-700">{formatCurrency(order.totalAmount)}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {order.items.map(item => `${item.quantity}x ${item.fnbItemName}`).join(', ')}
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-blue-600">
                    Tidak dihitung dalam total (sudah dibayar)
                  </div>
                </div>
              </div>
            )}

            {/* Cancelled Orders (shown for info but not calculated) */}
            {cancelledOrders.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-600 mb-2">
                  Pesanan Dibatalkan
                </h5>
                <div className="space-y-2">
                  {cancelledOrders.map((order) => (
                    <div key={order.id} className="p-2 bg-gray-50 rounded border border-gray-200 opacity-75">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className={getFnbStatusColor(order.status)}>
                          {getFnbStatusIcon(order.status)}
                          <span className="ml-1">{getFnbStatusText(order.status)}</span>
                        </Badge>
                        <span className="font-medium text-gray-500 line-through">{formatCurrency(order.totalAmount)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.items.map(item => `${item.quantity}x ${item.fnbItemName}`).join(', ')}
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-gray-500">
                    Tidak dihitung dalam total (dibatalkan)
                  </div>
                </div>
              </div>
            )}

            {/* No F&B Orders */}
            {attachedFnbOrders.length === 0 && !fetchingFnb && (
              <div className="text-center py-4 text-gray-500">
                <Coffee className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Tidak ada pesanan F&B untuk session ini</p>
              </div>
            )}

            {/* Loading State */}
            {fetchingFnb && (
              <div className="text-center py-4">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 text-gray-400 animate-spin" />
                <p className="text-sm text-gray-600">Memuat pesanan F&B...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual F&B Amount */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coffee className="w-4 h-4 text-purple-600" />
            F&B Manual / Tambahan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fnbAmount" className="text-sm">
              Jumlah F&B Tambahan (Opsional)
            </Label>
            <Input
              id="fnbAmount"
              type="number"
              min="0"
              value={formData.fnbAmount || ''}
              onChange={(e) => onFormDataChange({ 
                fnbAmount: parseInt(e.target.value) || 0 
              })}
              placeholder="0"
              className="text-right"
            />
            <p className="text-xs text-gray-500">
              Untuk item F&B yang tidak tercatat dalam sistem
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            Metode Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={formData.paymentMethod}
            onValueChange={(value: 'cash' | 'card' | 'digital_wallet') => 
              onFormDataChange({ paymentMethod: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">
                <div className="flex items-center">
                  <Banknote className="w-4 h-4 mr-2" />
                  Tunai
                </div>
              </SelectItem>
              <SelectItem value="card">
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Kartu Debit/Kredit
                </div>
              </SelectItem>
              <SelectItem value="digital_wallet">
                <div className="flex items-center">
                  <Smartphone className="w-4 h-4 mr-2" />
                  E-Wallet (OVO, GoPay, dll)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="outline" className={paymentInfo.color}>
            {paymentInfo.icon}
            <span className="ml-2">{paymentInfo.label}</span>
          </Badge>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Catatan</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Catatan tambahan untuk session ini..."
            value={formData.notes}
            onChange={(e) => onFormDataChange({ notes: e.target.value })}
            rows={3}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Total Summary */}
      <Card className="border-2 border-indigo-200 bg-indigo-50">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Biaya Session:</span>
              <span>{formatCurrency(sessionCost.totalCost)}</span>
            </div>
            
            {totalEndOfSessionFnb > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>F&B (End of Session):</span>
                <span>{formatCurrency(totalEndOfSessionFnb)}</span>
              </div>
            )}
            
            {formData.fnbAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>F&B Manual:</span>
                <span>{formatCurrency(formData.fnbAmount)}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-lg font-bold border-t pt-2">
              <span>TOTAL BAYAR:</span>
              <span className="text-indigo-600">{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}