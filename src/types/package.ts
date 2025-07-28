// src/types/package.ts
export interface PackageRate {
  id: string
  name: string           // "Paket Hemat 3 Jam"
  duration: number       // Duration in minutes (180 = 3 hours)
  price: number         // Price in IDR (45000)
  description?: string  // Optional description
  isActive: boolean     // Can be disabled by owner
  displayOrder: number  // Order for UI display
  createdAt?: string    // When package was created
  updatedAt?: string    // When package was last updated
}

export interface CreatePackageRequest {
  name: string
  duration: number       // minutes
  price: number         // IDR
  description?: string
  isActive?: boolean
  displayOrder?: number
}

export interface UpdatePackageRequest {
  id: string
  name?: string
  duration?: number      // minutes
  price?: number        // IDR
  description?: string
  isActive?: boolean
  displayOrder?: number
}

export interface PackageValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Helper type for API responses
export interface PackageManagementResponse {
  success: boolean
  data?: {
    packages: PackageRate[]
    unitId?: string
    unitName?: string
  }
  error?: string
  details?: unknown
}

// For session creation
export interface PackageSelection {
  packageId: string
  packageName: string
  duration: number
  price: number
}

// Utility functions are now in session-utils.ts
// Re-export for convenience
export type { PackageRate as default }