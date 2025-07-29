import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// ============================================
// TYPES
// ============================================

interface FnbItem {
  id: string
  name: string
  description?: string
  price: number
  stockQuantity: number
  unitType: string
  categoryName: string
  isAvailable: boolean
}

interface FnbCategory {
  id: string
  name: string
  items: FnbItem[]
}

interface FnbItemsResponse {
  categories: FnbCategory[]
  totalItems: number
  availableItems: number
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function decimalToNumber(decimal: Decimal): number {
  return parseFloat(decimal.toString())
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

    // Fetch F&B Categories and Items for the specific location
    const categoriesData = await prisma.fnbCategory.findMany({
      where: {
        locationId: locationId,
        location: {
          tenantId: user.tenant.id
        },
        isActive: true
      },
      include: {
        fnbItems: {
          where: {
            isActive: true
          },
          orderBy: [
            { displayOrder: 'asc' },
            { name: 'asc' }
          ]
        }
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    // ===== DATA TRANSFORMATION =====

    // Transform categories and items
    const categories: FnbCategory[] = categoriesData.map(category => ({
      id: category.id,
      name: category.name,
      items: category.fnbItems.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        price: decimalToNumber(item.sellingPrice),
        stockQuantity: item.stockQuantity,
        unitType: item.unitType,
        categoryName: category.name,
        isAvailable: item.isActive && item.stockQuantity > 0
      }))
    }))

    // Calculate totals
    const totalItems = categories.reduce((total, category) => 
      total + category.items.length, 0
    )
    
    const availableItems = categories.reduce((total, category) => 
      total + category.items.filter(item => item.isAvailable).length, 0
    )

    // ===== RESPONSE =====
    const responseData: FnbItemsResponse = {
      categories,
      totalItems,
      availableItems
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('F&B Items API Error:', error)
    
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