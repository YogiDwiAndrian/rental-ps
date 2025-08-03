// src/app/api/rentals/start/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { BillingType, SessionStatus, UnitStatus } from '@prisma/client'
import { StartSessionResponse } from '@/types/session'

// ============================================
// VALIDATION SCHEMA
// ============================================

const startSessionSchema = z.object({
  unitId: z.string().min(1, 'Unit ID is required'),
  billingModel: z.enum(['timer', 'hourly', 'package']),
  customerName: z.string().optional(),
  purchasedDuration: z.number().min(1).optional(),
  packageId: z.string().optional(),
  notes: z.string().optional()
})

// ============================================
// TYPES
// ============================================


// Fixed PackageRate interface to match seed data
interface PackageRate {
  id: string
  duration: number        // ✅ Fixed: was durationMinutes
  price: number
  name: string
  description?: string
  isActive: boolean
  displayOrder: number
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<StartSessionResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get location ID from header
    const locationId = request.headers.get('X-Location-ID')
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = startSessionSchema.parse(body)

    // Verify unit exists and is available
    const unit = await prisma.unit.findFirst({
      where: {
        id: validatedData.unitId,
        locationId: locationId,
        status: UnitStatus.available,
        isActive: true
      },
      include: {
        location: {
          include: {
            tenant: true
          }
        }
      }
    })

    if (!unit) {
      return NextResponse.json(
        { success: false, error: 'Unit not found or not available' },
        { status: 404 }
      )
    }

    // Verify user has access to this location
    if (session.user.role !== 'super_admin') {
      if (session.user.role === 'owner') {
        // Owner can access any location in their tenant
        if (session.user.tenantId !== unit.location.tenant.id) {
          return NextResponse.json(
            { success: false, error: 'Access denied to this tenant' },
            { status: 403 }
          )
        }
      } else if (session.user.role === 'staff') {
        // Staff must be assigned to the specific location
        const hasAccess = await prisma.locationAssignment.findFirst({
          where: {
            userId: session.user.id,
            locationId: locationId,
            isActive: true
          }
        })

        if (!hasAccess) {
          return NextResponse.json(
            { success: false, error: 'Access denied to this location' },
            { status: 403 }
          )
        }
      }
    }

    // Calculate pricing and duration based on billing model
    let totalAmount = 0
    let purchasedDuration = 0
    let estimatedEndTime: Date | null = null

    switch (validatedData.billingModel) {
      case 'timer':
        // Timer mode - no upfront payment, calculated at end
        totalAmount = 0
        purchasedDuration = 0
        estimatedEndTime = null // Timer mode has no estimated end time
        break

      case 'hourly':
        if (!validatedData.purchasedDuration) {
          return NextResponse.json(
            { success: false, error: 'Duration is required for hourly billing' },
            { status: 400 }
          )
        }
        
        if (validatedData.purchasedDuration < 15) {
          return NextResponse.json(
            { success: false, error: 'Minimum duration is 15 minutes' },
            { status: 400 }
          )
        }

        purchasedDuration = validatedData.purchasedDuration
        totalAmount = Math.ceil((validatedData.purchasedDuration / 60) * parseFloat(unit.hourlyRate.toString()))
        
        // Safe date calculation
        const hourlyEndTime = new Date()
        hourlyEndTime.setMinutes(hourlyEndTime.getMinutes() + validatedData.purchasedDuration)
        estimatedEndTime = hourlyEndTime
        break

      case 'package':
        if (!validatedData.packageId) {
          return NextResponse.json(
            { success: false, error: 'Package ID is required for package billing' },
            { status: 400 }
          )
        }
        
        // Get package details from unit.packageRates JSON
        const packageRates = unit.packageRates as unknown
        if (!packageRates || !Array.isArray(packageRates)) {
          return NextResponse.json(
            { success: false, error: 'No packages available for this unit' },
            { status: 400 }
          )
        }

        const typedPackageRates = packageRates as PackageRate[]
        const selectedPackage = typedPackageRates.find((pkg: PackageRate) => pkg.id === validatedData.packageId)
        
        if (!selectedPackage) {
          return NextResponse.json(
            { success: false, error: 'Selected package not found' },
            { status: 404 }
          )
        }

        // Validate package duration
        if (!selectedPackage.duration || selectedPackage.duration <= 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid package duration' },
            { status: 400 }
          )
        }

        // Validate package price
        if (!selectedPackage.price || selectedPackage.price <= 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid package price' },
            { status: 400 }
          )
        }
        
        purchasedDuration = selectedPackage.duration // ✅ Fixed: now using 'duration' instead of 'durationMinutes'
        totalAmount = selectedPackage.price
        
        // Safe date calculation for package
        const packageEndTime = new Date()
        packageEndTime.setMinutes(packageEndTime.getMinutes() + selectedPackage.duration)
        estimatedEndTime = packageEndTime
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid billing model' },
          { status: 400 }
        )
    }

    // Validate calculated values before database operations
    if (validatedData.billingModel !== 'timer') {
      if (!estimatedEndTime || isNaN(estimatedEndTime.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Failed to calculate session end time' },
          { status: 500 }
        )
      }
      
      if (purchasedDuration <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid session duration' },
          { status: 400 }
        )
      }
    }

    // Start database transaction to create session and update unit
    const result = await prisma.$transaction(async (tx) => {
      // Create rental session
      const rentalSession = await tx.rentalSession.create({
        data: {
          locationId: locationId,
          unitId: validatedData.unitId,
          customerName: validatedData.customerName || null,
           createdBy: session.user.id,
          billingModel: validatedData.billingModel as BillingType,
          status: SessionStatus.active,
          startTime: new Date(),
          purchasedDuration: purchasedDuration,
          extendedDuration: 0,
          totalAmount: totalAmount
          // ✅ Removed 'notes' field - not in RentalSession schema
        }
      })

      // Update unit status to occupied
      await tx.unit.update({
        where: { id: validatedData.unitId },
        data: { 
          status: UnitStatus.occupied,
          customerDisplayName: validatedData.customerName || null
        }
      })

      // Create initial payment transaction if there's upfront payment
      if (totalAmount > 0) {
        await tx.transaction.create({
          data: {
            locationId: locationId,
            rentalSessionId: rentalSession.id,
            type: 'rental',
            amount: totalAmount,
            paymentStatus: 'paid',
            paymentMethod: 'cash',
            description: `${validatedData.billingModel} session payment`
          }
        })
      }

      // Update work session revenue if active
      const activeWorkSession = await tx.workSession.findFirst({
        where: {
          locationId: locationId,
          status: 'active'
        }
      })

      if (activeWorkSession) {
        const revenueField = validatedData.billingModel === 'package' ? 'packageRevenue' : 
                           validatedData.billingModel === 'hourly' ? 'hourlyRevenue' : 'payLaterRevenue'
        
        await tx.workSession.update({
          where: { id: activeWorkSession.id },
          data: {
            totalSessions: { increment: 1 },
            totalRevenue: { increment: totalAmount },
            [revenueField]: { increment: totalAmount }
          }
        })
      }

      return rentalSession
    })

    console.log('✅ Session created successfully:', {
      sessionId: result.id,
      billingModel: validatedData.billingModel,
      duration: purchasedDuration,
      amount: totalAmount,
      estimatedEndTime: estimatedEndTime?.toISOString()
    })

    // Return success response with safe toISOString()
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.id,
        unitName: unit.customerDisplayName || unit.name,
        billingModel: result.billingModel,
        startTime: result.startTime.toISOString(),
        purchasedDuration: purchasedDuration || undefined,
        totalAmount: totalAmount || undefined,
        estimatedEndTime: estimatedEndTime?.toISOString() || undefined
      }
    })

  } catch (error) {
    console.error('❌ Error starting session:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input data',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    // Handle Prisma errors
    if (error instanceof Error && error.message.includes('Prisma')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database operation failed',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}