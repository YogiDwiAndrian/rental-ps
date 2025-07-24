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
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    // Validate subdomain
    if (!subdomain || subdomain.length < 2) {
      return NextResponse.json(
        { error: 'Invalid subdomain' },
        { status: 400 }
      )
    }

    // Build location filter - FIXED: Use proper where clause
    const locationWhereClause = locationId 
      ? { 
          isActive: true,
          showOnCustomerPage: true,
          id: locationId  // Filter specific location
        }
      : { 
          isActive: true,
          showOnCustomerPage: true 
        }

    // Get tenant and units data
    const tenant = await prisma.tenant.findUnique({
      where: { 
        subdomain: subdomain,
        isActive: true,
        customerPageEnabled: true
      },
      include: {
        locations: {
          where: locationWhereClause,
          include: {
            units: {
              where: { 
                isActive: true,
                showOnCustomerPage: true 
              },
              include: {
                rentalSessions: {
                  where: {
                    status: 'active'
                  },
                  select: {
                    id: true,
                    startTime: true,
                    endTime: true,
                    purchasedDuration: true,
                    extendedDuration: true,
                    billingModel: true
                  }
                }
              }
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

    // If locationId specified but no locations found, return error
    if (locationId && tenant.locations.length === 0) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Calculate remaining time and include all unit data
    const unitsWithStatus = tenant.locations.flatMap(location => 
      location.units.map(unit => {
        let remainingMinutes: number | null = null
        let estimatedEndTime: Date | null = null

        // Calculate remaining time for occupied units
        if (unit.status === 'occupied' && unit.rentalSessions.length > 0) {
          const activeSession = unit.rentalSessions[0]
          const now = new Date()
          
          if (activeSession.billingModel === 'timer') {
            // Timer billing - no specific end time
            remainingMinutes = null
          } else {
            // Hourly/Package billing - calculate end time
            const totalDuration = (activeSession.purchasedDuration || 0) + activeSession.extendedDuration
            estimatedEndTime = new Date(activeSession.startTime.getTime() + totalDuration * 60000)
            remainingMinutes = Math.max(0, Math.floor((estimatedEndTime.getTime() - now.getTime()) / 60000))
          }
        }

        return {
          id: unit.id,
          name: unit.customerDisplayName || unit.name,
          consoleType: unit.consoleType,
          controllerCount: unit.controllerCount,
          status: unit.status,
          hourlyRate: Number(unit.hourlyRate),
          remainingMinutes,
          estimatedEndTime,
          customerDisplayName: unit.customerDisplayName,
          locationName: location.name,
          locationId: location.id,
          // Include specifications and package rates
          specifications: unit.specifications || {},
          packageRates: unit.packageRates || {}
        }
      })
    )

    // Add cache headers for short-term caching
    const response = NextResponse.json({
      success: true,
      data: {
        units: unitsWithStatus,
        locationFilter: locationId ? { locationId, locationName: tenant.locations[0]?.name } : null,
        lastUpdated: new Date().toISOString(),
        tenant: {
          name: tenant.name,
          subdomain: tenant.subdomain
        }
      }
    })

    // Cache for 30 seconds
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
    
    return response

  } catch (error) {
    console.error('Error fetching units data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}