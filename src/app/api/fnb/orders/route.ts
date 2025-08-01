// src/app/api/fnb/orders/route.ts - COMPLETE REGENERATED with stockRestored
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const getFnbOrdersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sessionId: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

const createFnbOrderSchema = z.object({
  items: z.array(z.object({
    fnbItemId: z.string().min(1),
    quantity: z.number().min(1).max(100)
  }).or(z.object({
    fnb_item_id: z.string().min(1),
    quantity: z.number().min(1).max(100)
  }))).min(1).transform((items) => {
    return items.map(item => ({
      fnbItemId: 'fnbItemId' in item ? item.fnbItemId : item.fnb_item_id,
      quantity: item.quantity
    }))
  }),
  rentalSessionId: z.string().optional().or(z.literal('')),
  rental_session_id: z.string().optional(),
  paymentTiming: z.enum(['immediate', 'end_of_session']).default('immediate'),
  payment_timing: z.enum(['immediate', 'end_of_session']).optional(),
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash').optional(),
  payment_method: z.enum(['cash', 'card', 'digital_wallet']).optional(),
  notes: z.string().optional()
}).transform((data) => ({
  items: data.items,
  rentalSessionId: data.rentalSessionId || data.rental_session_id || undefined,
  paymentTiming: data.paymentTiming || data.payment_timing || 'immediate',
  paymentMethod: data.paymentMethod || data.payment_method || 'cash',
  notes: data.notes
}))

// ============================================
// TYPES - UPDATED with stockRestored
// ============================================

interface FnbOrderItem {
  id: string
  fnbItemId: string
  fnbItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface FnbOrder {
  id: string
  items: FnbOrderItem[]
  totalAmount: number
  status: 'pending' | 'completed' | 'cancelled'
  paymentTiming: 'immediate' | 'end_of_session'
  rentalSessionId?: string
  unitName?: string
  customerName?: string
  notes?: string
  createdAt: string
  createdBy?: string
  createdByName?: string
  cancellationReason?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelledByName?: string
  stockRestored?: boolean  // ADDED: Include stockRestored field
}

interface GetFnbOrdersResponse {
  success: boolean
  data: FnbOrder[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message: string
}

interface CreateFnbOrderResponse {
  success: boolean
  data: {
    orderId: string
    totalAmount: number
    itemCount: number
    paymentStatus: 'paid' | 'pending'
  }
  message: string
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function decimalToNumber(decimal: Decimal): number {
  return parseFloat(decimal.toString())
}

// ============================================
// GET: FETCH F&B ORDERS - FIXED with stockRestored
// ============================================

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET F&B Orders API called')

    // ===== AUTHENTICATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions
    if (session.user.role !== 'staff' && session.user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // ===== GET LOCATION ID =====
    const locationId = request.headers.get('X-Location-ID')
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID required in headers' },
        { status: 400 }
      )
    }

    console.log('📍 Location ID:', locationId)

    // ===== VERIFY LOCATION ACCESS =====
    if (session.user.role === 'staff') {
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

    // ===== VALIDATE QUERY PARAMETERS =====
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedParams = getFnbOrdersSchema.parse(queryParams)

    console.log('🔍 Query params:', validatedParams)

    // ===== BUILD QUERY CONDITIONS =====
    const whereClause: {
      fnbOrderItems: {
        some: {
          fnbItem: {
            locationId: string
          }
        }
      }
      rentalSessionId?: string
      status?: string
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = {
      fnbOrderItems: {
        some: {
          fnbItem: {
            locationId: locationId
          }
        }
      }
    }

    // Add optional filters
    if (validatedParams.sessionId) {
      whereClause.rentalSessionId = validatedParams.sessionId
    }

    if (validatedParams.status) {
      whereClause.status = validatedParams.status
    }

    if (validatedParams.startDate || validatedParams.endDate) {
      whereClause.createdAt = {}
      if (validatedParams.startDate) {
        whereClause.createdAt.gte = new Date(validatedParams.startDate)
      }
      if (validatedParams.endDate) {
        whereClause.createdAt.lte = new Date(validatedParams.endDate)
      }
    }

    // ===== COUNT TOTAL ORDERS =====
    const totalCount = await prisma.fnbOrder.count({
      where: whereClause
    })

    console.log('📊 Total orders found:', totalCount)

    // ===== FETCH ORDERS with COMPLETE includes - FIXED to include stockRestored =====
    const ordersData = await prisma.fnbOrder.findMany({
      where: whereClause,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        rentalSessionId: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        cancellationReason: true,
        cancelledAt: true,
        cancelledBy: true,
        stockRestored: true,  // CRITICAL: Include stockRestored field from database
        fnbOrderItems: {
          select: {
            id: true,
            fnbItemId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            fnbItem: {
              select: {
                id: true,
                name: true,
                locationId: true
              }
            }
          }
        },
        rentalSession: {
          select: {
            id: true,
            unit: {
              select: {
                id: true,
                name: true,
                customerDisplayName: true
              }
            }
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cancelledByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (validatedParams.page - 1) * validatedParams.limit,
      take: validatedParams.limit
    })

    console.log('📦 Orders data fetched:', ordersData.length)

    // ===== FORMAT ORDERS - FIXED to properly handle stockRestored =====
    const formattedOrders: FnbOrder[] = ordersData.map(order => {
      // Determine payment timing
      let paymentTiming: 'immediate' | 'end_of_session'
      if (order.rentalSessionId) {
        paymentTiming = 'end_of_session'
      } else {
        paymentTiming = 'immediate'
      }

      // Debug log for cancelled orders
      if (order.status === 'cancelled') {
        console.log(`🔍 Cancelled order ${order.id}:`, {
          cancellationReason: order.cancellationReason,
          stockRestored: order.stockRestored,
          stockRestoredType: typeof order.stockRestored
        })
      }

      return {
        id: order.id,
        items: order.fnbOrderItems.map(item => ({
          id: item.id,
          fnbItemId: item.fnbItemId,
          fnbItemName: item.fnbItem.name,
          quantity: item.quantity,
          unitPrice: decimalToNumber(item.unitPrice),
          totalPrice: decimalToNumber(item.totalPrice)
        })),
        totalAmount: decimalToNumber(order.totalAmount),
        status: order.status as 'pending' | 'completed' | 'cancelled',
        paymentTiming: paymentTiming,
        rentalSessionId: order.rentalSessionId || undefined,
        unitName: order.rentalSession?.unit?.name || undefined,
        customerName: order.rentalSession?.unit?.customerDisplayName || undefined,
        notes: undefined,
        createdAt: order.createdAt.toISOString(),
        createdBy: order.createdBy || undefined,
        createdByName: order.createdByUser?.name || order.createdByUser?.email || undefined,
        cancellationReason: order.cancellationReason || undefined,
        cancelledAt: order.cancelledAt?.toISOString() || undefined,
        cancelledBy: order.cancelledBy || undefined,
        cancelledByName: order.cancelledByUser?.name || order.cancelledByUser?.email || undefined,
        // CRITICAL FIX: Properly handle stockRestored - include both true AND false values
        stockRestored: order.stockRestored !== null ? order.stockRestored : undefined
      }
    })

    console.log('✅ Formatted orders:', formattedOrders.length)

    // ===== PREPARE RESPONSE =====
    const response: GetFnbOrdersResponse = {
      success: true,
      data: formattedOrders,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / validatedParams.limit)
      },
      message: validatedParams.sessionId 
        ? `Found ${formattedOrders.length} F&B orders for session`
        : `Found ${formattedOrders.length} F&B orders`
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Get F&B Orders API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch F&B orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ============================================
// POST: CREATE F&B ORDER
// ============================================

export async function POST(request: NextRequest) {
  try {
    console.log('🍕 Create F&B Order API called')

    // ===== AUTHENTICATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions
    if (session.user.role !== 'staff' && session.user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // ===== GET LOCATION ID =====
    const locationId = request.headers.get('X-Location-ID')
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID required in headers' },
        { status: 400 }
      )
    }

    console.log('📍 Creating order for location:', locationId)

    // ===== VERIFY LOCATION ACCESS =====
    if (session.user.role === 'staff') {
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

    // ===== VALIDATE REQUEST BODY =====
    const body = await request.json()
    const validatedData = createFnbOrderSchema.parse(body)

    console.log('📝 Validated order data:', {
      itemCount: validatedData.items.length,
      paymentTiming: validatedData.paymentTiming,
      sessionId: validatedData.rentalSessionId
    })

    // ===== VALIDATE F&B ITEMS =====
    const fnbItems = await prisma.fnbItem.findMany({
      where: {
        id: { in: validatedData.items.map(item => item.fnbItemId) },
        locationId: locationId,
        isActive: true
      }
    })

    if (fnbItems.length !== validatedData.items.length) {
      return NextResponse.json(
        { success: false, error: 'Some F&B items not found or inactive' },
        { status: 400 }
      )
    }

    // ===== VALIDATE STOCK AVAILABILITY =====
    for (const orderItem of validatedData.items) {
      const fnbItem = fnbItems.find(item => item.id === orderItem.fnbItemId)
      if (!fnbItem) {
        return NextResponse.json(
          { success: false, error: `F&B item not found: ${orderItem.fnbItemId}` },
          { status: 400 }
        )
      }

      if (fnbItem.stockQuantity < orderItem.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${fnbItem.name}. Available: ${fnbItem.stockQuantity}, Requested: ${orderItem.quantity}` },
          { status: 400 }
        )
      }
    }

    // ===== VALIDATE RENTAL SESSION (if attached) =====
    if (validatedData.rentalSessionId) {
      const rentalSession = await prisma.rentalSession.findFirst({
        where: {
          id: validatedData.rentalSessionId,
          status: 'active',
          unit: {
            locationId: locationId
          }
        }
      })

      if (!rentalSession) {
        return NextResponse.json(
          { success: false, error: 'Active rental session not found' },
          { status: 400 }
        )
      }
    }

    // ===== CALCULATE TOTAL AMOUNT =====
    let totalAmount = 0
    for (const orderItem of validatedData.items) {
      const fnbItem = fnbItems.find(item => item.id === orderItem.fnbItemId)
      if (fnbItem) {
        totalAmount += decimalToNumber(fnbItem.sellingPrice) * orderItem.quantity
      }
    }

    console.log('💰 Total order amount:', totalAmount)

    // ===== CREATE ORDER IN TRANSACTION =====
    const result = await prisma.$transaction(async (tx) => {
      // Create F&B order
      const fnbOrder = await tx.fnbOrder.create({
        data: {
          rentalSessionId: validatedData.rentalSessionId || undefined,
          createdBy: session.user.id,
          totalAmount: totalAmount,
          status: validatedData.paymentTiming === 'immediate' ? 'completed' : 'pending'
        }
      })

      // Create order items and deduct stock
      const fnbOrderItems = []
      for (const orderItem of validatedData.items) {
        const fnbItem = fnbItems.find(item => item.id === orderItem.fnbItemId)
        if (!fnbItem) continue

        const unitPrice = decimalToNumber(fnbItem.sellingPrice)
        const totalPrice = unitPrice * orderItem.quantity

        // Create order item
        const fnbOrderItem = await tx.fnbOrderItem.create({
          data: {
            fnbOrderId: fnbOrder.id,
            fnbItemId: orderItem.fnbItemId,
            quantity: orderItem.quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice
          }
        })

        fnbOrderItems.push(fnbOrderItem)

        // Deduct stock
        await tx.fnbItem.update({
          where: { id: orderItem.fnbItemId },
          data: {
            stockQuantity: {
              decrement: orderItem.quantity
            }
          }
        })
      }

      // Create transaction for immediate payment
      if (validatedData.paymentTiming === 'immediate') {
        const transaction = await tx.transaction.create({
          data: {
            locationId: locationId,
            fnbOrderId: fnbOrder.id,
            amount: totalAmount,
            paymentMethod: validatedData.paymentMethod,
            paymentStatus: 'paid',
            type: 'fnb',
            description: validatedData.rentalSessionId 
              ? 'F&B order (attached to session)'
              : 'F&B standalone order'
          }
        })
        console.log(`💳 Transaction created for immediate payment: ${transaction.id}`)
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
          locationId: locationId,
          eventType: 'FNB_ORDER_CREATED',
          severity: 'LOW',
          ipAddress: 'system',
          resourceType: 'fnb_order',
          resourceId: fnbOrder.id,
          metadata: {
            orderId: fnbOrder.id,
            totalAmount: totalAmount,
            itemCount: validatedData.items.length,
            paymentTiming: validatedData.paymentTiming,
            paymentMethod: validatedData.paymentMethod,
            rentalSessionId: validatedData.rentalSessionId,
            createdByName: session.user.name || session.user.email
          }
        }
      })

      return { fnbOrder, fnbOrderItems }
    })

    console.log('✅ F&B Order created:', result.fnbOrder.id)

    // ===== PREPARE RESPONSE =====
    const response: CreateFnbOrderResponse = {
      success: true,
      data: {
        orderId: result.fnbOrder.id,
        totalAmount: totalAmount,
        itemCount: validatedData.items.length,
        paymentStatus: validatedData.paymentTiming === 'immediate' ? 'paid' : 'pending'
      },
      message: validatedData.paymentTiming === 'immediate' 
        ? 'F&B order created and paid successfully'
        : 'F&B order created - payment will be processed at end of session'
    }

    console.log('🍕 F&B Order API Response:', {
      orderId: result.fnbOrder.id,
      status: result.fnbOrder.status,
      paymentTiming: validatedData.paymentTiming,
      paymentStatus: response.data.paymentStatus,
      createdBy: session.user.name
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Create F&B Order API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create F&B order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}