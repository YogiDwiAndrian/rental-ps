// src/app/api/fnb/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const getFnbOrdersSchema = z.object({
  sessionId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  dateFrom: z.string().optional().nullable(),
  dateTo: z.string().optional().nullable(),
  page: z.string().optional().nullable(),
  limit: z.string().optional().nullable()
}).transform((data) => ({
  sessionId: data.sessionId || undefined,
  locationId: data.locationId || undefined,
  status: data.status || undefined,
  dateFrom: data.dateFrom || undefined,
  dateTo: data.dateTo || undefined,
  page: data.page || undefined,
  limit: data.limit || undefined
}))

// ============================================
// RESPONSE TYPES
// ============================================

interface FnbOrderItemResponse {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  fnbItemName: string
}

interface FnbOrderResponse {
  id: string
  rentalSessionId?: string
  totalAmount: number
  status: string
  createdAt: string
  updatedAt: string
  items: FnbOrderItemResponse[]
  sessionInfo?: {
    unitName: string
    customerName?: string
  }
}

interface GetFnbOrdersResponse {
  success: boolean
  data?: FnbOrderResponse[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  error?: string
  message?: string
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

    // ===== PARSE QUERY PARAMETERS =====
    const { searchParams } = new URL(request.url)
    const queryParams = {
      sessionId: searchParams.get('sessionId'),
      locationId: searchParams.get('locationId'),
      status: searchParams.get('status'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    }

    const validatedParams = getFnbOrdersSchema.parse(queryParams)

    // ===== BUILD QUERY CONDITIONS =====
    interface WhereConditions {
      rentalSession?: {
        locationId: string
      }
      rentalSessionId?: string
      status?: string
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    }

    const whereConditions: WhereConditions = {}

    // Always filter by location from header (primary filter)
    whereConditions.rentalSession = {
      locationId: locationId
    }

    // If sessionId provided, filter by specific session
    if (validatedParams.sessionId) {
      whereConditions.rentalSessionId = validatedParams.sessionId
    }

    // If status provided, filter by status
    if (validatedParams.status) {
      whereConditions.status = validatedParams.status
    }

    // If date range provided, filter by creation date
    if (validatedParams.dateFrom || validatedParams.dateTo) {
      whereConditions.createdAt = {}
      
      if (validatedParams.dateFrom) {
        whereConditions.createdAt.gte = new Date(validatedParams.dateFrom)
      }
      
      if (validatedParams.dateTo) {
        const endDate = new Date(validatedParams.dateTo)
        endDate.setHours(23, 59, 59, 999) // End of day
        whereConditions.createdAt.lte = endDate
      }
    }

    // ===== PAGINATION =====
    const page = parseInt(validatedParams.page || '1')
    const limit = parseInt(validatedParams.limit || '50')
    const skip = (page - 1) * limit

    // ===== FETCH F&B ORDERS =====
    const [fnbOrders, totalCount] = await Promise.all([
      prisma.fnbOrder.findMany({
        where: whereConditions,
        include: {
          fnbOrderItems: {
            include: {
              fnbItem: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          },
          rentalSession: {
            select: {
              id: true,
              unit: {
                select: {
                  name: true,
                  customerDisplayName: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: skip,
        take: limit
      }),
      
      prisma.fnbOrder.count({
        where: whereConditions
      })
    ])

    // ===== FORMAT RESPONSE =====
    const formattedOrders: FnbOrderResponse[] = fnbOrders.map(order => ({
      id: order.id,
      rentalSessionId: order.rentalSessionId || undefined,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.fnbOrderItems.map(item => ({
        id: item.id,
        name: item.fnbItem.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        fnbItemName: item.fnbItem.name
      })),
      sessionInfo: order.rentalSession ? {
        unitName: order.rentalSession.unit.name,
        customerName: order.rentalSession.unit.customerDisplayName || undefined
      } : undefined
    }))

    // ===== PREPARE RESPONSE =====
    const response: GetFnbOrdersResponse = {
      success: true,
      data: formattedOrders,
      pagination: {
        page: page,
        limit: limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
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

type CreateFnbOrderRequest = z.infer<typeof createFnbOrderSchema>

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
    const validatedData = createFnbOrderSchema.parse(body)

    // ===== VERIFY RENTAL SESSION IF PROVIDED =====
    if (validatedData.rentalSessionId) {
      const rentalSession = await prisma.rentalSession.findFirst({
        where: {
          id: validatedData.rentalSessionId,
          locationId: locationId,
          status: 'active'
        }
      })

      if (!rentalSession) {
        return NextResponse.json(
          { success: false, error: 'Active rental session not found' },
          { status: 404 }
        )
      }
    }

    // ===== GET F&B ITEMS AND CALCULATE TOTAL =====
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

    // Check stock availability
    for (const orderItem of validatedData.items) {
      const fnbItem = fnbItems.find(item => item.id === orderItem.fnbItemId)
      if (!fnbItem) continue

      if (fnbItem.stockQuantity < orderItem.quantity) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Insufficient stock for ${fnbItem.name}. Available: ${fnbItem.stockQuantity}, Requested: ${orderItem.quantity}` 
          },
          { status: 400 }
        )
      }
    }

    // Calculate total amount
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

    // ===== CREATE F&B ORDER =====
    const result = await prisma.$transaction(async (tx) => {
      // Create F&B order
      const fnbOrder = await tx.fnbOrder.create({
        data: {
          rentalSessionId: validatedData.rentalSessionId,
          totalAmount: totalAmount,
          status: 'completed'
        }
      })

      // Create F&B order items
      const fnbOrderItems = await Promise.all(
        orderItemsData.map(item =>
          tx.fnbOrderItem.create({
            data: {
              fnbOrderId: fnbOrder.id,
              fnbItemId: item.fnbItemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            }
          })
        )
      )

      // Update stock quantities
      await Promise.all(
        validatedData.items.map(orderItem =>
          tx.fnbItem.update({
            where: { id: orderItem.fnbItemId },
            data: {
              stockQuantity: {
                decrement: orderItem.quantity
              }
            }
          })
        )
      )

      // Create transaction if payment is immediate
      if (validatedData.paymentTiming === 'immediate') {
        await tx.transaction.create({
          data: {
            locationId: locationId,
            fnbOrderId: fnbOrder.id,
            type: 'fnb',
            amount: totalAmount,
            paymentStatus: 'paid',
            paymentMethod: 'cash',
            description: validatedData.rentalSessionId 
              ? 'F&B order (attached to session)'
              : 'F&B standalone order'
          }
        })
      }

      return { fnbOrder, fnbOrderItems }
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.fnbOrder.id,
        totalAmount: totalAmount,
        itemCount: validatedData.items.length,
        paymentStatus: validatedData.paymentTiming === 'immediate' ? 'paid' : 'pending'
      },
      message: 'F&B order created successfully'
    })

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