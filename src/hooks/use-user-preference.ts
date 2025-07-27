// src/hooks/use-user-preference.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  UserPreference,
  SavePreferenceRequest,
  PreferenceError,
  getUserPreference,
  saveUserPreference,
  getPreferenceFromCache,
  savePreferenceToCache,
  clearPreferenceCache,
  shouldAutoRedirect,
  getDefaultPreference,
  mergeWithDefaults,
  type LocationReference
} from '@/lib/user-preference'

// Hook state type
interface UseUserPreferenceState {
  preference: UserPreference | null
  loading: boolean
  error: PreferenceError | null
  isFromCache: boolean
}

// Hook return type
interface UseUserPreferenceReturn extends UseUserPreferenceState {
  // Actions
  savePreference: (data: SavePreferenceRequest) => Promise<void>
  refreshPreference: () => Promise<void>
  clearCache: () => void
  
  // Utilities
  shouldAutoRedirectToLocation: (userLocations: LocationReference[]) => {
    shouldRedirect: boolean
    locationId?: string
    reason?: string
  }
  
  // Status checks
  hasPreference: boolean
  isStaff: boolean
  canSavePreference: boolean
}

/**
 * React hook for managing user preferences
 * 
 * Features:
 * - Automatic cache management
 * - Session-aware loading
 * - Optimistic updates
 * - Error handling
 * - Auto-redirect logic
 */
export function useUserPreference(): UseUserPreferenceReturn {
  const { data: session, status: sessionStatus } = useSession()
  
  const [state, setState] = useState<UseUserPreferenceState>({
    preference: null,
    loading: true,
    error: null,
    isFromCache: false
  })

  // Check if user is staff (only staff can save preferences)
  const isStaff = session?.user?.role === 'staff'
  const canSavePreference = isStaff && sessionStatus === 'authenticated'

  /**
   * Load preference from cache first, then from server
   */
  const loadPreference = useCallback(async (skipCache = false) => {
    if (sessionStatus !== 'authenticated' || !session?.user) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        preference: null,
        isFromCache: false 
      }))
      return
    }

    try {
      // Try cache first (unless explicitly skipped)
      if (!skipCache) {
        const cached = getPreferenceFromCache()
        if (cached) {
          setState(prev => ({ 
            ...prev, 
            preference: mergeWithDefaults(cached),
            loading: false,
            error: null,
            isFromCache: true
          }))
          
          // Continue loading from server in background
        }
      }

      // Load from server
      setState(prev => ({ ...prev, loading: true }))
      
      const response = await getUserPreference()
      
      if (response.data) {
        const mergedPreference = mergeWithDefaults(response.data)
        setState(prev => ({ 
          ...prev, 
          preference: mergedPreference,
          loading: false,
          error: null,
          isFromCache: false
        }))
      } else {
        // No preference found
        setState(prev => ({ 
          ...prev, 
          preference: null,
          loading: false,
          error: null,
          isFromCache: false
        }))
      }
      
    } catch (error) {
      console.error('❌ Failed to load user preference:', error)
      
      const preferenceError = error instanceof PreferenceError 
        ? error 
        : new PreferenceError('Failed to load preference', 'LOAD_ERROR')

      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: preferenceError,
        isFromCache: false
      }))
    }
  }, [session?.user, sessionStatus])

  /**
   * Save preference with optimistic updates
   */
  const savePreference = useCallback(async (data: SavePreferenceRequest) => {
    if (!canSavePreference) {
      throw new PreferenceError(
        'Cannot save preference: user is not authenticated staff member',
        'UNAUTHORIZED'
      )
    }

    try {
      // Optimistic update
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null 
      }))

      const response = await saveUserPreference(data)
      
      // Update state with server response
      const updatedPreference = mergeWithDefaults({
        ...state.preference,
        preferredLocationId: data.preferredLocationId,
        preferredLocation: response.data.preferredLocation,
        theme: data.theme || state.preference?.theme,
        language: data.language || state.preference?.language,
        notifications: data.notifications ?? state.preference?.notifications,
        defaultDashboard: data.defaultDashboard || state.preference?.defaultDashboard,
        settings: {
          ...state.preference?.settings,
          rememberChoice: data.rememberChoice,
          lastSaved: new Date().toISOString()
        },
        updatedAt: response.data.updatedAt
      })

      setState(prev => ({
        ...prev,
        preference: updatedPreference,
        loading: false,
        error: null,
        isFromCache: false
      }))

      console.log('✅ Preference saved successfully')

    } catch (error) {
      console.error('❌ Failed to save preference:', error)
      
      const preferenceError = error instanceof PreferenceError 
        ? error 
        : new PreferenceError('Failed to save preference', 'SAVE_ERROR')

      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: preferenceError 
      }))
      
      throw preferenceError
    }
  }, [canSavePreference, state.preference])

  /**
   * Refresh preference from server (skip cache)
   */
  const refreshPreference = useCallback(async () => {
    await loadPreference(true)
  }, [loadPreference])

  /**
   * Clear preference cache
   */
  const clearCache = useCallback(() => {
    clearPreferenceCache()
    setState(prev => ({ 
      ...prev, 
      isFromCache: false 
    }))
  }, [])

  /**
   * Check if user should auto-redirect to preferred location
   */
  const shouldAutoRedirectToLocation = useCallback((userLocations: LocationReference[]) => {
    return shouldAutoRedirect(state.preference, userLocations)
  }, [state.preference])

  // Load preference when session changes
  useEffect(() => {
    loadPreference()
  }, [loadPreference])

  // Debug in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && state.preference) {
      console.log('🎯 User Preference Hook State:', {
        hasPreference: !!state.preference,
        preferredLocationId: state.preference.preferredLocationId,
        isFromCache: state.isFromCache,
        loading: state.loading,
        error: state.error?.message
      })
    }
  }, [state])

  return {
    // State
    preference: state.preference,
    loading: state.loading,
    error: state.error,
    isFromCache: state.isFromCache,
    
    // Actions
    savePreference,
    refreshPreference,
    clearCache,
    
    // Utilities
    shouldAutoRedirectToLocation,
    
    // Status checks
    hasPreference: !!state.preference?.preferredLocationId,
    isStaff,
    canSavePreference
  }
}

// ============================================
// ADDITIONAL HOOKS FOR SPECIFIC USE CASES
// ============================================

/**
 * Hook for location auto-redirect logic
 * Used in dashboard pages to handle automatic redirection
 */
export function useLocationAutoRedirect(userLocations: LocationReference[]) {
  const { preference, loading, shouldAutoRedirectToLocation } = useUserPreference()
  
  const redirectInfo = shouldAutoRedirectToLocation(userLocations)
  
  return {
    shouldRedirect: !loading && redirectInfo.shouldRedirect,
    locationId: redirectInfo.locationId,
    reason: redirectInfo.reason,
    loading,
    preference
  }
}

/**
 * Hook for preference form management
 * Used in preference settings components
 */
export function usePreferenceForm(userLocations: LocationReference[]) {
  const { 
    preference, 
    loading, 
    error, 
    savePreference, 
    hasPreference 
  } = useUserPreference()
  
  const [formData, setFormData] = useState<SavePreferenceRequest>({
    preferredLocationId: '',
    rememberChoice: false,
    theme: 'light',
    language: 'id',
    notifications: true,
    defaultDashboard: 'overview'
  })
  
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<PreferenceError | null>(null)

  // Update form when preference loads
  useEffect(() => {
    if (preference) {
      setFormData({
        preferredLocationId: preference.preferredLocationId || '',
        rememberChoice: (preference.settings?.rememberChoice as boolean) || false,
        theme: preference.theme,
        language: preference.language,
        notifications: preference.notifications,
        defaultDashboard: preference.defaultDashboard
      })
    }
  }, [preference])

  const handleSave = async (data: Partial<SavePreferenceRequest>) => {
    setSaving(true)
    setSaveError(null)
    
    try {
      const saveData = { ...formData, ...data }
      await savePreference(saveData)
      setFormData(saveData)
    } catch (error) {
      setSaveError(error as PreferenceError)
    } finally {
      setSaving(false)
    }
  }

  return {
    formData,
    setFormData,
    handleSave,
    saving,
    saveError,
    loading,
    error,
    hasPreference,
    availableLocations: userLocations
  }
}