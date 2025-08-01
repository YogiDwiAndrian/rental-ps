// src/app/api/fnb/orders/route.ts - FIXED to work with correct schema
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
// TYPES - Updated with cancellation info
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
  cancelledByName?: string
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

    // Add filters
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

    // ===== FORMAT RESPONSE - Updated with cancellation info =====
    const formattedOrders: FnbOrder[] = orders.map(order => {
      // Determine payment timing correctly
      let paymentTiming: 'immediate' | 'end_of_session' = 'immediate'
      
      if (order.rentalSessionId) {
        const hasTransaction = order.transactions && order.transactions.length > 0
        paymentTiming = hasTransaction ? 'immediate' : 'end_of_session'
      } else {
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
        cancelledByName: order.cancelledByUser?.name || order.cancelledByUser?.email || undefined
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
    // ===== AUTHENTICATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

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
    const validatedData = createFnbOrderSchema.parse(body)

    console.log('🍕 Creating F&B Order:', {
      userId: session.user.id,
      userName: session.user.name,
      locationId,
      itemCount: validatedData.items.length,
      paymentTiming: validatedData.paymentTiming,
      rentalSessionId: validatedData.rentalSessionId
    })

    // ===== VALIDATE F&B ITEMS AND CALCULATE TOTAL =====
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

    // Validate stock and calculate order items
    let totalAmount = 0
    const orderItemsData = validatedData.items.map(orderItem => {
      const fnbItem = fnbItems.find(item => item.id === orderItem.fnbItemId)
      if (!fnbItem) {
        throw new Error(`F&B item not found: ${orderItem.fnbItemId}`)
      }

      if (fnbItem.stockQuantity < orderItem.quantity) {
        throw new Error(`Insufficient stock for ${fnbItem.name}. Available: ${fnbItem.stockQuantity}`)
      }

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
      const initialStatus = validatedData.paymentTiming === 'immediate' ? 'completed' : 'pending'
      
      console.log(`🍕 Creating F&B order with:`, {
        paymentTiming: validatedData.paymentTiming,
        initialStatus,
        rentalSessionId: validatedData.rentalSessionId,
        totalAmount,
        createdBy: session.user.id
      })
      
      // Create F&B order with createdBy field
      const fnbOrder = await tx.fnbOrder.create({
        data: {
          rentalSessionId: validatedData.rentalSessionId || null,
          createdBy: session.user.id,
          totalAmount: totalAmount,
          status: initialStatus
        }
      })

      console.log(`✅ F&B order created with ID: ${fnbOrder.id}, Status: ${fnbOrder.status}, Created by: ${session.user.name}`)

      // Create order items and deduct stock
      const fnbOrderItems = []
      for (const itemData of orderItemsData) {
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
    console.error('Create F&B Order API Error:', error)

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