// src/lib/session-utils.ts
import { BillingType } from '@prisma/client'

// ============================================
// TYPES FOR SESSION CALCULATIONS
// ============================================

interface SessionCalculation {
  durationMinutes: number
  durationFormatted: string
  totalAmount: number
  isOvertime: boolean
  overtimeMinutes?: number
}

interface BillingCalculation {
  billingModel: BillingType
  baseRate: number
  duration: number
  amount: number
  breakdown: {
    baseAmount: number
    extensionAmount: number
    totalAmount: number
  }
}

interface SessionValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// ============================================
// TYPES FOR F&B INTEGRATION
// ============================================

interface FnbOrderItem {
  id: string
  fnbItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface FnbOrder {
  id: string
  items: FnbOrderItem[]
  totalAmount: number
  status: 'pending' | 'completed' | 'cancelled'
  paymentTiming: 'immediate' | 'end_of_session'
  createdAt: string
}

interface BillingRate {
  id: string
  billingType: BillingType
  pricePerMinute?: number
  pricePerHour: number
  packagePrice?: number
  timeLimit?: number
}

interface SessionWithFnbCalculation {
  sessionCost: number
  fnbCost: number
  totalCost: number
  paidAmount: number
  remainingAmount: number
  breakdown: {
    session: {
      durationMinutes: number
      billingType: BillingType
      baseRate: number
      calculatedCost: number
    }
    fnb: {
      totalOrders: number
      totalAmount: number
      paidAmount: number
      unpaidAmount: number
      unpaidOrders: FnbOrder[]
    }
  }
}

interface SessionReceipt {
  sessionDetails: {
    unitName: string
    customerName?: string
    startTime: string
    endTime: string
    duration: string
    billingType: BillingType
    sessionCost: number
  }
  fnbOrders: Array<{
    orderId: string
    items: Array<{
      name: string
      quantity: number
      unitPrice: number
      totalPrice: number
    }>
    totalAmount: number
    status: string
  }>
  payment: {
    subtotal: number
    fnbSubtotal: number
    totalAmount: number
    paymentMethod: string
    paidAt: string
  }
}

// ============================================
// EXISTING SESSION CALCULATION UTILITIES
// ============================================

/**
 * Calculate session duration and amounts
 */
export function calculateSessionDuration(
  startTime: Date,
  endTime?: Date
): SessionCalculation {
  const end = endTime || new Date()
  const durationMs = end.getTime() - startTime.getTime()
  const durationMinutes = Math.ceil(durationMs / (1000 * 60)) // Round up to next minute
  
  // Format duration for display
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  const durationFormatted = hours > 0 
    ? `${hours}h ${minutes}m` 
    : `${minutes}m`

  // Check if overtime (more than 12 hours is considered overtime)
  const isOvertime = durationMinutes > 720 // 12 hours
  const overtimeMinutes = isOvertime ? durationMinutes - 720 : undefined

  return {
    durationMinutes,
    durationFormatted,
    totalAmount: 0, // Will be calculated based on billing model
    isOvertime,
    overtimeMinutes
  }
}

/**
 * Calculate billing amount based on billing model
 */
export function calculateBillingAmount(
  billingModel: BillingType,
  hourlyRate: number,
  durationMinutes: number,
  purchasedDuration?: number,
  packageAmount?: number
): BillingCalculation {
  let baseAmount = 0
  let extensionAmount = 0

  switch (billingModel) {
    case 'timer':
      // Calculate based on actual duration
      baseAmount = Math.ceil(durationMinutes * (hourlyRate / 60))
      break

    case 'hourly':
      if (purchasedDuration) {
        // Base amount for purchased duration
        baseAmount = Math.ceil(purchasedDuration * (hourlyRate / 60))
        
        // Extension amount if duration exceeds purchased
        if (durationMinutes > purchasedDuration) {
          const extensionMinutes = durationMinutes - purchasedDuration
          extensionAmount = Math.ceil(extensionMinutes * (hourlyRate / 60))
        }
      } else {
        baseAmount = Math.ceil(durationMinutes * (hourlyRate / 60))
      }
      break

    case 'package':
      // Use fixed package amount
      baseAmount = packageAmount || 0
      
      // Extension amount if duration exceeds package duration (if applicable)
      if (purchasedDuration && durationMinutes > purchasedDuration) {
        const extensionMinutes = durationMinutes - purchasedDuration
        extensionAmount = Math.ceil(extensionMinutes * (hourlyRate / 60))
      }
      break

    case 'hybrid':
      // For hybrid billing, default to timer calculation
      baseAmount = Math.ceil(durationMinutes * (hourlyRate / 60))
      break

    default:
      throw new Error(`Unsupported billing model: ${billingModel}`)
  }

  const totalAmount = baseAmount + extensionAmount

  return {
    billingModel,
    baseRate: hourlyRate,
    duration: durationMinutes,
    amount: totalAmount,
    breakdown: {
      baseAmount,
      extensionAmount,
      totalAmount
    }
  }
}

// ============================================
// NEW: F&B INTEGRATION UTILITIES
// ============================================

/**
 * Calculate session cost using billing rates (NEW)
 */
export function calculateSessionCost(
  startTime: Date,
  endTime: Date,
  billingType: BillingType,
  billingRates: BillingRate[]
): number {
  const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))
  
  switch (billingType) {
    case 'timer':
      const timerRate = billingRates.find(rate => 
        rate.billingType === 'timer' && 
        (!rate.timeLimit || durationMinutes <= rate.timeLimit)
      )
      return timerRate ? (timerRate.pricePerMinute || 0) * durationMinutes : 0

    case 'hourly':
      const hourlyRate = billingRates.find(rate => rate.billingType === 'hourly')
      if (hourlyRate) {
        const hours = Math.ceil(durationMinutes / 60)
        return hourlyRate.pricePerHour * hours
      }
      return 0

    case 'package':
      const packageRate = billingRates.find(rate => 
        rate.billingType === 'package' &&
        (!rate.timeLimit || durationMinutes <= rate.timeLimit)
      )
      return packageRate ? (packageRate.packagePrice || packageRate.pricePerHour) : 0

    case 'hybrid':
      const packageLimit = billingRates.find(rate => rate.billingType === 'package')
      const hourlyFallback = billingRates.find(rate => rate.billingType === 'hourly')
      
      if (packageLimit && hourlyFallback) {
        const packageTimeLimit = packageLimit.timeLimit || 0
        if (durationMinutes <= packageTimeLimit) {
          return packageLimit.packagePrice || packageLimit.pricePerHour
        } else {
          const extraMinutes = durationMinutes - packageTimeLimit
          const extraHours = Math.ceil(extraMinutes / 60)
          return (packageLimit.packagePrice || packageLimit.pricePerHour) + 
                 (hourlyFallback.pricePerHour * extraHours)
        }
      }
      return 0

    default:
      return 0
  }
}

/**
 * Get unpaid F&B orders from session (NEW)
 */
export function getUnpaidFnbOrders(fnbOrders: FnbOrder[]): FnbOrder[] {
  return fnbOrders.filter(order => 
    order.status === 'pending' && 
    order.paymentTiming === 'end_of_session'
  )
}

/**
 * Calculate total F&B cost from orders (NEW)
 */
export function getFnbOrdersTotal(
  fnbOrders: FnbOrder[],
  includeOnlyUnpaid: boolean = false
): { totalAmount: number; paidAmount: number; unpaidAmount: number } {
  let totalAmount = 0
  let paidAmount = 0
  let unpaidAmount = 0

  fnbOrders.forEach(order => {
    if (order.status === 'cancelled') return

    totalAmount += order.totalAmount

    if (order.paymentTiming === 'immediate' || order.status === 'completed') {
      paidAmount += order.totalAmount
    } else {
      unpaidAmount += order.totalAmount
    }
  })

  return {
    totalAmount: includeOnlyUnpaid ? unpaidAmount : totalAmount,
    paidAmount,
    unpaidAmount
  }
}

/**
 * Calculate complete session with F&B integration (NEW)
 */
export function calculateSessionWithFnb(
  startTime: Date,
  endTime: Date,
  billingType: BillingType,
  billingRates: BillingRate[],
  fnbOrders: FnbOrder[]
): SessionWithFnbCalculation {
  // Calculate session cost
  const sessionCost = calculateSessionCost(startTime, endTime, billingType, billingRates)
  const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))

  // Calculate F&B costs
  const fnbTotals = getFnbOrdersTotal(fnbOrders)
  const unpaidOrders = getUnpaidFnbOrders(fnbOrders)

  // Calculate totals
  const totalCost = sessionCost + fnbTotals.unpaidAmount
  const paidAmount = fnbTotals.paidAmount
  const remainingAmount = Math.max(0, totalCost - paidAmount)

  // Find base rate for breakdown
  const baseRate = billingRates.find(rate => rate.billingType === billingType)?.pricePerHour || 0

  return {
    sessionCost,
    fnbCost: fnbTotals.unpaidAmount,
    totalCost,
    paidAmount,
    remainingAmount,
    breakdown: {
      session: {
        durationMinutes,
        billingType,
        baseRate,
        calculatedCost: sessionCost
      },
      fnb: {
        totalOrders: fnbOrders.length,
        totalAmount: fnbTotals.totalAmount,
        paidAmount: fnbTotals.paidAmount,
        unpaidAmount: fnbTotals.unpaidAmount,
        unpaidOrders
      }
    }
  }
}

/**
 * Generate session receipt with F&B details (NEW)
 */
export function generateSessionReceipt(
  sessionData: {
    unitName: string
    customerName?: string
    startTime: Date
    endTime: Date
    billingType: BillingType
    sessionCost: number
  },
  fnbOrders: FnbOrder[],
  paymentData: {
    totalAmount: number
    paymentMethod: string
    paidAt: Date
  }
): SessionReceipt {
  const durationMinutes = Math.floor((sessionData.endTime.getTime() - sessionData.startTime.getTime()) / (1000 * 60))
  const fnbTotals = getFnbOrdersTotal(fnbOrders)

  return {
    sessionDetails: {
      unitName: sessionData.unitName,
      customerName: sessionData.customerName,
      startTime: sessionData.startTime.toISOString(),
      endTime: sessionData.endTime.toISOString(),
      duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
      billingType: sessionData.billingType,
      sessionCost: sessionData.sessionCost
    },
    fnbOrders: fnbOrders.map(order => ({
      orderId: order.id,
      items: order.items.map(item => ({
        name: item.fnbItemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      totalAmount: order.totalAmount,
      status: order.status
    })),
    payment: {
      subtotal: sessionData.sessionCost,
      fnbSubtotal: fnbTotals.unpaidAmount,
      totalAmount: paymentData.totalAmount,
      paymentMethod: paymentData.paymentMethod,
      paidAt: paymentData.paidAt.toISOString()
    }
  }
}

// ============================================
// EXISTING UTILITIES (UNCHANGED)
// ============================================

/**
 * Format duration in minutes to human readable string
 */
export function formatSessionDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Calculate remaining time for a session
 */
export function calculateRemainingTime(
  startTime: Date,
  purchasedDuration: number,
  extendedDuration: number = 0
): { remainingMinutes: number; estimatedEndTime: Date; isOvertime: boolean } {
  const now = new Date()
  const totalDuration = purchasedDuration + extendedDuration
  const estimatedEndTime = new Date(startTime.getTime() + totalDuration * 60000)
  const remainingMs = estimatedEndTime.getTime() - now.getTime()
  const remainingMinutes = Math.max(0, Math.floor(remainingMs / (1000 * 60)))
  const isOvertime = remainingMs < 0

  return {
    remainingMinutes,
    estimatedEndTime,
    isOvertime
  }
}

/**
 * Get session status based on remaining time
 */
export function getSessionStatus(
  startTime: Date,
  purchasedDuration?: number,
  extendedDuration: number = 0
): 'normal' | 'ending_soon' | 'overtime' {
  if (!purchasedDuration) {
    return 'normal' // Timer billing has no fixed end time
  }

  const { remainingMinutes, isOvertime } = calculateRemainingTime(
    startTime,
    purchasedDuration,
    extendedDuration
  )

  if (isOvertime) {
    return 'overtime'
  }

  if (remainingMinutes <= 15) {
    return 'ending_soon'
  }

  return 'normal'
}

/**
 * Validate session start request
 */
export function validateSessionStart(
  unitStatus: string,
  billingModel: BillingType,
  purchasedDuration?: number,
  packageId?: string,
  packageRates?: Record<string, number>
): SessionValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // Check unit availability
  if (unitStatus !== 'available') {
    errors.push(`Unit is currently ${unitStatus}`)
  }

  // Validate billing model requirements
  switch (billingModel) {
    case 'hourly':
      if (!purchasedDuration) {
        errors.push('Purchased duration is required for hourly billing')
      } else if (purchasedDuration < 15) {
        errors.push('Minimum duration is 15 minutes')
      } else if (purchasedDuration > 720) {
        errors.push('Maximum duration is 12 hours')
      }
      break

    case 'package':
      if (!packageId) {
        errors.push('Package ID is required for package billing')
      } else if (packageRates && !packageRates[packageId]) {
        errors.push('Invalid package ID for this unit')
      }
      break

    case 'timer':
      // No specific validation needed for timer billing
      if (purchasedDuration) {
        warnings.push('Duration is ignored for timer billing')
      }
      break

    case 'hybrid':
      // Hybrid billing accepts both timer and package modes
      if (purchasedDuration && purchasedDuration < 15) {
        errors.push('Minimum duration is 15 minutes when specified')
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate session extension request
 */
export function validateSessionExtension(
  billingModel: BillingType,
  additionalDuration: number,
  currentDuration: number
): SessionValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if billing model supports extension
  if (billingModel === 'timer') {
    errors.push('Timer billing sessions cannot be extended')
  }

  // Validate extension duration
  if (additionalDuration < 15) {
    errors.push('Minimum extension is 15 minutes')
  }

  if (additionalDuration > 480) {
    errors.push('Maximum extension is 8 hours')
  }

  // Check total duration after extension
  const totalDuration = currentDuration + additionalDuration
  if (totalDuration > 1440) { // 24 hours
    warnings.push('Total session duration will exceed 24 hours')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}