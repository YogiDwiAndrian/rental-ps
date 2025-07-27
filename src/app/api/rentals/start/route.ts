// src/app/api/rentals/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PackageRate } from '@/types/package'
import { getPackageDuration, getPackagePrice, validatePackageRatesArray, jsonToPackageRates } from '@/lib/session-utils'
import { BillingType, SessionStatus, UnitStatus } from '@prisma/client'
import z from 'zod'

// Input validation schema
const startSessionSchema = z.object({
  unitId: z.string().min(1, 'Unit ID is required'),
  billingModel: z.enum(['timer', 'hourly', 'package']),
  customerName: z.string().optional(),
  purchasedDuration: z.number().int().min(1).optional(),
  packageId: z.string().optional(),
  notes: z.string().optional()
})

// Response type
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

export async function POST(request: NextRequest): Promise<NextResponse<StartSessionResponse>> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'staff') {
      return NextResponse.json({
        success: false,
        error: 'Only staff can start rental sessions'
      }, { status: 401 })
    }

    // Get location from header
    const locationId = request.headers.get('X-Location-ID')
    if (!locationId) {
      return NextResponse.json({
        success: false,
        error: 'Location ID header is required'
      }, { status: 400 })
    }

    // Validate input
    const body = await request.json()
    const validatedData = startSessionSchema.parse(body)

    // Verify staff has access to this location
    const locationAccess = await prisma.locationAssignment.findFirst({
      where: {
        userId: session.user.id,
        locationId: locationId,
        isActive: true
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    })

    if (!locationAccess || !locationAccess.location.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Access denied to this location'
      }, { status: 403 })
    }

    // Check unit availability and get unit details
    const unit = await prisma.unit.findFirst({
      where: {
        id: validatedData.unitId,
        locationId: locationId,
        isActive: true
      }
    })

    if (!unit) {
      return NextResponse.json({
        success: false,
        error: 'Unit not found or inactive'
      }, { status: 404 })
    }

    if (unit.status !== 'available') {
      return NextResponse.json({
        success: false,
        error: `Unit is currently ${unit.status}`,
        details: { currentStatus: unit.status }
      }, { status: 400 })
    }

    // Check for existing active session on this unit
    const existingSession = await prisma.rentalSession.findFirst({
      where: {
        unitId: validatedData.unitId,
        status: 'active'
      }
    })

    if (existingSession) {
      return NextResponse.json({
        success: false,
        error: 'Unit already has an active session'
      }, { status: 400 })
    }

    // Validate billing model specific requirements
    let calculatedAmount: number = 0
    let estimatedEndTime: Date | undefined
    let purchasedDuration = 0

    switch (validatedData.billingModel) {
      case 'timer':
        // Timer billing - no upfront payment, calculate at end
        calculatedAmount = 0
        purchasedDuration = 0
        break

      case 'hourly':
        if (!validatedData.purchasedDuration) {
          return NextResponse.json({
            success: false,
            error: 'Purchased duration is required for hourly billing'
          }, { status: 400 })
        }
        purchasedDuration = validatedData.purchasedDuration
        calculatedAmount = (validatedData.purchasedDuration / 60) * Number(unit.hourlyRate)
        estimatedEndTime = new Date(Date.now() + validatedData.purchasedDuration * 60000)
        break

      case 'package':
        if (!validatedData.packageId) {
          return NextResponse.json({
            success: false,
            error: 'Package ID is required for package billing'
          }, { status: 400 })
        }

        // Get package rates from unit specifications
        const packageRates = jsonToPackageRates(unit.packageRates)
        if (packageRates.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Unit has no valid packages configured'
          }, { status: 400 })
        }

        const packagePrice = getPackagePrice(packageRates, validatedData.packageId)
        const packageDuration = getPackageDuration(packageRates, validatedData.packageId)
        
        if (packagePrice === 0) {
          return NextResponse.json({
            success: false,
            error: 'Invalid package ID for this unit'
          }, { status: 400 })
        }

        calculatedAmount = packagePrice
        purchasedDuration = packageDuration
        estimatedEndTime = new Date(Date.now() + packageDuration * 60000)
        break
    }

    // Create rental session in database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update unit status to occupied
      await tx.unit.update({
        where: { id: validatedData.unitId },
        data: { status: 'occupied' as UnitStatus }
      })

      // Create rental session - using ONLY fields that exist in schema
      const newSession = await tx.rentalSession.create({
        data: {
          locationId: locationId,
          unitId: validatedData.unitId,
          billingModel: validatedData.billingModel as BillingType,
          status: 'active' as SessionStatus,
          startTime: new Date(),
          purchasedDuration: purchasedDuration,
          extendedDuration: 0,
          totalAmount: calculatedAmount
        },
        include: {
          unit: {
            select: {
              name: true,
              customerDisplayName: true
            }
          }
        }
      })

      return newSession
    })

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.id,
        unitName: result.unit.customerDisplayName || result.unit.name,
        billingModel: result.billingModel,
        startTime: result.startTime.toISOString(),
        purchasedDuration: purchasedDuration > 0 ? purchasedDuration : undefined,
        totalAmount: calculatedAmount > 0 ? calculatedAmount : undefined,
        estimatedEndTime: estimatedEndTime?.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error starting rental session:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}