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
  onCancel
}: StopSessionDialogFooterProps) {
  const paymentInfo = getPaymentMethodInfo(formData.paymentMethod)
  const isSubmitDisabled = loading || !!calculationError || finalTotal <= 0

  return (
    <div className="bg-white">
      {/* Compact Action Buttons */}
      <DialogFooter className="px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex gap-2 w-full">
          {/* Cancel Button */}
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={loading}
            className="w-24 h-9 text-sm"
          >
            <Clock className="w-3 h-3 mr-1" />
            Batal
          </Button>

          {/* Submit Button */}
          <Button 
            onClick={onSubmit} 
            disabled={isSubmitDisabled}
            className={cn(
              "flex-1 h-9 text-white font-semibold text-sm",
              loading 
                ? "bg-gray-400" 
                : `bg-gradient-to-r ${paymentInfo.actionColor}`
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Memproses...
              </>
            ) : isSubmitDisabled ? (
              <>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Error
              </>
            ) : (
              <>
                <StopCircle className="w-3 h-3 mr-1" />
                Bayar {formatCurrency(finalTotal)}
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </div>
  )
}