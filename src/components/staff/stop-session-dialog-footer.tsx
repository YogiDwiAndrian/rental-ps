// src/components/staff/stop-session-dialog-footer.tsx
'use client'

import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  StopCircle, 
  Clock, 
  Loader2,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Receipt
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

interface StopSessionDialogFooterProps {
  session: ActiveSession
  sessionCost: SessionCost
  finalTotal: number
  formData: StopFormData
  loading: boolean
  calculationError: string | null
  onSubmit: () => void
  onCancel: () => void
  // ✅ ADDED: F&B breakdown props
  endOfSessionFnbTotal?: number
  immediatePaymentFnbTotal?: number
  endOfSessionCount?: number
  immediateCount?: number
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

const getPaymentMethodInfo = (method: string) => {
  switch (method) {
    case 'cash':
      return {
        label: 'Tunai',
        icon: <Banknote className="w-3 h-3 sm:w-4 sm:h-4" />,
        color: 'bg-green-50 text-green-700 border-green-200',
        actionColor: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
      }
    case 'card':
      return {
        label: 'Kartu',
        icon: <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />,
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        actionColor: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      }
    case 'digital_wallet':
      return {
        label: 'E-Wallet',
        icon: <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />,
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        actionColor: 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
      }
    default:
      return {
        label: 'Unknown',
        icon: <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />,
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        actionColor: 'from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
      }
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StopSessionDialogFooter({
  session,
  sessionCost,
  finalTotal,
  formData,
  loading,
  calculationError,
  onSubmit,
  onCancel,
  // ✅ ADDED: F&B breakdown
  endOfSessionFnbTotal = 0,
  immediatePaymentFnbTotal = 0,
  endOfSessionCount = 0,
  immediateCount = 0
}: StopSessionDialogFooterProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

   const isValidPayment = finalTotal >= 0 && !calculationError

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* ✅ UPDATED: Breakdown Total dengan F&B Payment Timing */}
      <div className="space-y-2 border-t pt-3">
        <div className="text-sm font-medium text-gray-700 mb-2">Rincian Pembayaran:</div>
        
        {/* Session Cost */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Biaya Session:</span>
          <span className="font-medium">{formatCurrency(sessionCost.totalCost)}</span>
        </div>

        {/* ✅ ADDED: F&B End of Session (yang akan ditagih) */}
        {endOfSessionCount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-orange-600">F&B Belum Dibayar ({endOfSessionCount} items):</span>
            <span className="font-medium text-orange-700">+{formatCurrency(endOfSessionFnbTotal)}</span>
          </div>
        )}

        {/* Manual F&B Amount */}
        {formData.fnbAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-blue-600">F&B Manual:</span>
            <span className="font-medium text-blue-700">+{formatCurrency(formData.fnbAmount)}</span>
          </div>
        )}

        {/* ✅ ADDED: F&B Immediate Payment (untuk info, tidak ditagih) */}
        {immediateCount > 0 && (
          <div className="flex justify-between text-sm opacity-60">
            <span className="text-gray-500 line-through">F&B Sudah Dibayar ({immediateCount} items):</span>
            <span className="text-gray-500 line-through">{formatCurrency(immediatePaymentFnbTotal)}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t my-2"></div>

        {/* ✅ FIXED: Final Total (hanya include yang akan ditagih) */}
        <div className="flex justify-between text-base font-bold">
          <span className="text-gray-900">Total Tagihan:</span>
          <span className="text-green-600">{formatCurrency(finalTotal)}</span>
        </div>

        {/* ✅ ADDED: Info jika ada F&B immediate payment */}
        {immediateCount > 0 && (
          <div className="text-xs text-gray-500 italic">
            * {immediateCount} F&B items sudah dibayar terpisah ({formatCurrency(immediatePaymentFnbTotal)})
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Batal
        </Button>
        <Button
          onClick={onSubmit}
          disabled={loading || !isValidPayment}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Memproses...
            </>
          ) : (
            `Bayar ${formatCurrency(finalTotal)}`
          )}
        </Button>
      </div>

      {/* Error Display */}
      {calculationError && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          Error: {calculationError}
        </div>
      )}
    </div>
  )
}