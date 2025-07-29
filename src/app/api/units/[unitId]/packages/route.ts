// src/app/api/units/[unitId]/packages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { PackageRate, CreatePackageRequest, UpdatePackageRequest } from '@/types/package'
import { validatePackage, generatePackageId, jsonToPackageRates, packageRatesToJson } from '@/lib/session-utils'

// ============================================
// TYPES
// ============================================

interface RouteParams {
  unitId: string
}

interface PackagesResponse {
  success: boolean
  data?: {
    packages: PackageRate[]
    unitId: string
    unitName: string
  }
  error?: string
}

interface CreatePackageResponse {
  success: boolean
  data?: {
    package: PackageRate
    unitId: string
  }
  error?: string
  details?: string[]
}

interface UpdatePackageResponse {
  success: boolean
  data?: {
    package: PackageRate
    unitId: string
  }
  error?: string
  details?: string[]
}

interface DeletePackageResponse {
  success: boolean
  data?: {
    deletedPackageId: string
    unitId: string
  }
  error?: string
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required').max(50, 'Package name too long'),
  duration: z.number().int().min(15, 'Minimum duration is 15 minutes').max(1440, 'Maximum duration is 24 hours'),
  price: z.number().int().min(1000, 'Minimum price is Rp 1,000').max(10000000, 'Maximum price is Rp 10,000,000'),
  description: z.string().max(200, 'Description too long').optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).optional()
})

const updatePackageSchema = z.object({
  id: z.string().min(1, 'Package ID is required'),
  name: z.string().min(1, 'Package name is required').max(50, 'Package name too long').optional(),
  duration: z.number().int().min(15, 'Minimum duration is 15 minutes').max(1440, 'Maximum duration is 24 hours').optional(),
  price: z.number().int().min(1000, 'Minimum price is Rp 1,000').max(10000000, 'Maximum price is Rp 10,000,000').optional(),
  description: z.string().max(200, 'Description too long').optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
})

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function validateUserAccess(
  session: { user: { id: string; role: string; tenantId?: string | null } },
  unitId: string
): Promise<{ 
  success: boolean; 
  unit?: { 
    id: string; 
    name: string; 
    customerDisplayName?: string | null; 
    packageRates: unknown;
    location: { id: string; tenantId: string } 
  }; 
  error?: string; 
  status?: number 
}> {
  try {
    // Get unit with location info
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        customerDisplayName: true,
        packageRates: true,
        location: {
          select: {
            id: true,
            tenantId: true
          }
        }
      }
    })

    if (!unit) {
      return {
        success: false,
        error: 'Unit not found',
        status: 404
      }
    }

    // Check access based on role
    if (session.user.role === 'owner') {
      // Owner must own the tenant
      if (session.user.tenantId !== unit.location.tenantId) {
        return {
          success: false,
          error: 'Access denied to this unit',
          status: 403
        }
      }
    } else if (session.user.role === 'staff') {
      // Staff must be assigned to the location
      const hasAccess = await prisma.locationAssignment.findFirst({
        where: {
          userId: session.user.id,
          locationId: unit.location.id,
          isActive: true
        }
      })

      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied to this location',
          status: 403
        }
      }
    } else {
      return {
        success: false,
        error: 'Insufficient permissions',
        status: 403
      }
    }

    return {
      success: true,
      unit
    }
  } catch (error) {
    console.error('Error validating user access:', error)
    return {
      success: false,
      error: 'Internal server error',
      status: 500
    }
  }
}

// ============================================
// GET - Fetch all packages for a unit
// ============================================

export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
): Promise<NextResponse<PackagesResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || !['owner', 'staff'].includes(session.user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 401 })
    }

    // Await params to resolve the Promise
    const { unitId } = await context.params

    // Validate access and get unit
    const accessResult = await validateUserAccess(session, unitId)
    if (!accessResult.success || !accessResult.unit) {
      return NextResponse.json({
        success: false,
        error: accessResult.error || 'Access validation failed'
      }, { status: accessResult.status || 500 })
    }

    const unit = accessResult.unit

    // Parse and validate package rates
    const packages = jsonToPackageRates(unit.packageRates)

    return NextResponse.json({
      success: true,
      data: {
        packages: packages.sort((a, b) => a.displayOrder - b.displayOrder),
        unitId: unit.id,
        unitName: unit.customerDisplayName || unit.name
      }
    })

  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// ============================================
// POST - Create new package
// ============================================

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
): Promise<NextResponse<CreatePackageResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'owner') {
      return NextResponse.json({
        success: false,
        error: 'Only owners can create packages'
      }, { status: 401 })
    }

    // Await params to resolve the Promise
    const { unitId } = await context.params

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createPackageSchema.parse(body)

    // Validate access and get unit
    const accessResult = await validateUserAccess(session, unitId)
    if (!accessResult.success || !accessResult.unit) {
      return NextResponse.json({
        success: false,
        error: accessResult.error || 'Access validation failed'
      }, { status: accessResult.status || 500 })
    }

    const unit = accessResult.unit

    // Get existing packages
    const existingPackages = jsonToPackageRates(unit.packageRates)

    // Generate unique ID
    let packageId = generatePackageId(validatedData.name)
    let counter = 1
    while (existingPackages.some((pkg: PackageRate) => pkg.id === packageId)) {
      packageId = `${generatePackageId(validatedData.name)}_${counter}`
      counter++
    }

    // Create new package
    const newPackage: PackageRate = {
      id: packageId,
      name: validatedData.name,
      duration: validatedData.duration,
      price: validatedData.price,
      description: validatedData.description,
      isActive: validatedData.isActive,
      displayOrder: validatedData.displayOrder ?? existingPackages.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Validate package
    const validation = validatePackage(newPackage)
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Package validation failed',
        details: validation.errors || []
      }, { status: 400 })
    }

    // Update unit with new package
    const updatedPackages = [...existingPackages, newPackage]
    await prisma.unit.update({
      where: { id: unitId },
      data: {
        packageRates: packageRatesToJson(updatedPackages) as Prisma.JsonArray
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        package: newPackage,
        unitId: unit.id
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating package:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// ============================================
// PUT - Update existing package
// ============================================

export async function PUT(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
): Promise<NextResponse<UpdatePackageResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'owner') {
      return NextResponse.json({
        success: false,
        error: 'Only owners can update packages'
      }, { status: 401 })
    }

    // Await params to resolve the Promise
    const { unitId } = await context.params

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updatePackageSchema.parse(body)

    // Validate access and get unit
    const accessResult = await validateUserAccess(session, unitId)
    if (!accessResult.success || !accessResult.unit) {
      return NextResponse.json({
        success: false,
        error: accessResult.error || 'Access validation failed'
      }, { status: accessResult.status || 500 })
    }

    const unit = accessResult.unit

    // Get existing packages
    const existingPackages = jsonToPackageRates(unit.packageRates)

    // Find package to update
    const packageIndex = existingPackages.findIndex((pkg: PackageRate) => pkg.id === validatedData.id)
    if (packageIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Package not found'
      }, { status: 404 })
    }

    // Update package
    const updatedPackage: PackageRate = {
      ...existingPackages[packageIndex],
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.duration && { duration: validatedData.duration }),
      ...(validatedData.price && { price: validatedData.price }),
      ...(validatedData.description !== undefined && { description: validatedData.description }),
      ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      ...(validatedData.displayOrder !== undefined && { displayOrder: validatedData.displayOrder }),
      updatedAt: new Date().toISOString()
    }

    // Validate updated package
    const validation = validatePackage(updatedPackage)
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Package validation failed',
        details: validation.errors || []
      }, { status: 400 })
    }

    // Update packages array
    const updatedPackages = [...existingPackages]
    updatedPackages[packageIndex] = updatedPackage

    // Update unit
    await prisma.unit.update({
      where: { id: unitId },
      data: {
        packageRates: packageRatesToJson(updatedPackages) as Prisma.JsonArray
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        package: updatedPackage,
        unitId: unit.id
      }
    })

  } catch (error) {
    console.error('Error updating package:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// ============================================
// DELETE - Delete package
// ============================================

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
): Promise<NextResponse<DeletePackageResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'owner') {
      return NextResponse.json({
        success: false,
        error: 'Only owners can delete packages'
      }, { status: 401 })
    }

    // Await params to resolve the Promise
    const { unitId } = await context.params

    // Get packageId from query params
    const { searchParams } = new URL(request.url)
    const packageId = searchParams.get('packageId')

    if (!packageId) {
      return NextResponse.json({
        success: false,
        error: 'Package ID is required'
      }, { status: 400 })
    }

    // Validate access and get unit
    const accessResult = await validateUserAccess(session, unitId)
    if (!accessResult.success || !accessResult.unit) {
      return NextResponse.json({
        success: false,
        error: accessResult.error || 'Access validation failed'
      }, { status: accessResult.status || 500 })
    }

    const unit = accessResult.unit

    // Get existing packages
    const existingPackages = jsonToPackageRates(unit.packageRates)

    // Remove package
    const updatedPackages = existingPackages.filter((pkg: PackageRate) => pkg.id !== packageId)

    if (updatedPackages.length === existingPackages.length) {
      return NextResponse.json({
        success: false,
        error: 'Package not found'
      }, { status: 404 })
    }

    // Update unit
    await prisma.unit.update({
      where: { id: unitId },
      data: {
        packageRates: packageRatesToJson(updatedPackages) as Prisma.JsonArray
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        deletedPackageId: packageId,
        unitId: unit.id
      }
    })

  } catch (error) {
    console.error('Error deleting package:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}