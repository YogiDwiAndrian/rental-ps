// src/lib/session-storage.ts - Location Preference Storage
'use client'

interface LocationPreference {
  locationId: string
  locationName: string
  locationCode: string
  lastAccessed: string
  accessCount: number
}

interface UserPreferences {
  userId: string
  tenantId: string
  lastSelectedLocation?: LocationPreference
  locationHistory: LocationPreference[]
  rememberLocation: boolean
}

const STORAGE_KEYS = {
  USER_PREFERENCES: 'rentalps_user_preferences',
  LOCATION_HISTORY: 'rentalps_location_history',
} as const

// Helper function to check if we're in browser environment
const isBrowser = typeof window !== 'undefined'

// Get user preferences from localStorage
export function getUserPreferences(userId: string, tenantId: string): UserPreferences | null {
  if (!isBrowser) return null
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES)
    if (!stored) return null
    
    const preferences: UserPreferences = JSON.parse(stored)
    
    // Validate that preferences belong to current user/tenant
    if (preferences.userId === userId && preferences.tenantId === tenantId) {
      return preferences
    }
    
    return null
  } catch (error) {
    console.warn('Failed to get user preferences:', error)
    return null
  }
}

// Save user preferences to localStorage
export function saveUserPreferences(preferences: UserPreferences): void {
  if (!isBrowser) return
  
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences))
    console.log('✅ User preferences saved:', preferences.userId)
  } catch (error) {
    console.warn('Failed to save user preferences:', error)
  }
}

// Get last selected location for auto-redirect
export function getLastSelectedLocation(
  userId: string, 
  tenantId: string, 
  userLocations: { id: string; name: string; code: string }[]
): LocationPreference | null {
  const preferences = getUserPreferences(userId, tenantId)
  
  if (!preferences || !preferences.rememberLocation || !preferences.lastSelectedLocation) {
    return null
  }
  
  // Verify that the last selected location is still valid for this user
  const isLocationValid = userLocations.some(
    loc => loc.id === preferences.lastSelectedLocation!.locationId
  )
  
  if (!isLocationValid) {
    console.log('🚫 Last selected location no longer valid, clearing preference')
    clearLocationPreference(userId, tenantId)
    return null
  }
  
  return preferences.lastSelectedLocation
}

// Save selected location preference
export function saveLocationPreference(
  userId: string,
  tenantId: string,
  location: { id: string; name: string; code: string },
  rememberChoice: boolean = true
): void {
  if (!isBrowser) return
  
  const now = new Date().toISOString()
  const locationPref: LocationPreference = {
    locationId: location.id,
    locationName: location.name,
    locationCode: location.code,
    lastAccessed: now,
    accessCount: 1
  }
  
  // Get existing preferences or create new ones
  const preferences = getUserPreferences(userId, tenantId) || {
    userId,
    tenantId,
    locationHistory: [],
    rememberLocation: rememberChoice
  }
  
  // Update last selected location
  preferences.lastSelectedLocation = locationPref
  preferences.rememberLocation = rememberChoice
  
  // Update location history
  const existingIndex = preferences.locationHistory.findIndex(
    loc => loc.locationId === location.id
  )
  
  if (existingIndex >= 0) {
    // Update existing entry
    preferences.locationHistory[existingIndex] = {
      ...preferences.locationHistory[existingIndex],
      lastAccessed: now,
      accessCount: preferences.locationHistory[existingIndex].accessCount + 1
    }
  } else {
    // Add new entry
    preferences.locationHistory.push(locationPref)
  }
  
  // Keep only last 10 locations in history
  preferences.locationHistory = preferences.locationHistory
    .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
    .slice(0, 10)
  
  saveUserPreferences(preferences)
  
  console.log('📍 Location preference saved:', {
    userId,
    locationId: location.id,
    locationName: location.name,
    rememberChoice
  })
}

// Clear location preference (when user explicitly chooses not to remember)
export function clearLocationPreference(userId: string, tenantId: string): void {
  if (!isBrowser) return
  
  const preferences = getUserPreferences(userId, tenantId)
  if (!preferences) return
  
  preferences.lastSelectedLocation = undefined
  preferences.rememberLocation = false
  
  saveUserPreferences(preferences)
  console.log('🗑️ Location preference cleared for user:', userId)
}

// Get location access history for sorting (most frequently used first)
export function getLocationHistory(
  userId: string, 
  tenantId: string
): LocationPreference[] {
  const preferences = getUserPreferences(userId, tenantId)
  
  if (!preferences) return []
  
  // Sort by access count (descending) and then by last accessed
  return preferences.locationHistory.sort((a, b) => {
    if (b.accessCount !== a.accessCount) {
      return b.accessCount - a.accessCount
    }
    return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
  })
}

// Check if user wants to remember location choice
export function shouldRememberLocation(userId: string, tenantId: string): boolean {
  const preferences = getUserPreferences(userId, tenantId)
  return preferences?.rememberLocation ?? false
}

// Set remember location preference
export function setRememberLocationPreference(
  userId: string, 
  tenantId: string, 
  remember: boolean
): void {
  if (!isBrowser) return
  
  const preferences = getUserPreferences(userId, tenantId) || {
    userId,
    tenantId,
    locationHistory: [],
    rememberLocation: remember
  }
  
  preferences.rememberLocation = remember
  
  // If user chooses not to remember, clear last selected location
  if (!remember) {
    preferences.lastSelectedLocation = undefined
  }
  
  saveUserPreferences(preferences)
  console.log('💾 Remember location preference updated:', remember)
}

// Clean up old preferences (call this on app startup)
export function cleanupOldPreferences(): void {
  if (!isBrowser) return
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES)
    if (!stored) return
    
    const preferences: UserPreferences = JSON.parse(stored)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // Clean up location history older than 30 days
    preferences.locationHistory = preferences.locationHistory.filter(
      loc => new Date(loc.lastAccessed) > thirtyDaysAgo
    )
    
    saveUserPreferences(preferences)
    console.log('🧹 Old location preferences cleaned up')
  } catch (error) {
    console.warn('Failed to cleanup old preferences:', error)
  }
}

// Export utility for debugging (development only)
export function debugPreferences(userId?: string): void {
  if (!isBrowser || process.env.NODE_ENV === 'production') return
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES)
    if (!stored) {
      console.log('🐛 No preferences stored')
      return
    }
    
    const preferences: UserPreferences = JSON.parse(stored)
    console.log('🐛 Current preferences:', preferences)
    
    if (userId && preferences.userId !== userId) {
      console.log('🐛 Preferences belong to different user')
    }
  } catch (error) {
    console.error('🐛 Failed to debug preferences:', error)
  }
}