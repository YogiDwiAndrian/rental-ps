// src/hooks/use-whatsapp-contacts.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
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

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build URL with location parameter if provided
      const url = locationId 
        ? `/api/public/${subdomain}/contacts?locationId=${locationId}`
        : `/api/public/${subdomain}/contacts`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data: ApiContactsResponse = await response.json()
      
      if (data.success && data.data && data.data.contacts) {
        // Filter contacts by location if specified
        let filteredContacts = data.data.contacts
        
        if (locationId) {
          filteredContacts = data.data.contacts.filter(contact => 
            // Include global contacts (no locationName) and location-specific contacts
            !contact.locationName || contact.locationName === locationId
          )
        }
        
        setContacts(filteredContacts)
      } else {
        setContacts([])
        console.warn('Unexpected contacts API response structure:', data)
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp contacts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts')
      
      // Fallback: create basic contacts from location data if available
      // This will be handled by the component using this hook
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [subdomain, locationId])

  // Poll every 5 minutes (contacts don't change frequently) - FIXED: Add locationId dependencies
  const { lastUpdated, refresh } = usePolling(fetchContacts, { 
    interval: 300000,
    immediate: true 
  })

  // Force refresh when locationId changes
  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // Group contacts by type for different display purposes
  const groupedContacts = {
    primary: contacts.filter(c => c.isPrimary),
    owners: contacts.filter(c => c.role === 'owner'),
    staff: contacts.filter(c => c.role === 'staff' || c.role === 'manager'),
    online: contacts.filter(c => c.isOnline),
    all: contacts
  }

  // Get the best contact for quick access (primary first, then owner, then online staff)
  const primaryContact = contacts.find(c => c.isPrimary) || 
                         contacts.find(c => c.role === 'owner') || 
                         contacts.find(c => c.isOnline) ||
                         contacts[0]

  return {
    contacts,
    groupedContacts,
    primaryContact,
    loading,
    error,
    lastUpdated,
    refresh
  }
}