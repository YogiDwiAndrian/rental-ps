// src/components/staff/stop-session-dialog.tsx - COMPLETE dengan export function
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { 
  GetSessionFnbOrdersResponse, 
  StopSessionRequest, 
  StopSessionResponse,
  ApiFnbOrder,
  isGetSessionFnbOrdersResponse
} from '@/types/api'

// Import our sub-components
import { StopSessionDialogHeader } from './stop-session-dialog-header'
import { StopSessionDialogContent } from './stop-session-dialog-content'
import { StopSessionDialogFooter } from './stop-session-dialog-footer'

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

interface StopSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: ActiveSession
  locationId: string
  units: Unit[]
  onSuccess?: () => void
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculateActualDuration = (startTime: string): number => {
  const start = new Date(startTime)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60))
}

const formatDuration = (startTime: string): string => {
  const minutes = calculateActualDuration(startTime)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0) {
    return `${hours} jam ${mins} menit`
  }
  return `${mins} menit`
}

const resolveHourlyRate = (session: ActiveSession, units: Unit[]): number => {
  if (session.hourlyRate && session.hourlyRate > 0) {
    return session.hourlyRate
  }
  
  const unit = units.find(u => u.id === session.unitId)
  if (!unit?.hourlyRate || unit.hourlyRate <= 0) {
    throw new Error(
      `Invalid hourly rate configuration for unit ${session.unitName}. ` +
      `Session rate: ${session.hourlyRate}, Unit rate: ${unit?.hourlyRate}. ` +
      `Please ensure unit has valid pricing configuration.`
    )
  }
  
  return unit.hourlyRate
}

const calculateSessionCost = (
  session: ActiveSession | undefined,
  units: Unit[]
): SessionCost => {
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
      const overtimeMinutes = Math.abs(session.remainingMinutes)
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
// MAIN COMPONENT - DENGAN EXPORT
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

  let sessionCost: SessionCost = { baseCost: 0, overtimeCost: 0, totalCost: 0, hourlyRate: 0 }
  let calculationError: string | null = null

  try {
    sessionCost = calculateSessionCost(session, units)
  } catch (error) {
    calculationError = error instanceof Error ? error.message : 'Unknown calculation error'
    console.error('Session cost calculation error:', error)
  }

  // ============================================
  // DERIVED VALUES - FIXED CALCULATION
  // ============================================

  const sessionDuration = session ? formatDuration(session.startTime) : '0 menit'
  const actualMinutes = session ? calculateActualDuration(session.startTime) : 0

  // FIXED: Calculate F&B totals correctly - separate by payment timing
  const immediatePaymentOrders = attachedFnbOrders.filter(order => 
    order.paymentTiming === 'immediate' && order.status !== 'cancelled'
  )
  const endOfSessionOrders = attachedFnbOrders.filter(order => 
    order.paymentTiming === 'end_of_session' && order.status !== 'cancelled'
  )

  const totalImmediatePaymentFnb = immediatePaymentOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const totalEndOfSessionFnb = endOfSessionOrders.reduce((sum, order) => sum + order.totalAmount, 0)

  // FIXED: Final total ONLY includes session cost + end_of_session F&B + manual F&B
  // Immediate payments are EXCLUDED because they're already paid
  const finalTotal = sessionCost.totalCost + totalEndOfSessionFnb + formData.fnbAmount

  console.log('💰 Stop Session Calculation Fixed:', {
    sessionCost: sessionCost.totalCost,
    immediatePaymentFnb: totalImmediatePaymentFnb,
    endOfSessionFnb: totalEndOfSessionFnb, 
    manualFnb: formData.fnbAmount,
    finalTotal: finalTotal,
    immediateOrdersCount: immediatePaymentOrders.length,
    endOfSessionOrdersCount: endOfSessionOrders.length,
    note: 'Immediate payments excluded from final total - already paid separately'
  })

  // ============================================
  // F&B ORDERS FETCH
  // ============================================

  const fetchAttachedFnbOrders = async (): Promise<void> => {
    if (!session?.id) return
    
    setFetchingFnb(true)
    try {
      const response = await fetch(`/api/rentals/${session.id}/fnb-orders?locationId=${locationId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result: GetSessionFnbOrdersResponse = await response.json()
      
      if (!isGetSessionFnbOrdersResponse(result)) {
        throw new Error('Invalid response format')
      }
      
      if (result.success && result.data) {
        const orders: AttachedFnbOrder[] = result.data.map((order: ApiFnbOrder) => ({
          id: order.id,
          totalAmount: order.totalAmount,
          status: order.status,
          paymentTiming: order.paymentTiming || 'end_of_session',
          items: order.items.map(item => ({
            id: item.id,
            fnbItemId: item.fnbItemId,
            fnbItemName: item.fnbItemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          })),
          createdAt: order.createdAt,
          paidAt: order.paidAt
        }))
        setAttachedFnbOrders(orders)
      } else {
        setAttachedFnbOrders([])
      }
    } catch (error) {
      console.error('Error fetching F&B orders:', error)
      setAttachedFnbOrders([])
      toast.error('Failed to load F&B orders')
    } finally {
      setFetchingFnb(false)
    }
  }

  // ============================================
  // FORM HANDLERS
  // ============================================

  const handleFormDataChange = (newData: StopFormData) => {
    setFormData(newData)
  }

  const handleRefreshFnb = () => {
    fetchAttachedFnbOrders()
  }

  const handleSubmit = async () => {
    if (!session) return

    setLoading(true)
    try {
      const requestData: StopSessionRequest = {
        paymentMethod: formData.paymentMethod,
        fnbAmount: formData.fnbAmount,
        notes: formData.notes
      }

      const response = await fetch(`/api/rentals/${session.id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: StopSessionResponse = await response.json()

      if (result.success) {
        console.log('✅ Session stopped successfully:', {
          sessionId: session.id,
          finalTotal: finalTotal,
          sessionCost: sessionCost.totalCost,
          endOfSessionFnb: totalEndOfSessionFnb,
          manualFnb: formData.fnbAmount,
          immediatePaymentsExcluded: totalImmediatePaymentFnb,
          message: `Total billed: ${finalTotal} (excludes ${totalImmediatePaymentFnb} already paid F&B)`
        })

        toast.success('Session stopped successfully')
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

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (open && session) {
      console.log('🔍 Dialog opened for session:', session.id)
      // Reset form when dialog opens
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

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl h-[90vh] max-h-[700px] p-0 flex flex-col top-[5%] translate-y-0">
        {/* Fixed Header - Compact */}
        <div className="flex-shrink-0 p-3 sm:p-4 pb-2 sm:pb-3 border-b">
          <StopSessionDialogHeader
            session={session}
            sessionDuration={sessionDuration}
            actualMinutes={actualMinutes}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto px-3 sm:px-4 py-2">
            <StopSessionDialogContent
              session={session}
              sessionCost={sessionCost}
              attachedFnbOrders={attachedFnbOrders}
              formData={formData}
              onFormDataChange={handleFormDataChange}
              fetchingFnb={fetchingFnb}
              onRefreshFnb={handleRefreshFnb}
              calculationError={calculationError}
            />
          </div>
        </div>

        {/* Fixed Footer - Compact */}
        <div className="flex-shrink-0 border-t">
          <StopSessionDialogFooter
            session={session}
            sessionCost={sessionCost}
            finalTotal={finalTotal}
            formData={formData}
            loading={loading}
            calculationError={calculationError}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            endOfSessionFnbTotal={totalEndOfSessionFnb}
            immediatePaymentFnbTotal={totalImmediatePaymentFnb}
            endOfSessionCount={endOfSessionOrders.length}
            immediateCount={immediatePaymentOrders.length}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}