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

    // Get tenant and first active location
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
            customerPageConfig: {
              where: {
                isActive: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc' // Get the first/main location
          },
          take: 1 // For now, just get the first location
        }
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    if (tenant.locations.length === 0) {
      return NextResponse.json(
        { error: 'No public locations found' },
        { status: 404 }
      )
    }

    const location = tenant.locations[0]
    const config = location.customerPageConfig[0] // Get first config if exists

    // Build location data with priority: config > location > tenant
    const locationData = {
      name: location.name,
      address: config?.publicAddress || location.address,
      phone: config?.publicPhone || location.phone || tenant.phone,
      whatsapp: config?.whatsappNumber,
      email: config?.publicEmail || location.email,
      description: location.publicDescription,
      operationalHours: location.operationalHours as Record<string, { open: string; close: string }> || {}
    }

    const response = NextResponse.json({
      success: true,
      data: {
        location: locationData,
        tenant: {
          name: tenant.name,
          subdomain: tenant.subdomain
        },
        lastUpdated: new Date().toISOString()
      }
    })

    // Cache for 10 minutes since location data doesn't change frequently
    response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200')
    
    return response

  } catch (error) {
    console.error('Error fetching location data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}