// src/app/api/public/[subdomain]/locations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    subdomain: string
  }>
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

    // Get tenant and all its public locations
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
            units: {
              where: { 
                isActive: true,
                showOnCustomerPage: true 
              },
              select: {
                id: true,
                status: true
              }
            },
            fnbItems: {
              where: { 
                isActive: true,
                showOnCustomerPage: true 
              },
              select: {
                id: true,
                stockQuantity: true
              }
            },
            whatsappContacts: {
              where: {
                isActive: true
              },
              select: {
                id: true,
                name: true,
                role: true,
                isPrimary: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc' // First location = default
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

    // Transform locations data
    const locationsData = tenant.locations.map(location => ({
      id: location.id,
      name: location.name,
      code: location.code,
      address: location.address,
      phone: location.phone,
      email: location.email,
      publicDescription: location.publicDescription,
      operationalHours: location.operationalHours as Record<string, { open: string; close: string }> || {},
      latitude: location.latitude ? Number(location.latitude) : undefined,
      longitude: location.longitude ? Number(location.longitude) : undefined,
      
      // Stats for location selector
      stats: {
        totalUnits: location.units.length,
        availableUnits: location.units.filter(u => u.status === 'available').length,
        occupiedUnits: location.units.filter(u => u.status === 'occupied').length,
        totalFnbItems: location.fnbItems.length,
        availableFnbItems: location.fnbItems.filter(item => item.stockQuantity > 0).length,
        totalContacts: location.whatsappContacts.length,
        primaryContacts: location.whatsappContacts.filter(c => c.isPrimary).length
      }
    }))

    const response = NextResponse.json({
      success: true,
      data: {
        tenant: {
          name: tenant.name,
          subdomain: tenant.subdomain
        },
        locations: locationsData,
        defaultLocation: locationsData[0] || null, // First location is default
        hasMultipleLocations: locationsData.length > 1,
        locationCount: locationsData.length,
        lastUpdated: new Date().toISOString()
      }
    })

    // Cache for 10 minutes (locations don't change frequently)
    response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200')
    
    return response

  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}