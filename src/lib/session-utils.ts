// src/lib/session-utils.ts
import { BillingType } from '@prisma/client'
import { SessionCalculation, BillingCalculation, SessionValidation } from '@/types/session'

// ============================================
// SESSION CALCULATION UTILITIES
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

// ============================================
// SESSION VALIDATION UTILITIES
// ============================================

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

// ============================================
// PACKAGE UTILITIES - FULLY FLEXIBLE SYSTEM
// ============================================

import { PackageRate } from '@/types/package'

/**
 * Get available packages for a unit (NEW: Fully flexible)
 */
export function getAvailablePackages(packageRates: PackageRate[]): PackageRate[] {
  return packageRates
    .filter(pkg => pkg.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
}

/**
 * Get package duration by ID (NEW: Dynamic from data)
 */
export function getPackageDuration(packageRates: PackageRate[], packageId: string): number {
  const packageRate = packageRates.find(pkg => pkg.id === packageId)
  return packageRate?.duration || 60 // Default 1 hour if not found
}

/**
 * Get package price by ID (NEW: Dynamic from data)
 */
export function getPackagePrice(packageRates: PackageRate[], packageId: string): number {
  const packageRate = packageRates.find(pkg => pkg.id === packageId)
  return packageRate?.price || 0
}

/**
 * Get package details by ID
 */
export function getPackageDetails(packageRates: PackageRate[], packageId: string): PackageRate | null {
  return packageRates.find(pkg => pkg.id === packageId) || null
}

/**
 * Validate package configuration
 */
export function validatePackage(packageData: Omit<PackageRate, 'id' | 'createdAt' | 'updatedAt'>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate name
  if (!packageData.name?.trim()) {
    errors.push('Package name is required')
  } else if (packageData.name.length > 50) {
    errors.push('Package name must be 50 characters or less')
  }

  // Validate duration
  if (!packageData.duration || packageData.duration < 15) {
    errors.push('Package duration must be at least 15 minutes')
  } else if (packageData.duration > 1440) {
    errors.push('Package duration cannot exceed 24 hours (1440 minutes)')
  }

  // Validate price
  if (!packageData.price || packageData.price < 1000) {
    errors.push('Package price must be at least Rp 1,000')
  } else if (packageData.price > 10000000) {
    errors.push('Package price cannot exceed Rp 10,000,000')
  }

  // Validate description length
  if (packageData.description && packageData.description.length > 200) {
    errors.push('Package description must be 200 characters or less')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Calculate package savings compared to hourly rate
 */
export function calculatePackageSavings(packageRate: PackageRate, hourlyRate: number): {
  hourlyEquivalent: number
  savings: number
  savingsPercent: number
} {
  const hours = packageRate.duration / 60
  const hourlyEquivalent = Math.ceil(hours * hourlyRate)
  const savings = Math.max(0, hourlyEquivalent - packageRate.price)
  const savingsPercent = hourlyEquivalent > 0 ? Math.round((savings / hourlyEquivalent) * 100) : 0

  return {
    hourlyEquivalent,
    savings,
    savingsPercent
  }
}

/**
 * Format package duration for display
 */
export function formatPackageDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${durationMinutes} minutes`
  }
  
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  
  if (minutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }
  
  return `${hours}h ${minutes}m`
}

/**
 * Generate suggested package ID from name
 */
export function generatePackageId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 20) // Limit length
}

// ============================================
// PACKAGE UTILITIES - FULLY FLEXIBLE SYSTEM
// ============================================

/**
 * Check if package rates array is valid (MOVED TO session-utils)
 */
export function validatePackageRatesArray(packageRates: unknown): packageRates is PackageRate[] {
  if (!Array.isArray(packageRates)) return false
  
  return packageRates.every(pkg => 
    typeof pkg === 'object' &&
    pkg !== null &&
    typeof pkg.id === 'string' &&
    typeof pkg.name === 'string' &&
    typeof pkg.duration === 'number' &&
    typeof pkg.price === 'number' &&
    typeof pkg.isActive === 'boolean' &&
    typeof pkg.displayOrder === 'number'
  )
}

/**
 * Convert PackageRate[] to JSON-safe format for Prisma
 */
export function packageRatesToJson(packageRates: PackageRate[]): Record<string, unknown>[] {
  return packageRates.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    duration: pkg.duration,
    price: pkg.price,
    description: pkg.description || null,
    isActive: pkg.isActive,
    displayOrder: pkg.displayOrder,
    createdAt: pkg.createdAt || new Date().toISOString(),
    updatedAt: pkg.updatedAt || new Date().toISOString()
  }))
}

/**
 * Convert JSON data from Prisma to PackageRate[]
 */
export function jsonToPackageRates(jsonData: unknown): PackageRate[] {
  if (!validatePackageRatesArray(jsonData)) {
    return []
  }
  return jsonData as PackageRate[]
}

// ============================================
// CURRENCY UTILITIES
// ============================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format currency without symbol
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount)
}

