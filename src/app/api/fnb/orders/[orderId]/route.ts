import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decimalToNumber } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

interface FnbOrderItem {
  id: string
  fnbItemId: string
  fnbItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface FnbOrderDetail {
  id: string
  items: FnbOrderItem[]
  totalAmount: number
  status: string
  paymentTiming: 'immediate' | 'end_of_session'
  rentalSessionId?: string
  customerName?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// ============================================
// GET: FETCH ORDER DETAIL
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // ===== AUTHENTICATION & AUTHORIZATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is staff or owner
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
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      )
    }

    const { orderId } = params

    // ===== FETCH ORDER DETAIL =====
    const order = await prisma.fnbOrder.findFirst({
      where: {
        id: orderId,
        // Ensure order belongs to the location
        fnbOrderItems: {
          some: {
            fnbItem: {
              locationId: locationId
            }
          }
        }
      },
      include: {
        fnbOrderItems: {
          include: {
            fnbItem: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        rentalSession: {
          include: {
            unit: {
              select: {
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
            amount: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // ===== DETERMINE PAYMENT TIMING =====
    // Check if there's an immediate transaction
    const hasImmediateTransaction = order.transactions.length > 0
    const paymentTiming: 'immediate' | 'end_of_session' = hasImmediateTransaction 
      ? 'immediate' 
      : 'end_of_session'

    // ===== PREPARE ORDER ITEMS =====
    const orderItems: FnbOrderItem[] = order.fnbOrderItems.map(item => ({
      id: item.id,
      fnbItemId: item.fnbItemId,
      fnbItemName: item.fnbItem.name,
      quantity: item.quantity,
      unitPrice: decimalToNumber(item.unitPrice),
      totalPrice: decimalToNumber(item.totalPrice)
    }))

    // ===== PREPARE RESPONSE =====
    const responseData: FnbOrderDetail = {
      id: order.id,
      items: orderItems,
      totalAmount: decimalToNumber(order.totalAmount),
      status: order.status,
      paymentTiming: paymentTiming,
      rentalSessionId: order.rentalSessionId || undefined,
      customerName: order.rentalSession?.unit?.customerDisplayName || undefined,
      notes: undefined, // Add this field to schema if needed
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Get F&B Order Detail API Error:', error)
    
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