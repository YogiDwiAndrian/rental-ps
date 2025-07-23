// src/app/api/public/[subdomain]/fnb/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    subdomain: string
  }>
}

// Define types for better type safety
interface FnbItem {
  id: string
  name: string
  description: string | null
  price: number
  stockQuantity: number
  isAvailable: boolean
  unitType: string
  locationName: string
}

interface CategoryGroup {
  categoryName: string
  items: FnbItem[]
  locationName: string
}

interface LowStockItem {
  id: string
  name: string
  stockQuantity: number
  minStockAlert: number
  locationName: string
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { subdomain } = await params

    // Validate subdomain
    if (!subdomain || subdomain.length < 2) {
      return NextResponse.json(
        { error: 'Invalid subdomain' },
        { status: 400 }
      )
    }

    // Get tenant and F&B data
    const tenant = await prisma.tenant.findUnique({
      where: { 
        subdomain: subdomain,
        isActive: true,
        customerPageEnabled: true
      },
      include: {
        locations: {
          where: { 
            isActive: true,
            showOnCustomerPage: true 
          },
          include: {
            fnbItems: {
              where: { 
                isActive: true,
                showOnCustomerPage: true 
              },
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    displayOrder: true
                  }
                }
              },
              orderBy: [
                { displayOrder: 'asc' },
                { name: 'asc' }
              ]
            },
            fnbCategories: {
              where: {
                isActive: true
              },
              orderBy: [
                { displayOrder: 'asc' },
                { name: 'asc' }
              ]
            }
          }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Organize F&B items by category with proper typing
    const categorizedItems: CategoryGroup[] = []

    for (const location of tenant.locations) {
      // Group items by category for this location
      const categoryMap = new Map<string, FnbItem[]>()

      for (const item of location.fnbItems) {
        const categoryName = item.category?.name || 'Uncategorized'
        
        const fnbItem: FnbItem = {
          id: item.id,
          name: item.customerDisplayName || item.name,
          description: item.customerDescription || item.description,
          price: Number(item.sellingPrice),
          stockQuantity: item.stockQuantity,
          isAvailable: item.stockQuantity > 0,
          unitType: item.unitType,
          locationName: location.name
        }

        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, [])
        }
        
        categoryMap.get(categoryName)!.push(fnbItem)
      }

      // Convert map to array format
      for (const [categoryName, items] of categoryMap.entries()) {
        categorizedItems.push({
          categoryName,
          items,
          locationName: location.name
        })
      }
    }

    // Get low stock alerts with proper typing
    const lowStockItems: LowStockItem[] = []

    for (const location of tenant.locations) {
      for (const item of location.fnbItems) {
        if (item.stockQuantity <= item.minStockAlert && item.stockQuantity > 0) {
          lowStockItems.push({
            id: item.id,
            name: item.customerDisplayName || item.name,
            stockQuantity: item.stockQuantity,
            minStockAlert: item.minStockAlert,
            locationName: location.name
          })
        }
      }
    }

    const response = NextResponse.json({
      success: true,
      data: {
        categories: categorizedItems,
        lowStockItems,
        lastUpdated: new Date().toISOString(),
        tenant: {
          name: tenant.name,
          subdomain: tenant.subdomain
        }
      }
    })

    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    
    return response

  } catch (error) {
    console.error('Error fetching F&B data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}