// src/app/api/rentals/[sessionId]/fnb-orders/route.ts - Fetch F&B Orders for Session
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  sessionId: string
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const { sessionId } = await context.params
    const searchParams = request.nextUrl.searchParams
    const locationId = searchParams.get('locationId')

    if (!locationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Location ID is required' 
      }, { status: 400 })
    }

    // Verify user has access to this location
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        tenant: {
          users: {
            some: { id: session.user.id }
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json({ 
        success: false, 
        error: 'Location not found or access denied' 
      }, { status: 404 })
    }

    // Verify session exists and belongs to location
    const rentalSession = await prisma.rentalSession.findFirst({
      where: {
        id: sessionId,
        locationId: locationId
      }
    })

    if (!rentalSession) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found' 
      }, { status: 404 })
    }

    // Fetch F&B orders attached to this session
    const fnbOrders = await prisma.fnbOrder.findMany({
      where: {
        rentalSessionId: sessionId,
        status: { not: 'cancelled' }
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
      }
    })

    // Transform orders to include payment timing and item details
    const transformedOrders = fnbOrders.map(order => {
      // Determine payment timing based on transaction existence
      const hasImmediateTransaction = order.transactions.length > 0 && 
        order.transactions[0].paymentStatus === 'paid'
      
      const paymentTiming: 'immediate' | 'end_of_session' = hasImmediateTransaction 
        ? 'immediate' 
        : 'end_of_session'

      // Transform order items
      const items = order.fnbOrderItems.map(item => ({
        id: item.id,
        fnbItemId: item.fnbItemId,
        fnbItemName: item.fnbItem.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice)
      }))

      return {
        id: order.id,
        totalAmount: Number(order.totalAmount),
        status: order.status,
        paymentTiming,
        items,
        createdAt: order.createdAt.toISOString(),
        paidAt: hasImmediateTransaction ? order.transactions[0].createdAt.toISOString() : undefined
      }
    })

    console.log(`📊 Found ${transformedOrders.length} F&B orders for session ${sessionId}`)

    return NextResponse.json({
      success: true,
      data: transformedOrders
    })

  } catch (error) {
    console.error('❌ Error fetching session F&B orders:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}