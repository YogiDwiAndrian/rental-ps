import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { RentalSession, SessionHistoryResponse } from '@/types/session'

// ============================================
// TYPES & VALIDATION
// ============================================

const querySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('15').transform(Number),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
})

// ============================================
// GET /api/rentals/history
// ============================================

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/rentals/history - Starting request')

    // ===== AUTHENTICATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ No valid session found')
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // ===== LOCATION VALIDATION =====
    const locationId = request.headers.get('X-Location-ID')
    if (!locationId) {
      console.log('❌ Missing location ID in headers')
      return NextResponse.json(
        { success: false, message: 'Location ID required' },
        { status: 400 }
      )
    }

    console.log('📍 Processing for location:', locationId)

    // ===== PERMISSION CHECK =====
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        tenant: true,
        locationAssignments: {
          include: { location: true }
        }
      }
    })

    if (!user) {
      console.log('❌ User not found in database')
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this location
    const hasLocationAccess = user.role === 'owner' || 
      user.locationAssignments.some(assignment => assignment.locationId === locationId)

    if (!hasLocationAccess) {
      console.log('❌ User does not have access to location:', locationId)
      return NextResponse.json(
        { success: false, message: 'Access denied to this location' },
        { status: 403 }
      )
    }

    // ===== QUERY VALIDATION =====
    const { searchParams } = new URL(request.url)
    const queryObject = Object.fromEntries(searchParams.entries())
    
    const validatedParams = querySchema.parse(queryObject)
    console.log('📋 Query params:', {
      ...validatedParams,
      dateFromParsed: validatedParams.dateFrom ? new Date(validatedParams.dateFrom + 'T00:00:00.000Z') : undefined,
      dateToParsed: validatedParams.dateTo ? new Date(validatedParams.dateTo + 'T23:59:59.999Z') : undefined
    })

    // Validate pagination limits
    if (validatedParams.page < 1) validatedParams.page = 1
    if (validatedParams.limit < 1 || validatedParams.limit > 100) validatedParams.limit = 15

    // ===== BUILD WHERE CLAUSE =====
    const whereClause = {
      unit: {
        locationId: locationId
      },
      ...(validatedParams.status && { status: validatedParams.status }),
      // Date filtering
      ...(validatedParams.dateFrom && {
        startTime: {
          gte: new Date(validatedParams.dateFrom + 'T00:00:00.000Z'),
          ...(validatedParams.dateTo && {
            lte: new Date(validatedParams.dateTo + 'T23:59:59.999Z')
          })
        }
      })
    }

    console.log('🔍 Where clause:', JSON.stringify(whereClause, null, 2))

    // ===== FETCH TOTAL COUNT =====
    const totalSessions = await prisma.rentalSession.count({
      where: whereClause
    })

    console.log('📊 Total sessions found:', totalSessions)

    // ===== FETCH SESSIONS DATA =====
    const sessionsData = await prisma.rentalSession.findMany({
      where: whereClause,
      include: {
        unit: {
          select: {
            id: true,
            name: true,
          }
        },
        createdByUser: { // ✅ ADDED: Include staff who created session
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true
      }
    },
        fnbOrders: {
          select: {
            id: true,
            totalAmount: true,
            status: true
          }
        }
      },
      orderBy: { startTime: 'desc' },
      skip: (validatedParams.page - 1) * validatedParams.limit,
      take: validatedParams.limit
    })

    console.log('📦 Sessions data fetched:', sessionsData.length)

    // ===== FORMAT SESSIONS =====
    const formattedSessions: RentalSession[] = sessionsData.map(session => {
      // Calculate duration if session is completed
      let duration: number | undefined
      if (session.endTime && session.startTime) {
        const start = new Date(session.startTime)
        const end = new Date(session.endTime)
        duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)) // minutes
      }

      // F&B orders summary
      const fnbOrders = session.fnbOrders || []
      const activeFnbOrders = fnbOrders.filter(order => order.status !== 'cancelled')
      const hasFnbOrders = fnbOrders.length > 0
      const fnbOrdersCount = fnbOrders.length
      const fnbOrdersTotal = fnbOrders.reduce((sum: number, order: { totalAmount: Decimal }) => {
        return sum + Number(order.totalAmount)
      }, 0)

      // Get unit display name
      const unitName = session.unit.name

      const createdBy = session.createdBy || undefined
      const createdByName = session.createdByUser ? `${session.createdByUser.firstName || ''} ${session.createdByUser.lastName || ''}`.trim() || session.createdByUser.name || session.createdByUser.email.split('@')[0] : undefined
      const sessionAmount = Number(session.totalAmount)
      const grandTotal = sessionAmount + fnbOrdersTotal
      return {
        id: session.id,
        unitId: session.unit.id,
        unitName,
        customerName: session.customerName || undefined,
        billingModel: session.billingModel as 'timer' | 'hourly' | 'package',
        status: session.status as 'active' | 'completed' | 'cancelled',
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString(),
        duration,
        totalAmount: Number(session.totalAmount),
        purchasedDuration: session.purchasedDuration,
        extendedDuration: session.extendedDuration,
        notes: undefined,
        createdBy,
        createdByName,
        hasFnbOrders,
        fnbOrdersCount,
        fnbOrdersTotal,
        grandTotal 
      }
    })

    console.log('✅ Sessions formatted successfully')

    // ===== PREPARE RESPONSE =====
    const totalPages = Math.ceil(totalSessions / validatedParams.limit)

    const response: SessionHistoryResponse = {
      success: true,
      data: formattedSessions,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalSessions,
        totalPages
      },
      message: `Found ${totalSessions} sessions${validatedParams.dateFrom ? ` from ${validatedParams.dateFrom}` : ''}${validatedParams.dateTo ? ` to ${validatedParams.dateTo}` : ''}`
    }

    console.log('📤 Sending response with', formattedSessions.length, 'sessions')

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error in GET /api/rentals/history:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid query parameters',
          errors: error.issues
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}