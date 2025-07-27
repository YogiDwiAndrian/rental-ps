// src/lib/user-preference.ts
import { z } from 'zod'

// ============================================
// TYPE DEFINITIONS
// ============================================

// Base types from Prisma schema
export type ThemeType = 'light' | 'dark' | 'auto'
export type LanguageType = 'id' | 'en'
export type DashboardType = 'overview' | 'units' | 'reports'

// Location reference type
export interface LocationReference {
  id: string
  name: string
  code: string
  isActive?: boolean
}

// User preference type (matches database schema)
export interface UserPreference {
  id: string
  userId: string
  preferredLocationId: string | null
  preferredLocation?: LocationReference | null
  theme: ThemeType
  language: LanguageType
  timezone: string
  notifications: boolean
  defaultDashboard: DashboardType
  settings: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// API request/response types
export interface SavePreferenceRequest {
  preferredLocationId: string
  rememberChoice: boolean
  theme?: ThemeType
  language?: LanguageType
  notifications?: boolean
  defaultDashboard?: DashboardType
}

export interface SavePreferenceResponse {
  success: boolean
  message: string
  data: {
    id: string
    preferredLocation: LocationReference
    rememberChoice: boolean
    theme: ThemeType
    updatedAt: Date
  }
}

export interface GetPreferenceResponse {
  success: boolean
  data: UserPreference | null
  message?: string
}

// Error types
export class PreferenceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'PreferenceError'
  }
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const savePreferenceSchema = z.object({
  preferredLocationId: z.string().min(1, 'Location ID is required'),
  rememberChoice: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.enum(['id', 'en']).optional(),
  notifications: z.boolean().optional(),
  defaultDashboard: z.enum(['overview', 'units', 'reports']).optional()
})

// ============================================
// CLIENT-SIDE UTILITIES
// ============================================

/**
 * Save user preference to database
 */
export async function saveUserPreference(
  data: SavePreferenceRequest
): Promise<SavePreferenceResponse> {
  try {
    // Validate input
    const validatedData = savePreferenceSchema.parse(data)
    
    const response = await fetch('/api/user/preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedData),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new PreferenceError(
        result.message || 'Failed to save preference',
        result.error || 'SAVE_FAILED',
        response.status
      )
    }
    
    // Save to localStorage as backup
    savePreferenceToCache(result.data)
    
    return result
    
  } catch (error) {
    if (error instanceof PreferenceError) {
      throw error
    }
    
    if (error instanceof z.ZodError) {
      throw new PreferenceError(
        'Invalid preference data',
        'VALIDATION_ERROR',
        400
      )
    }
    
    throw new PreferenceError(
      'Network error while saving preference',
      'NETWORK_ERROR',
      500
    )
  }
}

/**
 * Get user preference from database
 */
export async function getUserPreference(): Promise<GetPreferenceResponse> {
  try {
    const response = await fetch('/api/user/preference', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new PreferenceError(
        result.message || 'Failed to fetch preference',
        result.error || 'FETCH_FAILED',
        response.status
      )
    }
    
    // Update cache with fresh data
    if (result.data) {
      savePreferenceToCache(result.data)
    }
    
    return result
    
  } catch (error) {
    if (error instanceof PreferenceError) {
      throw error
    }
    
    throw new PreferenceError(
      'Network error while fetching preference',
      'NETWORK_ERROR',
      500
    )
  }
}

// ============================================
// CACHE MANAGEMENT (localStorage backup)
// ============================================

const CACHE_KEYS = {
  USER_PREFERENCE: 'rentalps_user_preference',
  CACHE_TIMESTAMP: 'rentalps_preference_timestamp',
} as const

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

/**
 * Check if we're in browser environment
 */
const isBrowser = typeof window !== 'undefined'

/**
 * Save preference to localStorage cache
 */
export function savePreferenceToCache(preference: Partial<UserPreference>): void {
  if (!isBrowser) return
  
  try {
    const cacheData = {
      preference,
      timestamp: Date.now()
    }
    
    localStorage.setItem(CACHE_KEYS.USER_PREFERENCE, JSON.stringify(cacheData))
    localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString())
    
    console.log('💾 Preference cached successfully')
    
  } catch (error) {
    console.warn('Failed to cache preference:', error)
  }
}

/**
 * Get preference from localStorage cache
 */
export function getPreferenceFromCache(): UserPreference | null {
  if (!isBrowser) return null
  
  try {
    const cached = localStorage.getItem(CACHE_KEYS.USER_PREFERENCE)
    const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP)
    
    if (!cached || !timestamp) return null
    
    const cacheAge = Date.now() - parseInt(timestamp)
    
    // Check if cache is expired
    if (cacheAge > CACHE_DURATION) {
      clearPreferenceCache()
      return null
    }
    
    const cacheData = JSON.parse(cached)
    return cacheData.preference
    
  } catch (error) {
    console.warn('Failed to read preference cache:', error)
    clearPreferenceCache()
    return null
  }
}

/**
 * Clear preference cache
 */
export function clearPreferenceCache(): void {
  if (!isBrowser) return
  
  try {
    localStorage.removeItem(CACHE_KEYS.USER_PREFERENCE)
    localStorage.removeItem(CACHE_KEYS.CACHE_TIMESTAMP)
    console.log('🗑️ Preference cache cleared')
  } catch (error) {
    console.warn('Failed to clear preference cache:', error)
  }
}

/**
 * Check if cache is valid
 */
export function isCacheValid(): boolean {
  if (!isBrowser) return false
  
  const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP)
  if (!timestamp) return false
  
  const cacheAge = Date.now() - parseInt(timestamp)
  return cacheAge <= CACHE_DURATION
}

// ============================================
// PREFERENCE HELPERS
// ============================================

/**
 * Get default preference values
 */
export function getDefaultPreference(): Partial<UserPreference> {
  return {
    theme: 'light',
    language: 'id',
    timezone: 'Asia/Jakarta',
    notifications: true,
    defaultDashboard: 'overview',
    settings: {
      rememberChoice: false,
      autoRedirect: false,
      source: 'default'
    }
  }
}

/**
 * Merge preferences with defaults
 */
export function mergeWithDefaults(
  preference: Partial<UserPreference>
): UserPreference {
  const defaults = getDefaultPreference()
  
  return {
    id: preference.id || '',
    userId: preference.userId || '',
    preferredLocationId: preference.preferredLocationId || null,
    preferredLocation: preference.preferredLocation || null,
    theme: preference.theme || defaults.theme!,
    language: preference.language || defaults.language!,
    timezone: preference.timezone || defaults.timezone!,
    notifications: preference.notifications ?? defaults.notifications!,
    defaultDashboard: preference.defaultDashboard || defaults.defaultDashboard!,
    settings: {
      ...defaults.settings,
      ...preference.settings
    },
    createdAt: preference.createdAt || new Date(),
    updatedAt: preference.updatedAt || new Date()
  }
}

/**
 * Check if user should be auto-redirected to preferred location
 */
export function shouldAutoRedirect(
  preference: UserPreference | null,
  userLocations: LocationReference[]
): { shouldRedirect: boolean; locationId?: string; reason?: string } {
  if (!preference || !preference.preferredLocationId) {
    return { shouldRedirect: false, reason: 'No preference found' }
  }
  
  const rememberChoice = preference.settings?.rememberChoice as boolean
  if (!rememberChoice) {
    return { shouldRedirect: false, reason: 'Remember choice disabled' }
  }
  
  // Check if preferred location is still available to user
  const hasAccess = userLocations.some(
    loc => loc.id === preference.preferredLocationId && loc.isActive !== false
  )
  
  if (!hasAccess) {
    return { shouldRedirect: false, reason: 'Lost access to preferred location' }
  }
  
  return { 
    shouldRedirect: true, 
    locationId: preference.preferredLocationId,
    reason: 'Valid preference found'
  }
}

/**
 * Format preference for display
 */
export function formatPreferenceDisplay(preference: UserPreference): {
  preferredLocationDisplay: string
  themeDisplay: string
  languageDisplay: string
  lastUpdated: string
} {
  return {
    preferredLocationDisplay: preference.preferredLocation 
      ? `${preference.preferredLocation.name} (${preference.preferredLocation.code})`
      : 'No preference set',
    themeDisplay: preference.theme.charAt(0).toUpperCase() + preference.theme.slice(1),
    languageDisplay: preference.language === 'id' ? 'Indonesian' : 'English',
    lastUpdated: new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(preference.updatedAt))
  }
}

// ============================================
// DEBUG UTILITIES
// ============================================

/**
 * Debug preference state (development only)
 */
export function debugPreference(): void {
  if (process.env.NODE_ENV !== 'development') return
  
  console.group('🔍 User Preference Debug')
  
  const cached = getPreferenceFromCache()
  const cacheValid = isCacheValid()
  
  console.log('Cache Valid:', cacheValid)
  console.log('Cached Preference:', cached)
  console.log('Cache Keys:', Object.values(CACHE_KEYS))
  
  if (isBrowser) {
    console.log('LocalStorage Usage:', {
      used: JSON.stringify(localStorage).length,
      preferenceSize: localStorage.getItem(CACHE_KEYS.USER_PREFERENCE)?.length || 0
    })
  }
  
  console.groupEnd()
}