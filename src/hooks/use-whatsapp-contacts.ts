// src/hooks/use-whatsapp-contacts.ts
'use client'

import { useState, useCallback } from 'react'
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

export function useWhatsAppContacts(subdomain: string) {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/public/${subdomain}/contacts`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data: ApiContactsResponse = await response.json()
      
      if (data.success && data.data && data.data.contacts) {
        setContacts(data.data.contacts)
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
  }, [subdomain])

  // Poll every 5 minutes (contacts don't change frequently)
  const { lastUpdated, refresh } = usePolling(fetchContacts, { interval: 300000 })

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