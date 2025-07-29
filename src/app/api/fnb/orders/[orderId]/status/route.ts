import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ============================================
// TYPES & VALIDATION (SIMPLIFIED)
// ============================================

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']),
  reason: z.string().optional(),
  restore_stock: z.boolean().default(false),
  notes: z.string().optional()
})

type UpdateStatusRequest = z.infer<typeof updateStatusSchema>

interface UpdateStatusResponse {
  orderId: string
  previousStatus: string
  newStatus: string
  updatedAt: string
  restoredItems?: Array<{
    itemId: string
    itemName: string
    restoredQuantity: number
  }>
}

// ============================================
// VALIDATION FUNCTIONS (SIMPLIFIED)
// ============================================

const isValidStatusTransition = (
  currentStatus: string, 
  newStatus: string
): boolean => {
  const validTransitions: Record<string, string[]> = {
    pending: ['completed', 'cancelled'],
    completed: ['cancelled'], // For refund scenarios
    cancelled: [] // No transitions from cancelled
  }

  return validTransitions[currentStatus]?.includes(newStatus) || false
}

// ============================================
// PATCH: UPDATE ORDER STATUS
// ============================================

export async function PATCH(
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

    // ===== VALIDATE REQUEST BODY =====
    const body = await request.json()
    const validatedData = updateStatusSchema.parse(body)

    const { orderId } = params

    // ===== FIND ORDER =====
    const existingOrder = await prisma.fnbOrder.findFirst({
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
                name: true,
                stockQuantity: true
              }
            }
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
        }
      }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // ===== VALIDATE STATUS TRANSITION =====
    if (!isValidStatusTransition(existingOrder.status, validatedData.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid status transition from ${existingOrder.status} to ${validatedData.status}` 
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
      // Update order status
      const updatedOrder = await tx.fnbOrder.update({
        where: { id: orderId },
        data: {
          status: validatedData.status,
          updatedAt: new Date()
        }
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

      // Use appropriate event type based on new status
      const eventType = validatedData.status === 'cancelled' 
        ? 'FNB_ORDER_CANCELLED' 
        : 'FNB_ORDER_CREATED' // Temporary until FNB_ORDER_UPDATED is added

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
            notes: validatedData.notes,
            restoredItems: restoredItems.length > 0 ? restoredItems : undefined,
            statusChangeDescription: validatedData.status === 'cancelled' 
              ? `Order cancelled: ${validatedData.reason}`
              : `Status changed from ${existingOrder.status} to ${validatedData.status}`
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
      restoredItems: result.restoredItems.length > 0 ? result.restoredItems : undefined
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: `Order ${validatedData.status}!`
    })

  } catch (error) {
    console.error('Update F&B Order Status API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues
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