// src/app/api/rentals/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { BillingType, SessionStatus, UnitStatus } from '@prisma/client'

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

interface StartSessionResponse {
  success: boolean
  data?: {
    sessionId: string
    unitName: string
    billingModel: BillingType
    startTime: string
    purchasedDuration?: number
    totalAmount?: number
    estimatedEndTime?: string
  }
  error?: string
  details?: unknown
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

    // Calculate pricing and duration based on billing model
    let totalAmount = 0
    let purchasedDuration = 0
    let estimatedEndTime: Date | null = null

    switch (validatedData.billingModel) {
      case 'timer':
        // Timer mode - no upfront payment, calculated at end
        totalAmount = 0
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
        totalAmount = (validatedData.purchasedDuration / 60) * parseFloat(unit.hourlyRate.toString())
        estimatedEndTime = new Date(Date.now() + validatedData.purchasedDuration * 60 * 1000)
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

        interface PackageRate {
          id: string
          durationMinutes: number
          price: number
          name: string
        }

        const typedPackageRates = packageRates as PackageRate[]
        const selectedPackage = typedPackageRates.find((pkg: PackageRate) => pkg.id === validatedData.packageId)
        if (!selectedPackage) {
          return NextResponse.json(
            { success: false, error: 'Selected package not found' },
            { status: 404 }
          )
        }
        
        purchasedDuration = selectedPackage.durationMinutes
        totalAmount = selectedPackage.price
        estimatedEndTime = new Date(Date.now() + selectedPackage.durationMinutes * 60 * 1000)
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid billing model' },
          { status: 400 }
        )
    }

    // Start database transaction to create session and update unit
    const result = await prisma.$transaction(async (tx) => {
      // Create rental session
      const rentalSession = await tx.rentalSession.create({
        data: {
          locationId: locationId,
          unitId: validatedData.unitId,
          billingModel: validatedData.billingModel as BillingType,
          status: SessionStatus.active,
          startTime: new Date(),
          purchasedDuration: purchasedDuration,
          totalAmount: totalAmount
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
        await tx.workSession.update({
          where: { id: activeWorkSession.id },
          data: {
            totalSessions: { increment: 1 },
            totalRevenue: { increment: totalAmount },
            [validatedData.billingModel === 'package' ? 'packageRevenue' : 'hourlyRevenue']: {
              increment: totalAmount
            }
          }
        })
      }

      return rentalSession
    })

    // Return success response
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
    console.error('Error starting session:', error)
    
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