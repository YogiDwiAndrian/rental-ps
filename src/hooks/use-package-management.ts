// src/hooks/use-package-management.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { 
  PackageRate, 
  CreatePackageRequest, 
  UpdatePackageRequest, 
  PackageManagementResponse 
} from '@/types/package'
import { formatCurrency } from '@/lib/session-utils'

interface UsePackageManagementReturn {
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

export function usePackageManagement(): UsePackageManagementReturn {
  const { data: session } = useSession()
  const [packages, setPackages] = useState<PackageRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // API FUNCTIONS
  // ============================================

  const fetchPackages = useCallback(async (unitId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/units/${unitId}/packages`)
      const result: PackageManagementResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch packages')
      }

      if (result.success && result.data) {
        setPackages(result.data.packages)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching packages:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const createPackage = useCallback(async (
    unitId: string, 
    packageData: CreatePackageRequest
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/units/${unitId}/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(packageData)
      })

      const result: PackageManagementResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create package')
      }

      if (result.success && result.data) {
        toast.success(`Package "${packageData.name}" created successfully`)
        
        // Add new package to state
        const newPackage = result.data.packages[0] // API returns the created package
        if (newPackage) {
          setPackages(prev => [...prev, newPackage].sort((a, b) => a.displayOrder - b.displayOrder))
        }
        
        return true
      }

      return false
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`Failed to create package: ${errorMessage}`)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePackage = useCallback(async (
    unitId: string, 
    packageData: UpdatePackageRequest
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/units/${unitId}/packages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(packageData)
      })

      const result: PackageManagementResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update package')
      }

      if (result.success) {
        toast.success('Package updated successfully')
        
        // Update package in state
        setPackages(prev => 
          prev.map(pkg => 
            pkg.id === packageData.id 
              ? { ...pkg, ...packageData, updatedAt: new Date().toISOString() }
              : pkg
          ).sort((a, b) => a.displayOrder - b.displayOrder)
        )
        
        return true
      }

      return false
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`Failed to update package: ${errorMessage}`)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const deletePackage = useCallback(async (
    unitId: string, 
    packageId: string
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/units/${unitId}/packages?packageId=${packageId}`, {
        method: 'DELETE'
      })

      const result: PackageManagementResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete package')
      }

      if (result.success) {
        toast.success('Package deleted successfully')
        
        // Remove package from state
        setPackages(prev => prev.filter(pkg => pkg.id !== packageId))
        
        return true
      }

      return false
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`Failed to delete package: ${errorMessage}`)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const reorderPackages = useCallback(async (
    unitId: string, 
    reorderedPackages: PackageRate[]
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      // Update display order for each package
      const updates = reorderedPackages.map((pkg, index) => 
        updatePackage(unitId, { id: pkg.id, displayOrder: index })
      )

      const results = await Promise.all(updates)
      const allSuccessful = results.every(result => result)

      if (allSuccessful) {
        toast.success('Package order updated successfully')
        setPackages(reorderedPackages)
        return true
      }

      return false
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`Failed to reorder packages: ${errorMessage}`)
      return false
    } finally {
      setLoading(false)
    }
  }, [updatePackage])

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const validatePackageData = useCallback((packageData: Partial<CreatePackageRequest>): { isValid: boolean; errors: string[] } => {
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
      errors.push('Package duration cannot exceed 24 hours')
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
  }, [])

  const formatPackageDuration = useCallback((minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (remainingMinutes === 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`
    }
    
    return `${hours}h ${remainingMinutes}m`
  }, [])

  return {
    // State
    packages,
    loading,
    error,
    
    // Actions
    fetchPackages,
    createPackage,
    updatePackage,
    deletePackage,
    reorderPackages,
    
    // Utils
    validatePackageData,
    formatPackageDuration
  }
}

// ============================================
// HELPER HOOK FOR PACKAGE CALCULATIONS
// ============================================

export function usePackageCalculations(hourlyRate: number) {
  const calculateSavings = useCallback((packageRate: PackageRate) => {
    const hours = packageRate.duration / 60
    const hourlyEquivalent = Math.ceil(hours * hourlyRate)
    const savings = Math.max(0, hourlyEquivalent - packageRate.price)
    const savingsPercent = hourlyEquivalent > 0 ? Math.round((savings / hourlyEquivalent) * 100) : 0

    return {
      hourlyEquivalent,
      savings,
      savingsPercent,
      isGoodDeal: savingsPercent > 0
    }
  }, [hourlyRate])

  const formatDealInfo = useCallback((packageRate: PackageRate) => {
    const calculations = calculateSavings(packageRate)
    
    if (calculations.isGoodDeal) {
      return {
        message: `Save ${formatCurrency(calculations.savings)} (${calculations.savingsPercent}%)`,
        type: 'savings' as const,
        color: 'green'
      }
    } else {
      return {
        message: `${formatCurrency(packageRate.price)} for ${Math.floor(packageRate.duration / 60)}h ${packageRate.duration % 60}m`,
        type: 'normal' as const,
        color: 'blue'
      }
    }
  }, [calculateSavings])

  return {
    calculateSavings,
    formatDealInfo
  }
}