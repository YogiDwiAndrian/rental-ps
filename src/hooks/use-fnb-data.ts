'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePolling } from './use-polling'

// API Response Types
interface ApiItem {
  id: string
  name: string
  description?: string
  price: number
  stockQuantity: number
  unitType: string
  isAvailable: boolean
  locationName?: string
}

interface ApiCategory {
  categoryName: string
  items: ApiItem[]
  locationName?: string
}

interface ApiFnbResponse {
  success: boolean
  data: {
    categories: ApiCategory[]
    lowStockItems: ApiItem[]
    lastUpdated: string
    tenant: {
      name: string
      subdomain: string
    }
  }
}

export interface FnbItem {
  id: string
  name: string
  description?: string
  price: number
  stockQuantity: number
  unitType: string
  categoryName?: string
  customerDisplayName?: string
  customerDescription?: string
  isAvailable: boolean
  locationName?: string
}

export interface FnbCategory {
  name: string
  items: FnbItem[]
  availableCount: number
  totalCount: number
}

export function useFnbData(subdomain: string, locationId?: string) {
  const [items, setItems] = useState<FnbItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFnbItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build URL with location parameter if provided
      const url = locationId 
        ? `/api/public/${subdomain}/fnb?locationId=${locationId}`
        : `/api/public/${subdomain}/fnb`
      
      // Add timestamp to prevent caching issues when categories change
      const timestamp = Date.now()
      const finalUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`
      
      const response = await fetch(finalUrl, {
        // Disable cache to ensure fresh data
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data: ApiFnbResponse = await response.json()
      
      // Handle the actual API response structure
      if (data.success && data.data && data.data.categories) {
        // Flatten categories into items array
        const allItems: FnbItem[] = []
        data.data.categories.forEach((category: ApiCategory) => {
          if (category.items && Array.isArray(category.items)) {
            category.items.forEach((item: ApiItem) => {
              allItems.push({
                ...item,
                categoryName: category.categoryName
              })
            })
          }
        })
        setItems(allItems)
      } else {
        setItems([])
        console.warn('Unexpected F&B API response structure:', data)
      }
    } catch (err) {
      console.error('Failed to fetch F&B items:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch F&B items')
    } finally {
      setLoading(false)
    }
  }, [subdomain, locationId])

  // Use existing polling hook with correct interface - FIXED: Add locationId dependencies
  const { lastUpdated, refresh } = usePolling(fetchFnbItems, { 
    interval: 300000,
    immediate: true 
  })

  // Force refresh when locationId changes
  useEffect(() => {
    fetchFnbItems()
  }, [fetchFnbItems])

  // Computed values for mobile stats
  const stats = {
    total: items.length,
    available: items.filter(item => item.isAvailable && item.stockQuantity > 0).length,
    outOfStock: items.filter(item => !item.isAvailable || item.stockQuantity === 0).length,
    lowStock: items.filter(item => item.isAvailable && item.stockQuantity > 0 && item.stockQuantity <= 5).length
  }

  // Group items by category for mobile display
  const categorizedItems = items.reduce<Record<string, FnbItem[]>>((acc, item) => {
    const category = item.categoryName || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {})

  // Convert to category objects with stats
  const categories: FnbCategory[] = Object.entries(categorizedItems).map(([name, categoryItems]) => ({
    name,
    items: categoryItems,
    availableCount: categoryItems.filter(item => item.isAvailable && item.stockQuantity > 0).length,
    totalCount: categoryItems.length
  }))

  return {
    items,
    loading,
    error,
    lastUpdated,
    refresh,
    stats,
    categories,
    categorizedItems
  }
}