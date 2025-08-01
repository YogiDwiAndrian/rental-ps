// src/components/staff/stop-session-dialog-content.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calculator,
  Coffee,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  ShoppingCart,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Package,
  DollarSign,
  Info,
  RefreshCw,
  FileText
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
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
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
  
  // Separate orders by payment timing
  const immediateOrders = attachedFnbOrders.filter(order => order.paymentTiming === 'immediate')
  const endOfSessionOrders = attachedFnbOrders.filter(order => order.paymentTiming === 'end_of_session')
  
  // Calculate totals
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
              <span>{session.billingModel === 'timer' ? 'Biaya Bermain' : 'Biaya Dasar'}</span>
              <span className="font-medium">{formatCurrency(sessionCost.baseCost)}</span>
            </div>
            
            {sessionCost.overtimeCost > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-700">Biaya Overtime</span>
                <span className="font-medium text-amber-700">{formatCurrency(sessionCost.overtimeCost)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Session</span>
              <span className="text-lg font-bold text-blue-600">{formatCurrency(sessionCost.totalCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* F&B Orders Section */}
      <Card className="border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coffee className="w-4 h-4 text-orange-600" />
              F&B Orders
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshFnb}
              disabled={fetchingFnb}
              className="h-7 px-2"
            >
              <RefreshCw className={cn("w-3 h-3", fetchingFnb && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {attachedFnbOrders.length > 0 ? (
            <div className="space-y-2">
              {/* End of Session Orders (Belum Bayar) */}
              {endOfSessionOrders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Bayar Bersamaan
                    </Badge>
                    <span className="text-xs text-gray-600">{endOfSessionOrders.length} pesanan</span>
                  </div>
                  
                  {endOfSessionOrders.map((order) => (
                    <div key={order.id} className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-3 h-3 text-orange-600" />
                          <span className="text-xs font-medium">#{order.id.slice(-6)}</span>
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {order.status}
                          </Badge>
                        </div>
                        <span className="font-semibold text-orange-700 text-sm">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>
                      
                      <div className="space-y-0.5">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="truncate flex-1 mr-2">
                              {item.quantity}x {item.fnbItemName}
                            </span>
                            <span>{formatCurrency(item.totalPrice)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTime(order.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Immediate Payment Orders (Sudah Bayar) */}
              {immediateOrders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Sudah Dibayar
                    </Badge>
                    <span className="text-xs text-gray-600">{immediateOrders.length} pesanan</span>
                  </div>
                  
                  {immediateOrders.map((order) => (
                    <div key={order.id} className="p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-medium">#{order.id.slice(-6)}</span>
                          <Badge variant="outline" className="text-xs px-1 py-0 bg-green-100">
                            Lunas
                          </Badge>
                        </div>
                        <span className="font-semibold text-green-700 text-sm">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>
                      
                      <div className="space-y-0.5">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="truncate flex-1 mr-2">
                              {item.quantity}x {item.fnbItemName}
                            </span>
                            <span>{formatCurrency(item.totalPrice)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        {order.paidAt ? formatTime(order.paidAt) : formatTime(order.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* F&B Summary */}
              {totalEndOfSessionFnb > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">F&B Belum Bayar</span>
                    <span className="text-lg font-bold text-orange-600">{formatCurrency(totalEndOfSessionFnb)}</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-3 text-gray-500">
              <Coffee className="w-6 h-6 mx-auto mb-1 text-gray-300" />
              <p className="text-xs">Tidak ada pesanan F&B</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-4 h-4 text-green-600" />
            Metode Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Select
            value={formData.paymentMethod}
            onValueChange={(value: 'cash' | 'card' | 'digital_wallet') =>
              onFormDataChange({ paymentMethod: value })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-600" />
                  <span>Tunai</span>
                </div>
              </SelectItem>
              <SelectItem value="card">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Kartu</span>
                </div>
              </SelectItem>
              <SelectItem value="digital_wallet">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  <span>E-Wallet</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Payment Method Info */}
          <div className="p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-white">
                {paymentInfo.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{paymentInfo.label}</p>
                <p className="text-xs text-gray-600">
                  {formData.paymentMethod === 'cash' && 'Pembayaran dengan uang tunai'}
                  {formData.paymentMethod === 'card' && 'Pembayaran dengan kartu debit/kredit'}
                  {formData.paymentMethod === 'digital_wallet' && 'OVO, GoPay, DANA, dll'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-gray-600" />
            Catatan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Catatan untuk session ini (opsional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Catatan opsional..."
              value={formData.notes}
              onChange={(e) => onFormDataChange({ notes: e.target.value })}
              className="min-h-[50px] resize-none text-sm"
              rows={2}
            />
            <p className="text-xs text-gray-500">
              Catatan akan tersimpan dalam riwayat session
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Final Total Summary */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-green-600" />
              <h3 className="text-base font-bold text-green-900">Ringkasan Pembayaran</h3>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700">Biaya Session</span>
                <span className="font-medium">{formatCurrency(sessionCost.totalCost)}</span>
              </div>
              
              {totalEndOfSessionFnb > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">F&B (Belum Bayar)</span>
                  <span className="font-medium">{formatCurrency(totalEndOfSessionFnb)}</span>
                </div>
              )}
              
              {formData.fnbAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">F&B Tambahan</span>
                  <span className="font-medium">{formatCurrency(formData.fnbAmount)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-green-900">Total Bayar</span>
                <span className="text-2xl font-bold text-green-700">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>

            {/* Payment Method Display */}
            <div className="pt-2 border-t border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Metode Pembayaran:</span>
                <Badge variant="outline" className={cn("border", paymentInfo.color)}>
                  {paymentInfo.icon}
                  <span className="ml-2 text-xs">{paymentInfo.label}</span>
                </Badge>
              </div>
            </div>

            {/* Additional Info */}
            {(totalImmediateFnb > 0 || session.isOvertime) && (
              <div className="pt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <Info className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 space-y-0.5">
                    {totalImmediateFnb > 0 && (
                      <p>• F&B {formatCurrency(totalImmediateFnb)} sudah dibayar sebelumnya</p>
                    )}
                    {session.isOvertime && (
                      <p>• Overtime lebih dari 5 menit dikenakan biaya tambahan</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}