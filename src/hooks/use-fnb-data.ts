// src/hooks/use-fnb-data.ts
'use client'

import { useState, useCallback } from 'react'
import { usePolling } from './use-polling'

export interface FnbItem {
  id: string
  name: string
  description: string | null
  price: number
  stockQuantity: number
  isAvailable: boolean
  unitType: string
  locationName: string
}

export interface CategoryGroup {
  categoryName: string
  items: FnbItem[]
  locationName: string
}

export interface LowStockItem {
  id: string
  name: string
  stockQuantity: number
  minStockAlert: number
  locationName: string
}

interface UseFnbDataOptions {
  subdomain: string
  initialData: CategoryGroup[]
  pollingInterval?: number
  enabled?: boolean
  showLowStockAlerts?: boolean
}

export function useFnbData({
  subdomain,
  initialData,
  pollingInterval = 300000, // 5 minutes
  enabled = true,
  showLowStockAlerts = false
}: UseFnbDataOptions) {
  const [categories, setCategories] = useState<CategoryGroup[]>(initialData)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  // Fetch F&B data
  const fetchFnbData = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/${subdomain}/fnb`, {
        cache: 'no-cache'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data.categories)
        setLowStockItems(data.data.lowStockItems || [])
        setError(null)
        setIsOnline(true)
      } else {
        throw new Error(data.error || 'Failed to fetch F&B data')
      }
    } catch (err) {
      console.error('Error fetching F&B data:', err)
      setError(err instanceof Error ? err.message : 'Network error')
      setIsOnline(false)
    }
  }, [subdomain])

  // Setup polling
  const { isPolling, lastUpdated, refresh } = usePolling(fetchFnbData, {
    interval: pollingInterval,
    enabled,
    immediate: false
  })

  // Computed values for easy consumption
  const allItems = categories.flatMap(category => category.items)
  
  const stats = {
    available: allItems.filter(item => item.isAvailable).length,
    outOfStock: allItems.filter(item => !item.isAvailable).length,
    categories: categories.length,
    lowStock: lowStockItems.length,
    total: allItems.length
  }

  const groupedItems = {
    available: allItems.filter(item => item.isAvailable),
    outOfStock: allItems.filter(item => !item.isAvailable),
    lowStock: lowStockItems
  }

  // Category utilities
  const getCategoryStats = (categoryName: string) => {
    const category = categories.find(c => c.categoryName === categoryName)
    if (!category) return { available: 0, total: 0 }
    
    return {
      available: category.items.filter(item => item.isAvailable).length,
      total: category.items.length
    }
  }

  const getItemsByCategory = (categoryName: string) => {
    const category = categories.find(c => c.categoryName === categoryName)
    return category?.items || []
  }

  // Search functionality
  const searchItems = (query: string) => {
    if (!query.trim()) return allItems
    
    const searchTerm = query.toLowerCase()
    return allItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm) ||
      (item.description && item.description.toLowerCase().includes(searchTerm))
    )
  }

  // Filter utilities
  const filterByAvailability = (availableOnly: boolean = true) => {
    return availableOnly ? groupedItems.available : allItems
  }

  const filterByPrice = (maxPrice?: number, minPrice?: number) => {
    return allItems.filter(item => {
      if (maxPrice && item.price > maxPrice) return false
      if (minPrice && item.price < minPrice) return false
      return true
    })
  }

  return {
    // Data
    categories,
    allItems,
    lowStockItems,
    stats,
    groupedItems,
    
    // Status
    isPolling,
    isOnline,
    error,
    lastUpdated,
    showLowStockAlerts,
    
    // Actions
    refresh,
    
    // Utilities
    getCategoryStats,
    getItemsByCategory,
    searchItems,
    filterByAvailability,
    filterByPrice
  }
}