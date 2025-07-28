// src/types/session.ts
import { BillingType } from '@prisma/client'

// ============================================
// SESSION TYPES (Standardized)
// ============================================

export interface ActiveSession {
  id: string
  unitId: string
  unitName: string
  billingModel: 'timer' | 'hourly' | 'package'
  startTime: string // ISO string for API compatibility
  estimatedEndTime?: string // ISO string for API compatibility
  remainingMinutes?: number
  totalAmount?: number
  isOvertime: boolean
}

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
}

export interface SessionCalculation {
  durationMinutes: number
  durationFormatted: string
  totalAmount: number
  isOvertime: boolean
  overtimeMinutes?: number
}

// ============================================
// UNIT TYPES (Standardized)
// ============================================

export interface Unit {
  id: string
  name: string
  consoleType: string
  controllerCount: number
  status: 'available' | 'occupied' | 'maintenance' | 'broken'
  hourlyRate: number
  customerDisplayName?: string
  packages?: PackageRate[]
  // For customer page compatibility
  remainingMinutes?: number
  specifications?: {
    packageRates?: Record<string, number>
    games?: string[]
    storage?: string
    resolution?: string
    features?: string[]
    accessories?: string[]
    [key: string]: unknown
  }
  locationName?: string
}

export interface UnitStatus {
  id: string
  name: string
  status: string
  currentSession?: {
    sessionId: string
    remainingMinutes?: number
  }
}

// ============================================
// PACKAGE TYPES
// ============================================

export interface PackageRate {
  id: string
  name: string
  durationMinutes: number
  price: number
  description?: string
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePackageRequest {
  name: string
  durationMinutes: number
  price: number
  description?: string
  displayOrder?: number
  isActive?: boolean
}

export interface UpdatePackageRequest {
  id: string
  name?: string
  durationMinutes?: number
  price?: number
  description?: string
  displayOrder?: number
  isActive?: boolean
}

export interface PackageManagementResponse {
  success: boolean
  data?: {
    packages: PackageRate[]
  }
  error?: string
  message?: string
}

// ============================================
// API RESPONSE TYPES (Standardized)
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: unknown
}

export interface ActiveSessionsResponse {
  success: boolean
  data?: Array<{
    sessionId: string
    unitId: string
    unitName: string
    billingModel: 'timer' | 'hourly' | 'package'
    startTime: string
    estimatedEndTime?: string
    remainingMinutes?: number
    totalAmount?: number
    isOvertime: boolean
  }>
  error?: string
}

export interface UnitsStatusResponse {
  success: boolean
  data?: {
    units: Array<{
      id: string
      name: string
      status: string
      currentSession?: {
        sessionId: string
        remainingMinutes?: number
      }
    }>
  }
  error?: string
}

// ============================================
// HOOK RETURN TYPES
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
  calculateSessionDuration: (startTime: string, endTime?: string) => SessionCalculation
  formatSessionDuration: (minutes: number) => string
  getSessionStatus: (session: ActiveSession) => 'normal' | 'warning' | 'overtime'
}

export interface UseUnitsStatusReturn {
  units: UnitStatus[]
  loading: boolean
  refreshUnits: () => Promise<void>
}

export interface UsePackageManagementReturn {
  // State
  packages: PackageRate[]
  loading: boolean
  error: string | null
  
  // Actions
  fetchPackages: (unitId: string) => Promise<void>
  createPackage: (unitId: string, packageData: CreatePackageRequest) => Promise<boolean>
  updatePackage: (unitId: string, packageData: UpdatePackageRequest) => Promise<boolean>
  deletePackage: (unitId: string, packageId: string) => Promise<boolean>
  reorderPackages: (unitId: string, packages: PackageRate[]) => Promise<boolean>
  
  // Utils
  validatePackageData: (packageData: Partial<CreatePackageRequest>) => { isValid: boolean; errors: string[] }
  formatPackageDuration: (minutes: number) => string
}

// ============================================
// COMPONENT PROPS TYPES
// ============================================

export interface SessionManagementProps {
  locationId: string
  units: Unit[]
  onRefresh?: () => void
}

export interface SessionCardProps {
  session: ActiveSession
  onExtend: (sessionId: string) => void
  onStop: (sessionId: string) => void
  onRefresh: () => void
}

export interface UnitCardProps {
  unit: Unit
  activeSession?: ActiveSession
  onStartSession: (unitId: string) => void
  onExtendSession?: (sessionId: string) => void
  onStopSession?: (sessionId: string) => void
}

export interface StartSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  units: Unit[]
  selectedUnit?: Unit
  locationId: string
  onSuccess?: () => void
}

export interface ExtendSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: ActiveSession
  locationId: string
  hourlyRate: number
  onSuccess?: () => void
}

export interface StopSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: ActiveSession
  locationId: string
  onSuccess?: () => void
}

// ============================================
// FORM TYPES
// ============================================

export interface SessionFormData {
  unitId: string
  billingModel: 'timer' | 'hourly' | 'package'
  customerName: string
  purchasedDuration: number
  packageId: string
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
  notes: string
  additionalDuration: number
  fnbAmount: number
}

export interface SessionFormErrors {
  unitId?: string
  billingModel?: string
  customerName?: string
  purchasedDuration?: string
  packageId?: string
  paymentMethod?: string
  notes?: string
  additionalDuration?: string
  fnbAmount?: string
}

// ============================================
// UTILITY TYPES
// ============================================

export type SessionStatusType = 'normal' | 'warning' | 'overtime'
export type PaymentMethodType = 'cash' | 'card' | 'digital_wallet'
export type BillingModelType = 'timer' | 'hourly' | 'package'
export type UnitStatusType = 'available' | 'occupied' | 'maintenance' | 'broken'

// ============================================
// CONSTANTS
// ============================================

export const BILLING_MODELS = {
  TIMER: 'timer' as const,
  HOURLY: 'hourly' as const,
  PACKAGE: 'package' as const
} as const

export const PAYMENT_METHODS = {
  CASH: 'cash' as const,
  CARD: 'card' as const,
  DIGITAL_WALLET: 'digital_wallet' as const
} as const

export const UNIT_STATUSES = {
  AVAILABLE: 'available' as const,
  OCCUPIED: 'occupied' as const,
  MAINTENANCE: 'maintenance' as const,
  BROKEN: 'broken' as const
} as const

export const SESSION_STATUSES = {
  NORMAL: 'normal' as const,
  WARNING: 'warning' as const,
  OVERTIME: 'overtime' as const
} as const

// ============================================
// VALIDATION SCHEMAS (for reference)
// ============================================

export const SESSION_VALIDATION_RULES = {
  MIN_DURATION: 1, // minutes
  MAX_DURATION: 720, // 12 hours
  MIN_PACKAGE_DURATION: 15, // minutes
  MAX_PACKAGE_DURATION: 480, // 8 hours
  MIN_EXTENSION_DURATION: 15, // minutes
  MAX_EXTENSION_DURATION: 240, // 4 hours
  MIN_PACKAGE_PRICE: 5000, // IDR
  MAX_PACKAGE_PRICE: 1000000, // IDR
  WARNING_TIME_THRESHOLD: 15, // minutes before overtime
  OVERTIME_GRACE_PERIOD: 5 // minutes
} as const

// ============================================
// ERROR TYPES
// ============================================

export interface SessionError {
  code: string
  message: string
  field?: string
  details?: unknown
}

export const SESSION_ERROR_CODES = {
  UNIT_NOT_AVAILABLE: 'UNIT_NOT_AVAILABLE',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  INVALID_BILLING_MODEL: 'INVALID_BILLING_MODEL',
  INSUFFICIENT_DURATION: 'INSUFFICIENT_DURATION',
  PACKAGE_NOT_FOUND: 'PACKAGE_NOT_FOUND',
  UNIT_ALREADY_OCCUPIED: 'UNIT_ALREADY_OCCUPIED',
  SESSION_ALREADY_STOPPED: 'SESSION_ALREADY_STOPPED',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const