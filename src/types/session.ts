// src/types/session.ts
import { BillingType, SessionStatus, PaymentStatus, Unit, FnbOrder, Transaction, User } from '@prisma/client'
import { PackageRate } from './package'

// ============================================
// SESSION MANAGEMENT TYPES
// ============================================

export interface RentalSession {
  id: string
  unitId: string
  unitName: string
  customerName?: string // ✅ ADDED: Opsional customer name
  billingModel: 'timer' | 'hourly' | 'package' // Keep as string literal (match existing)
  status: 'active' | 'completed' | 'cancelled' // Keep as string literal (match existing)
  startTime: string // Keep as string ISO format (match existing)
  endTime?: string // Keep as string ISO format (match existing)
  duration?: number // Keep as existing
  totalAmount: number
  purchasedDuration: number
  extendedDuration: number
  notes?: string
  createdBy?: string // ✅ ADDED: Staff ID who created session
  createdByName?: string // ✅ ADDED: Staff name who created session
  hasFnbOrders: boolean // Keep as existing
  fnbOrdersCount: number // Keep as existing
  fnbOrdersTotal: number // Keep as existing
  grandTotal?: number
}

// Interface untuk response API history
export interface SessionHistoryResponse {
  success: boolean
  data: RentalSession[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message: string
}

export interface SessionDetails {
  id: string
  unitId: string
  unitName: string
  locationId: string
  billingModel: BillingType
  startTime: Date
  endTime?: Date
  purchasedDuration: number
  extendedDuration: number
  totalAmount: number
  status: SessionStatus
  createdAt: Date
  updatedAt: Date
}

export interface SessionSummary {
  sessionId: string
  unitName: string
  billingModel: BillingType
  startTime: string
  duration: string
  amount: number
  status: SessionStatus
}

export interface ActiveSession {
  id: string
  unitId: string
  unitName: string
  billingModel: BillingType
  startTime: Date
  estimatedEndTime?: Date
  remainingMinutes?: number
  totalAmount?: number
  isOvertime: boolean
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface StartSessionRequest {
  unitId: string
  billingModel: 'timer' | 'hourly' | 'package'
  customerName?: string
  purchasedDuration?: number
  packageId?: string
  notes?: string
}

export interface StartSessionResponse {
  success: boolean
  data?: {
    sessionId: string
    unitName: string
    customerName?: string // ✅ ADDED
    createdBy?: string // ✅ ADDED
    createdByName?: string // ✅ ADDED
    billingModel: 'timer' | 'hourly' | 'package'
    startTime: string
    purchasedDuration?: number
    totalAmount?: number
    estimatedEndTime?: string
  }
  error?: string
  details?: unknown
}

export interface StopSessionRequest {
  paymentMethod?: 'cash' | 'card' | 'digital_wallet'
  notes?: string
  fnbAmount?: number
}

export interface StopSessionResponse {
  success: boolean
  data?: {
    sessionId: string
    unitName: string
    duration: string
    totalAmount: number
    paymentMethod: string
    receipt: SessionReceipt
  }
  error?: string
  details?: unknown
}

export interface ExtendSessionRequest {
  additionalDuration: number
  paymentMethod?: 'cash' | 'card' | 'digital_wallet'
  notes?: string
}

export interface ExtendSessionResponse {
  success: boolean
  data?: {
    sessionId: string
    unitName: string
    originalEndTime: string
    newEndTime: string
    additionalAmount: number
    totalPaid: number
    extensionCount: number
  }
  error?: string
  details?: unknown
}

export interface SessionReceipt {
  sessionId: string
  unitName: string
  startTime: string
  endTime: string
  duration: string
  billingModel: string
  totalAmount: number
  paymentMethod: string
  locationName?: string
}

// ============================================
// UTILITY TYPES
// ============================================

export interface SessionCalculation {
  durationMinutes: number
  durationFormatted: string
  totalAmount: number
  isOvertime: boolean
  overtimeMinutes?: number
}

export interface UnitAvailability {
  unitId: string
  unitName: string
  status: 'available' | 'occupied' | 'maintenance' | 'broken'
  currentSession?: {
    sessionId: string
    startTime: Date
    estimatedEndTime?: Date
    remainingMinutes?: number
  }
}

export interface SessionError {
  code: 'VALIDATION_ERROR' | 'UNIT_UNAVAILABLE' | 'SESSION_NOT_FOUND' | 'ACCESS_DENIED' | 'BILLING_ERROR' | 'INTERNAL_ERROR'
  message: string
  details?: unknown
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

import { z } from 'zod'

export const startSessionSchema = z.object({
  unitId: z.string().min(1, 'Unit ID is required'),
  billingModel: z.enum(['timer', 'hourly', 'package']),
  customerName: z.string().max(100, 'Customer name too long').optional(),
  purchasedDuration: z.number().int().min(15, 'Minimum duration is 15 minutes').max(720, 'Maximum duration is 12 hours').optional(),
  packageId: z.string().optional(),
  notes: z.string().max(500, 'Notes too long').optional()
}).refine((data) => {
  // Hourly billing requires purchased duration
  if (data.billingModel === 'hourly' && !data.purchasedDuration) {
    return false
  }
  // Package billing requires package ID
  if (data.billingModel === 'package' && !data.packageId) {
    return false
  }
  return true
}, {
  message: 'Missing required fields for billing model'
})

export const stopSessionSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash'),
  notes: z.string().max(500, 'Notes too long').optional(),
  fnbAmount: z.number().min(0, 'F&B amount cannot be negative').optional()
})

export const extendSessionSchema = z.object({
  additionalDuration: z.number().int().min(15, 'Minimum extension is 15 minutes').max(480, 'Maximum extension is 8 hours'),
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash'),
  notes: z.string().max(500, 'Notes too long').optional()
})

// ============================================
// BUSINESS LOGIC TYPES
// ============================================

export interface BillingCalculation {
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

export interface SessionValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface SessionMetrics {
  totalSessions: number
  activeSessions: number
  completedSessions: number
  totalRevenue: number
  averageSessionDuration: number
  averageSessionValue: number
  peakHours: { hour: number; count: number }[]
}

// ============================================
// HOOKS TYPES
// ============================================

export interface UseSessionManagementReturn {
  // State
  activeSessions: ActiveSession[]
  loading: boolean
  error: string | null
  
  // Actions
  startSession: (request: StartSessionRequest) => Promise<StartSessionResponse>
  stopSession: (sessionId: string, request: StopSessionRequest) => Promise<StopSessionResponse>
  extendSession: (sessionId: string, request: ExtendSessionRequest) => Promise<ExtendSessionResponse>
  refreshSessions: () => Promise<void>
  
  // Utils
  calculateSessionDuration: (startTime: Date, endTime?: Date) => SessionCalculation
  formatSessionDuration: (minutes: number) => string
  getSessionStatus: (session: ActiveSession) => 'normal' | 'overtime' | 'ending_soon'
}