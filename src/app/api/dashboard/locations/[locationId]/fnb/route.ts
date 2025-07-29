import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// ============================================
// TYPES (SIMPLIFIED)
// ============================================

interface FnbItem {
  id: string
  name: string
  description?: string
  price: number
  stockQuantity: number
  minStockAlert: number
  unitType: string
  categoryName: string
  isAvailable: boolean
}

interface FnbCategory {
  id: string
  name: string
  items: FnbItem[]
}

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
  customerName?: string
  notes?: string
  createdAt: string
}

interface TodayStats {
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
}

interface FnbDashboardData {
  categories: FnbCategory[]
  recentOrders: FnbOrder[]
  lowStockItems: FnbItem[]
  todayStats: TodayStats
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function decimalToNumber(decimal: Decimal): number {
  return parseFloat(decimal.toString())
}

function getStartOfDay(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function getEndOfDay(): Date {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return today
}

// ============================================
// MAIN HANDLER
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    // ===== AUTHENTICATION =====
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ===== AWAIT PARAMS =====
    const resolvedParams = await params
    const locationId = resolvedParams.locationId
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
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

    // ===== DATA FETCHING =====

    // 1. Fetch F&B Categories with Items
    const categories = await prisma.fnbCategory.findMany({
      where: {
        locationId: locationId,
        isActive: true
      },
      include: {
        fnbItems: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        }
      },
      orderBy: { displayOrder: 'asc' }
    })

    // 2. Recent F&B Orders (last 50 orders)
    const recentOrdersData = await prisma.fnbOrder.findMany({
      where: {
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
            paymentStatus: true
          },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // 3. Today's Statistics
    const startOfDay = getStartOfDay()
    const endOfDay = getEndOfDay()

    const [todayOrdersCount, todayRevenue, pendingOrdersCount] = await Promise.all([
      // Total orders today
      prisma.fnbOrder.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          fnbOrderItems: {
            some: {
              fnbItem: {
                locationId: locationId
              }
            }
          }
        }
      }),

      // Total revenue today
      prisma.fnbOrder.aggregate({
        _sum: {
          totalAmount: true
        },
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: { not: 'cancelled' },
          fnbOrderItems: {
            some: {
              fnbItem: {
                locationId: locationId
              }
            }
          }
        }
      }),

      // Pending orders count
      prisma.fnbOrder.count({
        where: {
          status: 'pending',
          fnbOrderItems: {
            some: {
              fnbItem: {
                locationId: locationId
              }
            }
          }
        }
      })
    ])

    // ===== TRANSFORM DATA =====

    // Transform categories and items
    const transformedCategories: FnbCategory[] = categories.map(category => ({
      id: category.id,
      name: category.name,
      items: category.fnbItems.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        price: decimalToNumber(item.sellingPrice),
        stockQuantity: item.stockQuantity,
        minStockAlert: item.minStockAlert,
        unitType: item.unitType,
        categoryName: category.name,
        isAvailable: item.stockQuantity > 0
      }))
    }))

    // Transform recent orders
    const recentOrders: FnbOrder[] = recentOrdersData.map(order => {
      // Determine payment timing
      const hasImmediateTransaction = order.transactions.some(t => t.paymentStatus === 'paid')
      const paymentTiming: 'immediate' | 'end_of_session' = hasImmediateTransaction 
        ? 'immediate' 
        : 'end_of_session'

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
        customerName: order.rentalSession?.unit?.customerDisplayName || undefined,
        notes: undefined, // Schema doesn't have notes field yet
        createdAt: order.createdAt.toISOString()
      }
    })

    // Find low stock items
    const lowStockItems: FnbItem[] = []
    transformedCategories.forEach(category => {
      category.items.forEach(item => {
        if (item.stockQuantity <= item.minStockAlert && item.stockQuantity > 0) {
          lowStockItems.push(item)
        }
      })
    })

    // Prepare today's stats
    const todayStats: TodayStats = {
      totalOrders: todayOrdersCount,
      totalRevenue: decimalToNumber(todayRevenue._sum.totalAmount || new Decimal(0)),
      pendingOrders: pendingOrdersCount
    }

    // ===== RESPONSE =====
    const responseData: FnbDashboardData = {
      categories: transformedCategories,
      recentOrders,
      lowStockItems,
      todayStats
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('F&B Dashboard API Error:', error)
    
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