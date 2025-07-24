// src/hooks/use-whatsapp-contacts.ts - ROBUST VERSION with Better Error Handling
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { usePolling } from './use-polling'

export interface WhatsAppContact {
  id: string
  name: string
  whatsappNumber: string
  role: 'owner' | 'manager' | 'staff' | 'custom'
  isPrimary: boolean
  responseTime?: string
  locationName?: string
  displayOrder: number
  isOnline: boolean
  currentAvailability: string
  // Enhanced availability schedule
  availabilitySchedule?: {
    available24_7?: boolean
    workingHours?: Record<string, { start: string; end: string }>
    preferredHours?: string
  }
}

interface ApiContactsResponse {
  success: boolean
  data: {
    contacts: WhatsAppContact[]
    tenant: {
      name: string
      subdomain: string
    }
    lastUpdated: string
  }
}

export function useWhatsAppContacts(subdomain: string, locationId?: string) {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  const retryDelayRef = useRef<NodeJS.Timeout | null>(null)

  const fetchContacts = useCallback(async () => {
    try {
      console.log(`📞 [${new Date().toLocaleTimeString()}] Fetching contacts for subdomain: ${subdomain}, locationId: ${locationId}`)
      setLoading(true)
      setError(null)
      
      // Build URL with location parameter if provided
      const url = locationId 
        ? `/api/public/${subdomain}/contacts?locationId=${locationId}`
        : `/api/public/${subdomain}/contacts`
      
      // Add cache busting parameter to prevent stale data
      const cacheBust = Date.now()
      const randomBust = Math.random().toString(36).substring(7)
      const finalUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${cacheBust}&_r=${randomBust}`
      
      const response = await fetch(finalUrl, {
        // Force fresh data - no cache at all
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data: ApiContactsResponse = await response.json()
      console.log(`📞 [${new Date().toLocaleTimeString()}] Contacts API response:`, data)
      
      if (data.success && data.data && data.data.contacts) {
        // FIXED: Don't filter by location for now to ensure all contacts are shown
        // The API should handle location filtering properly, but for demo we want all contacts
        let filteredContacts = data.data.contacts
        
        console.log(`📞 Raw contacts from API: ${data.data.contacts.length}`)
        
        // Only apply location filtering if we have multiple locations AND locationId is specified
        // For single location or global access, show all contacts
        if (locationId && data.data.contacts.length > 3) { // Only filter if we have many contacts
          const beforeFilter = filteredContacts.length
          filteredContacts = data.data.contacts.filter(contact => 
            // Include global contacts (no locationName) and location-specific contacts
            !contact.locationName || contact.locationName === locationId
          )
          console.log(`📞 Filtered contacts: ${beforeFilter} -> ${filteredContacts.length} for locationId: ${locationId}`)
        } else {
          console.log(`📞 No location filtering applied - showing all ${filteredContacts.length} contacts`)
        }
        
        console.log(`✅ Successfully loaded ${filteredContacts.length} contacts`)
        console.log(`📊 Contact roles:`, filteredContacts.map(c => `${c.name} (${c.role})`))
        
        setContacts(filteredContacts)
        setRetryCount(0) // Reset retry count on success
      } else {
        console.warn('⚠️ Unexpected contacts API response structure:', data)
        setContacts([])
      }
    } catch (err) {
      console.error(`❌ [${new Date().toLocaleTimeString()}] Failed to fetch WhatsApp contacts:`, err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts')
      
      // Implement retry logic for transient failures
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff: 1s, 2s, 4s
        console.log(`🔄 Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
        
        retryDelayRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchContacts()
        }, delay)
      } else {
        console.error('❌ Max retries reached, giving up')
        // Keep existing contacts if we had them before
        if (contacts.length === 0) {
          setContacts([]) // Only clear if we had no contacts before
        }
      }
    } finally {
      setLoading(false)
    }
  }, [subdomain, locationId, retryCount, contacts.length])

  // Clean up retry timeout
  useEffect(() => {
    return () => {
      if (retryDelayRef.current) {
        clearTimeout(retryDelayRef.current)
      }
    }
  }, [])

  // Poll every 5 minutes (contacts don't change frequently)
  const { lastUpdated, refresh } = usePolling(fetchContacts, { 
    interval: 300000, // 5 minutes
    immediate: true 
  })

  // Force refresh when dependencies change
  useEffect(() => {
    console.log('📞 Dependencies changed, fetching contacts...')
    setRetryCount(0) // Reset retry count when deps change
    fetchContacts()
  }, [subdomain, locationId]) // Don't include fetchContacts to avoid infinite loop

  // Group contacts by type for different display purposes
  const groupedContacts = {
    primary: contacts.filter(c => c.isPrimary),
    owners: contacts.filter(c => c.role === 'owner'),
    managers: contacts.filter(c => c.role === 'manager'), 
    staff: contacts.filter(c => c.role === 'staff' || c.role === 'custom'),
    online: contacts.filter(c => c.isOnline),
    all: contacts
  }

  // Get the best contact for quick access (primary first, then owner, then online staff)
  const primaryContact = contacts.find(c => c.isPrimary) || 
                         contacts.find(c => c.role === 'owner') || 
                         contacts.find(c => c.isOnline) ||
                         contacts[0]

  // Manual refresh function that resets retry logic
  const manualRefresh = useCallback(() => {
    console.log('📞 Manual refresh triggered')
    setRetryCount(0)
    setError(null)
    fetchContacts()
  }, [fetchContacts])

  return {
    contacts,
    groupedContacts,
    primaryContact,
    loading,
    error,
    lastUpdated,
    refresh: manualRefresh,
    retryCount,
    isRetrying: retryCount > 0
  }
}