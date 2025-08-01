// src/app/api/fnb/orders/[orderId]/status/route.ts - FIXED with stockRestored
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']),
  reason: z.string().optional(),
  restore_stock: z.boolean().optional().default(false),
  notes: z.string().optional()
})

// ============================================
// TYPES
// ============================================

interface RouteParams {
  orderId: string
}

interface UpdateStatusResponse {
  orderId: string
  previousStatus: string
  newStatus: string
  updatedAt: string
  stockRestored?: boolean
  restoredItems?: Array<{
    itemId: string
    itemName: string
    restoredQuantity: number
  }>
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const isOrderTooOldToModify = (createdAt: Date): boolean => {
  const now = new Date()
  const diffInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  return diffInHours > 24
}

const getOrderAge = (createdAt: Date): string => {
  const now = new Date()
  const diffInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60)
    return `${diffInMinutes} minutes ago`
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} hours ago`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
): Promise<NextResponse> {
  try {
    const { orderId } = await context.params
    const locationId = request.headers.get('X-Location-ID')

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID header is required' },
        { status: 400 }
      )
    }

    // ===== AUTHENTICATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ===== VALIDATE REQUEST BODY =====
    const body = await request.json()
    const validatedData = updateStatusSchema.parse(body)

    // ===== CHECK ORDER EXISTS =====
    const existingOrder = await prisma.fnbOrder.findFirst({
      where: { 
        id: orderId,
        // REMOVED: location restriction since FnbOrder doesn't have locationId directly
      },
      include: {
        fnbOrderItems: {
          include: {
            fnbItem: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'F&B Order not found' },
        { status: 404 }
      )
    }

    // ===== DATE RESTRICTION VALIDATION =====
    const orderAge = getOrderAge(existingOrder.createdAt)
    
    if (isOrderTooOldToModify(existingOrder.createdAt)) {
      return NextResponse.json(
        {
          success: false,
          error: `Orders cannot be modified after 24 hours from creation. This order was created ${orderAge}.`,
          details: 'ORDER_TOO_OLD_TO_MODIFY'
        },
        { status: 400 }
      )
    }

    // ===== VALIDATE STATUS TRANSITION =====
    if (existingOrder.status === validatedData.status) {
      return NextResponse.json(
        { success: false, error: 'Order already has this status' },
        { status: 400 }
      )
    }

    // Validate allowed status transitions
    const allowedTransitions: Record<string, string[]> = {
      'pending': ['completed', 'cancelled'],
      'completed': ['cancelled'], // For refund scenarios
      'cancelled': [] // No transitions from cancelled
    }

    const validTransitions = allowedTransitions[existingOrder.status] || []
    if (!validTransitions.includes(validatedData.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot change status from ${existingOrder.status} to ${validatedData.status}` 
        },
        { status: 400 }
      )
    }

    // ===== VALIDATION FOR CANCELLATION =====
    if (validatedData.status === 'cancelled' && !validatedData.reason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Reason is required for cancellation' },
        { status: 400 }
      )
    }

    // ===== UPDATE ORDER IN TRANSACTION =====
    const result = await prisma.$transaction(async (tx) => {
      // FIXED: Update order status with ALL cancellation info including stockRestored
      const updateData: {
        status: string
        updatedAt: Date
        cancellationReason?: string
        cancelledAt?: Date
        cancelledBy?: string
        stockRestored?: boolean  // NEW: Save stock restoration info
      } = {
        status: validatedData.status,
        updatedAt: new Date()
      }

      // Add cancellation fields if status is being set to cancelled
      if (validatedData.status === 'cancelled') {
        updateData.cancellationReason = validatedData.reason
        updateData.cancelledAt = new Date()
        updateData.cancelledBy = session.user.id
        updateData.stockRestored = validatedData.restore_stock  // FIXED: Save restore stock decision
      }

      const updatedOrder = await tx.fnbOrder.update({
        where: { id: orderId },
        data: updateData
      })

      // Restore stock if cancelling and restore_stock is true
      const restoredItems: Array<{
        itemId: string
        itemName: string
        restoredQuantity: number
      }> = []

      if (validatedData.status === 'cancelled' && validatedData.restore_stock) {
        for (const orderItem of existingOrder.fnbOrderItems) {
          await tx.fnbItem.update({
            where: { id: orderItem.fnbItemId },
            data: {
              stockQuantity: {
                increment: orderItem.quantity
              }
            }
          })

          restoredItems.push({
            itemId: orderItem.fnbItemId,
            itemName: orderItem.fnbItem.name,
            restoredQuantity: orderItem.quantity
          })
        }
      }

      // Create audit log for status change
      const errorMessage = validatedData.status === 'cancelled' 
        ? `F&B Order cancelled: ${validatedData.reason}`
        : null

      const eventType = validatedData.status === 'cancelled' 
        ? 'FNB_ORDER_CANCELLED' 
        : 'FNB_ORDER_UPDATED'

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
          locationId: locationId,
          eventType: eventType,
          severity: validatedData.status === 'cancelled' ? 'MEDIUM' : 'LOW',
          errorMessage: errorMessage,
          ipAddress: 'system',
          resourceType: 'fnb_order',
          resourceId: orderId,
          metadata: {
            orderId: orderId,
            previousStatus: existingOrder.status,
            newStatus: validatedData.status,
            reason: validatedData.reason,
            restoreStock: validatedData.restore_stock,
            stockRestored: validatedData.restore_stock, // FIXED: Also save in metadata
            notes: validatedData.notes,
            restoredItems: restoredItems.length > 0 ? restoredItems : undefined,
            orderAge: orderAge,
            statusChangeDescription: validatedData.status === 'cancelled' 
              ? `Order cancelled: ${validatedData.reason}`
              : `Status changed from ${existingOrder.status} to ${validatedData.status}`,
            updatedBy: session.user.name || session.user.email
          }
        }
      })

      return {
        updatedOrder,
        restoredItems
      }
    })

    // ===== PREPARE RESPONSE =====
    const responseData: UpdateStatusResponse = {
      orderId: orderId,
      previousStatus: existingOrder.status,
      newStatus: validatedData.status,
      updatedAt: result.updatedOrder.updatedAt.toISOString(),
      stockRestored: validatedData.status === 'cancelled' ? validatedData.restore_stock : undefined,
      restoredItems: result.restoredItems.length > 0 ? result.restoredItems : undefined
    }

    console.log(`✅ F&B Order status updated:`, {
      orderId,
      previousStatus: existingOrder.status,
      newStatus: validatedData.status,
      stockRestored: validatedData.restore_stock,
      updatedBy: session.user.name || session.user.email,
      orderAge,
      restoredItemsCount: result.restoredItems.length
    })

    return NextResponse.json({
      success: true,
      data: responseData,
      message: `Order ${validatedData.status}!`
    })

  } catch (error) {
    console.error('❌ Update F&B Order Status API Error:', error)

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
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}