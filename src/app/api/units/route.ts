// src/app/api/units/route.ts - Enhanced for real-time status
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SessionStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // Get units with current session info
    const units = await prisma.unit.findMany({
      where: {
        locationId: locationId,
        isActive: true
      },
      include: {
        rentalSessions: {
          where: {
            status: SessionStatus.active
          },
          select: {
            id: true,
            startTime: true,
            purchasedDuration: true,
            extendedDuration: true
          },
          take: 1
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform data for frontend
    const transformedUnits = units.map(unit => {
      const activeSession = unit.rentalSessions[0]
      let currentSession: { sessionId: string; remainingMinutes?: number } | undefined

      if (activeSession) {
        const totalDuration = activeSession.purchasedDuration + activeSession.extendedDuration
        
        if (totalDuration > 0) {
          const estimatedEnd = new Date(activeSession.startTime.getTime() + totalDuration * 60 * 1000)
          const remainingMs = estimatedEnd.getTime() - new Date().getTime()
          const remainingMinutes = Math.max(0, Math.floor(remainingMs / (1000 * 60)))
          
          currentSession = {
            sessionId: activeSession.id,
            remainingMinutes
          }
        } else {
          currentSession = {
            sessionId: activeSession.id
          }
        }
      }

      return {
        id: unit.id,
        name: unit.customerDisplayName || unit.name,
        status: unit.status,
        currentSession
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        units: transformedUnits
      }
    })

  } catch (error) {
    console.error('Error fetching units:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch units',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}