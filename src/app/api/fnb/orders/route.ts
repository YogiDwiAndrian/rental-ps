// src/app/api/fnb/orders/route.ts - Updated to include unitName
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
    // Normalize field names from both camelCase and snake_case
    return items.map(item => ({
      fnbItemId: 'fnbItemId' in item ? item.fnbItemId : item.fnb_item_id,
      quantity: item.quantity
    }))
  }),
  rentalSessionId: z.string().optional().or(z.literal('')),
  rental_session_id: z.string().optional(), // Support snake_case too
  paymentTiming: z.enum(['immediate', 'end_of_session']).default('immediate'),
  payment_timing: z.enum(['immediate', 'end_of_session']).optional(), // Support snake_case too
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).default('cash').optional(),
  payment_method: z.enum(['cash', 'card', 'digital_wallet']).optional(), // Support snake_case too
  notes: z.string().optional()
}).transform((data) => ({
  items: data.items,
  rentalSessionId: data.rentalSessionId || data.rental_session_id || undefined,
  paymentTiming: data.paymentTiming || data.payment_timing || 'immediate',
  paymentMethod: data.paymentMethod || data.payment_method || 'cash',
  notes: data.notes
}))

// ============================================
// TYPES - Updated with unitName
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
  unitName?: string  // NEW: Add unit name field
  customerName?: string
  notes?: string
  createdAt: string
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
// GET: FETCH F&B ORDERS
// ============================================

export async function GET(request: NextRequest) {
  try {
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

    // Add session filter if provided
    if (validatedParams.sessionId) {
      whereClause.rentalSessionId = validatedParams.sessionId
    }

    // Add status filter if provided
    if (validatedParams.status) {
      whereClause.status = validatedParams.status
    }

    // Add date range filter if provided
    if (validatedParams.startDate || validatedParams.endDate) {
      whereClause.createdAt = {}
      if (validatedParams.startDate) {
        whereClause.createdAt.gte = new Date(validatedParams.startDate)
      }
      if (validatedParams.endDate) {
        whereClause.createdAt.lte = new Date(validatedParams.endDate)
      }
    }

    // ===== FETCH ORDERS WITH PAGINATION =====
    const [orders, totalCount] = await Promise.all([
      prisma.fnbOrder.findMany({
        where: whereClause,
        include: {
          fnbOrderItems: {
            include: {
              fnbItem: {
                select: {
                  name: true
                }
              }
            }
          },
          rentalSession: {
            include: {
              unit: {
                select: {
                  name: true,
                  customerDisplayName: true
                }
              }
            }
          },
          transactions: {
            select: {
              id: true,
              paymentStatus: true,
              paymentMethod: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (validatedParams.page - 1) * validatedParams.limit,
        take: validatedParams.limit
      }),
      prisma.fnbOrder.count({
        where: whereClause
      })
    ])

    // ===== FORMAT RESPONSE - Updated with correct paymentTiming =====
    const formattedOrders: FnbOrder[] = orders.map(order => {
      // CRITICAL FIX: Determine payment timing correctly
      // If order has immediate transaction, it was paid immediately
      // If order is attached to session and has no transaction, it's end_of_session
      // If order is standalone and has no transaction, it's pending immediate payment
      
      let paymentTiming: 'immediate' | 'end_of_session' = 'immediate'
      
      if (order.rentalSessionId) {
        // Order attached to session
        const hasTransaction = order.transactions && order.transactions.length > 0
        paymentTiming = hasTransaction ? 'immediate' : 'end_of_session'
      } else {
        // Standalone order - always immediate payment
        paymentTiming = 'immediate'
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
        paymentTiming: paymentTiming, // FIXED: Use correct logic
        rentalSessionId: order.rentalSessionId || undefined,
        unitName: order.rentalSession?.unit?.name || undefined,
        customerName: order.rentalSession?.unit?.customerDisplayName || undefined,
        notes: undefined,
        createdAt: order.createdAt.toISOString()
      }
    })

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
    console.error('Get F&B Orders API Error:', error)

    // Handle Zod validation errors
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

    // Handle other errors
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
    console.log('🍕 Received F&B order request:', body)
    const validatedData = createFnbOrderSchema.parse(body)
    console.log('🍕 Validated F&B order data:', validatedData)

    // ===== VERIFY RENTAL SESSION IF PROVIDED =====
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
          { 
            success: false, 
            error: 'Rental session not found or not active' 
          },
          { status: 404 }
        )
      }
    }

    // ===== FETCH AND VALIDATE F&B ITEMS =====
    const itemIds = validatedData.items.map(item => item.fnbItemId)
    const fnbItems = await prisma.fnbItem.findMany({
      where: {
        id: { in: itemIds },
        locationId: locationId,
        isActive: true
      }
    })

    if (fnbItems.length !== itemIds.length) {
      const foundIds = fnbItems.map(item => item.id)
      const missingIds = itemIds.filter(id => !foundIds.includes(id))
      return NextResponse.json(
        { 
          success: false, 
          error: 'Some F&B items not found',
          details: { missingItems: missingIds }
        },
        { status: 404 }
      )
    }

    // ===== VALIDATE STOCK AVAILABILITY =====
    for (const orderItem of validatedData.items) {
      const fnbItem = fnbItems.find(item => item.id === orderItem.fnbItemId)
      if (!fnbItem) continue

      if (fnbItem.stockQuantity < orderItem.quantity) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Insufficient stock for ${fnbItem.name}`,
            details: { 
              itemName: fnbItem.name,
              requested: orderItem.quantity,
              available: fnbItem.stockQuantity
            }
          },
          { status: 400 }
        )
      }
    }

    // ===== CALCULATE TOTAL AMOUNT =====
    let totalAmount = 0
    const orderItemsData = validatedData.items.map(orderItem => {
      const fnbItem = fnbItems.find(item => item.id === orderItem.fnbItemId)!
      const itemTotal = Number(fnbItem.sellingPrice) * orderItem.quantity
      totalAmount += itemTotal

      return {
        fnbItemId: orderItem.fnbItemId,
        quantity: orderItem.quantity,
        unitPrice: fnbItem.sellingPrice,
        totalPrice: itemTotal
      }
    })

    // ===== CREATE ORDER AND DEDUCT STOCK =====
    const result = await prisma.$transaction(async (tx) => {
      // CRITICAL FIX: Set correct status based on payment timing
      const initialStatus = validatedData.paymentTiming === 'immediate' ? 'completed' : 'pending'
      
      console.log(`🍕 Creating F&B order with:`, {
        paymentTiming: validatedData.paymentTiming,
        initialStatus,
        rentalSessionId: validatedData.rentalSessionId,
        totalAmount
      })
      
      // Create F&B order with correct status
      const fnbOrder = await tx.fnbOrder.create({
        data: {
          rentalSessionId: validatedData.rentalSessionId || null,
          totalAmount: totalAmount,
          status: initialStatus  // FIXED: Use correct status based on payment timing
        }
      })

      console.log(`✅ F&B order created with ID: ${fnbOrder.id}, Status: ${fnbOrder.status}`)

      // Create order items and deduct stock
      const fnbOrderItems = []
      for (const itemData of orderItemsData) {
        // Create order item
        const orderItem = await tx.fnbOrderItem.create({
          data: {
            fnbOrderId: fnbOrder.id,
            fnbItemId: itemData.fnbItemId,
            quantity: itemData.quantity,
            unitPrice: itemData.unitPrice,
            totalPrice: itemData.totalPrice
          }
        })
        fnbOrderItems.push(orderItem)

        // Deduct stock
        await tx.fnbItem.update({
          where: { id: itemData.fnbItemId },
          data: {
            stockQuantity: {
              decrement: itemData.quantity
            }
          }
        })
      }

      // Create transaction if immediate payment
      if (validatedData.paymentTiming === 'immediate') {
        const transaction = await tx.transaction.create({
          data: {
            locationId: locationId,
            fnbOrderId: fnbOrder.id,
            type: 'fnb',
            amount: totalAmount,
            paymentStatus: 'paid',
            paymentMethod: validatedData.paymentMethod,
            description: validatedData.rentalSessionId 
              ? 'F&B order (attached to session)'
              : 'F&B standalone order'
          }
        })
        console.log(`💳 Transaction created for immediate payment: ${transaction.id}`)
      }

      return { fnbOrder, fnbOrderItems }
    })

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
      paymentStatus: response.data.paymentStatus
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Create F&B Order API Error:', error)

    // Handle Zod validation errors
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

    // Handle other errors
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