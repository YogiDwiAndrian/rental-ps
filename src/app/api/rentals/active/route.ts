// src/app/api/rentals/active/route.ts - CLEAN VERSION
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

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

    // Fetch active rental sessions with unit data
    const activeSessions = await prisma.rentalSession.findMany({
      where: {
        locationId: locationId,
        status: 'active'
      },
      include: {
        unit: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
            customerDisplayName: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    })

    // Transform sessions to match client interface
    const transformedSessions = activeSessions.map(session => {
      // Get hourlyRate from unit (only source available)
      const hourlyRate = Number(session.unit.hourlyRate)
      
      // Calculate current status and remaining time
      const now = new Date()
      const startTime = new Date(session.startTime)
      
      // Calculate estimated end time if we have purchased duration
      let estimatedEndTime: Date | undefined
      let remainingMinutes: number | undefined
      let isOvertime = false
      
      // Only calculate for sessions with purchased duration (hourly/package billing)
      if (session.purchasedDuration && session.purchasedDuration > 0) {
        const totalMinutes = session.purchasedDuration + (session.extendedDuration || 0)
        estimatedEndTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000)
        
        const remainingMs = estimatedEndTime.getTime() - now.getTime()
        remainingMinutes = Math.floor(remainingMs / (1000 * 60))
        isOvertime = remainingMs < 0
        
        // If overtime, show as positive number
        if (isOvertime) {
          remainingMinutes = Math.abs(remainingMinutes)
        }
      }

      // Debug logging for development
      console.log('💰 Session Rate Resolution:', {
        sessionId: session.id,
        unitName: session.unit.name,
        hourlyRate: hourlyRate,
        isOvertime,
        remainingMinutes
      })

      return {
        sessionId: session.id,
        unitId: session.unitId,
        unitName: session.unit.name,
        billingModel: session.billingModel,
        startTime: session.startTime.toISOString(),
        estimatedEndTime: estimatedEndTime?.toISOString(),
        remainingMinutes,
        totalAmount: session.totalAmount ? Number(session.totalAmount) : undefined,
        isOvertime,
        purchasedDuration: session.purchasedDuration,
        extendedDuration: session.extendedDuration,
        hourlyRate: hourlyRate,
        customerName: session.unit.customerDisplayName
      }
    })

    console.log(`📊 Found ${transformedSessions.length} active sessions`)

    return NextResponse.json({
      success: true,
      data: transformedSessions
    })

  } catch (error) {
    console.error('❌ Error fetching active sessions:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}