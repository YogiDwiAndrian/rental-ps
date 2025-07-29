import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// ============================================
// TYPES
// ============================================

interface CreateOrderItem {
  fnb_item_id: string
  quantity: number
}

interface CreateFnbOrderRequest {
  items: CreateOrderItem[]
  rental_session_id?: string
  payment_timing: 'immediate' | 'end_of_session'
  payment_method: 'cash' | 'card' | 'digital_wallet'
  notes?: string
}

interface CreatedOrderResponse {
  orderId: string
  items: Array<{
    id: string
    fnbItemId: string
    fnbItemName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  totalAmount: number
  status: string
  paymentTiming: string
  rentalSessionId?: string
  notes?: string
  createdAt: string
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function decimalToNumber(decimal: Decimal): number {
  return parseFloat(decimal.toString())
}

function numberToDecimal(num: number): Decimal {
  return new Decimal(num)
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // ===== AUTHENTICATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ===== GET LOCATION ID FROM HEADER =====
    const locationId = request.headers.get('X-Location-ID')
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID header is required' },
        { status: 400 }
      )
    }

    // ===== PARSE REQUEST BODY =====
    const body: CreateFnbOrderRequest = await request.json()
    
    // Validate required fields
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      )
    }

    if (!body.payment_timing || !body.payment_method) {
      return NextResponse.json(
        { success: false, error: 'Payment timing and method are required' },
        { status: 400 }
      )
    }

    // ===== AUTHORIZATION =====
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        tenant: true,
        locationAssignments: {
          include: { location: true }
        }
      }
    })

    if (!user?.tenant) {
      return NextResponse.json(
        { success: false, error: 'User not associated with any tenant' },
        { status: 403 }
      )
    }

    // Check location access
    const hasLocationAccess = user.role === 'owner' || 
      user.locationAssignments.some(assignment => assignment.locationId === locationId)

    if (!hasLocationAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this location' },
        { status: 403 }
      )
    }

    // ===== VALIDATE RENTAL SESSION (if provided) =====
    if (body.rental_session_id) {
      const rentalSession = await prisma.rentalSession.findFirst({
        where: {
          id: body.rental_session_id,
          locationId: locationId,
          status: 'active'
        }
      })

      if (!rentalSession) {
        return NextResponse.json(
          { success: false, error: 'Invalid or inactive rental session' },
          { status: 400 }
        )
      }
    }

    // ===== VALIDATE F&B ITEMS AND CALCULATE TOTALS =====
    const fnbItems = await prisma.fnbItem.findMany({
      where: {
        id: { in: body.items.map(item => item.fnb_item_id) },
        locationId: locationId,
        isActive: true
      }
    })

    if (fnbItems.length !== body.items.length) {
      return NextResponse.json(
        { success: false, error: 'One or more F&B items not found or inactive' },
        { status: 400 }
      )
    }

    // Check stock availability and calculate amounts
    const orderItems: Array<{
      fnbItem: typeof fnbItems[0]
      quantity: number
      unitPrice: number
      totalPrice: number
    }> = []

    let totalOrderAmount = 0

    for (const requestItem of body.items) {
      const fnbItem = fnbItems.find(item => item.id === requestItem.fnb_item_id)
      
      if (!fnbItem) {
        return NextResponse.json(
          { success: false, error: `F&B item ${requestItem.fnb_item_id} not found` },
          { status: 400 }
        )
      }

      if (fnbItem.stockQuantity < requestItem.quantity) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Insufficient stock for ${fnbItem.name}. Available: ${fnbItem.stockQuantity}, Requested: ${requestItem.quantity}` 
          },
          { status: 400 }
        )
      }

      const unitPrice = decimalToNumber(fnbItem.sellingPrice)
      const totalPrice = unitPrice * requestItem.quantity

      orderItems.push({
        fnbItem,
        quantity: requestItem.quantity,
        unitPrice,
        totalPrice
      })

      totalOrderAmount += totalPrice
    }

    // ===== CREATE ORDER IN TRANSACTION =====
    const result = await prisma.$transaction(async (tx) => {
      // Create F&B Order
      const fnbOrder = await tx.fnbOrder.create({
        data: {
          rentalSessionId: body.rental_session_id || null,
          totalAmount: numberToDecimal(totalOrderAmount),
          status: 'pending' // Default status for new orders
        }
      })

      // Create Order Items and Update Stock
      const createdOrderItems = []
      
      for (const orderItem of orderItems) {
        // Create order item
        const fnbOrderItem = await tx.fnbOrderItem.create({
          data: {
            fnbOrderId: fnbOrder.id,
            fnbItemId: orderItem.fnbItem.id,
            quantity: orderItem.quantity,
            unitPrice: numberToDecimal(orderItem.unitPrice),
            totalPrice: numberToDecimal(orderItem.totalPrice)
          }
        })

        // Update stock quantity
        await tx.fnbItem.update({
          where: { id: orderItem.fnbItem.id },
          data: {
            stockQuantity: {
              decrement: orderItem.quantity
            }
          }
        })

        createdOrderItems.push({
          id: fnbOrderItem.id,
          fnbItemId: orderItem.fnbItem.id,
          fnbItemName: orderItem.fnbItem.name,
          quantity: orderItem.quantity,
          unitPrice: orderItem.unitPrice,
          totalPrice: orderItem.totalPrice
        })
      }

      // Create Transaction Record (if payment is immediate)
      if (body.payment_timing === 'immediate') {
        await tx.transaction.create({
          data: {
            locationId: locationId,
            fnbOrderId: fnbOrder.id,
            type: 'fnb',
            amount: numberToDecimal(totalOrderAmount),
            paymentStatus: 'paid',
            paymentMethod: body.payment_method,
            description: body.notes || `F&B Order - ${createdOrderItems.length} items`
          }
        })

        // Update order status to completed for immediate payment
        await tx.fnbOrder.update({
          where: { id: fnbOrder.id },
          data: { status: 'completed' }
        })
      }

      return {
        fnbOrder,
        createdOrderItems
      }
    })

    // ===== PREPARE RESPONSE =====
    const responseData: CreatedOrderResponse = {
      orderId: result.fnbOrder.id,
      items: result.createdOrderItems,
      totalAmount: totalOrderAmount,
      status: result.fnbOrder.status,
      paymentTiming: body.payment_timing,
      rentalSessionId: body.rental_session_id,
      notes: body.notes,
      createdAt: result.fnbOrder.createdAt.toISOString()
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'F&B order created successfully'
    })

  } catch (error) {
    console.error('Create F&B Order API Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}