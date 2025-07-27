// src/app/api/work-sessions/route.ts - SIMPLE VERSION
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET current work session
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
    }
    
    // Get current active work session
    const workSession = await prisma.workSession.findFirst({
      where: {
        userId: session.user.id,
        locationId: locationId,
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: workSession
    })
    
  } catch (error) {
    console.error('Error fetching work session:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST start work session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { locationId, startNotes } = await request.json()
    
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
    }
    
    // Check if already has active session
    const existingSession = await prisma.workSession.findFirst({
      where: {
        userId: session.user.id,
        status: 'active'
      }
    })
    
    if (existingSession) {
      return NextResponse.json({ error: 'Already have active session' }, { status: 400 })
    }
    
    // Create new work session
    const workSession = await prisma.workSession.create({
      data: {
        userId: session.user.id,
        locationId: locationId,
        startTime: new Date(),
        status: 'active',
        startNotes: startNotes || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Work session started',
      data: workSession
    })
    
  } catch (error) {
    console.error('Error starting work session:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PUT end work session
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { 
      workSessionId, 
      endNotes,
      totalRevenue,
      totalSessions,
      hourlyRevenue,
      packageRevenue,
      payLaterRevenue
    } = await request.json()
    
    if (!workSessionId) {
      return NextResponse.json({ error: 'Work session ID required' }, { status: 400 })
    }
    
    // Get existing session
    const existingSession = await prisma.workSession.findUnique({
      where: { id: workSessionId }
    })
    
    if (!existingSession || existingSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    if (existingSession.status !== 'active') {
      return NextResponse.json({ error: 'Session not active' }, { status: 400 })
    }
    
    // Calculate duration
    const endTime = new Date()
    const durationMinutes = Math.floor(
      (endTime.getTime() - existingSession.startTime.getTime()) / (1000 * 60)
    )
    
    // Update work session
    const updatedSession = await prisma.workSession.update({
      where: { id: workSessionId },
      data: {
        endTime,
        status: 'completed',
        durationMinutes,
        endNotes: endNotes || null,
        totalRevenue: totalRevenue || existingSession.totalRevenue,
        totalSessions: totalSessions || existingSession.totalSessions,
        hourlyRevenue: hourlyRevenue || existingSession.hourlyRevenue,
        packageRevenue: packageRevenue || existingSession.packageRevenue,
        payLaterRevenue: payLaterRevenue || existingSession.payLaterRevenue
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Work session ended',
      data: updatedSession,
      summary: {
        duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
        totalRevenue: updatedSession.totalRevenue
      }
    })
    
  } catch (error) {
    console.error('Error ending work session:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}