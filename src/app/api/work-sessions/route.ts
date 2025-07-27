// src/app/api/work-sessions/route.ts - COMPLETE VERSION
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { WorkSessionStatus } from '@prisma/client'

// Validation schemas
const startWorkSessionSchema = z.object({
  locationId: z.string().min(1, 'Location ID is required'),
  startNotes: z.string().optional()
})

const endWorkSessionSchema = z.object({
  workSessionId: z.string().min(1, 'Work session ID is required'),
  endNotes: z.string().optional(),
  totalRevenue: z.number().min(0).optional(),
  totalSessions: z.number().min(0).optional(),
  hourlyRevenue: z.number().min(0).optional(),
  packageRevenue: z.number().min(0).optional(),
  payLaterRevenue: z.number().min(0).optional()
})

const updateWorkSessionSchema = z.object({
  workSessionId: z.string().min(1, 'Work session ID is required'),
  totalRevenue: z.number().min(0).optional(),
  totalSessions: z.number().min(0).optional(),
  hourlyRevenue: z.number().min(0).optional(),
  packageRevenue: z.number().min(0).optional(),
  payLaterRevenue: z.number().min(0).optional(),
  startNotes: z.string().optional()
})

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
    
    // Verify user has access to this location (for staff)
    if (session.user.role === 'staff') {
      const hasAccess = await prisma.locationAssignment.findFirst({
        where: {
          userId: session.user.id,
          locationId: locationId,
          isActive: true
        }
      })
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to this location' }, { status: 403 })
      }
    }
    
    // Get current active work session
    const workSession = await prisma.workSession.findFirst({
      where: {
        userId: session.user.id,
        locationId: locationId,
        status: 'active' as WorkSessionStatus
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
      },
      orderBy: {
        startTime: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: workSession
    })
    
  } catch (error) {
    console.error('Error fetching work session:', error)
    return NextResponse.json({ 
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST start work session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'staff') {
      return NextResponse.json({ error: 'Only staff can start work sessions' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = startWorkSessionSchema.parse(body)
    
    // Verify user has access to this location
    const hasAccess = await prisma.locationAssignment.findFirst({
      where: {
        userId: session.user.id,
        locationId: validatedData.locationId,
        isActive: true
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true
          }
        }
      }
    })
    
    if (!hasAccess || !hasAccess.location.isActive) {
      return NextResponse.json({ error: 'Access denied to this location' }, { status: 403 })
    }
    
    // Check if user already has active session anywhere
    const existingSession = await prisma.workSession.findFirst({
      where: {
        userId: session.user.id,
        status: 'active' as WorkSessionStatus
      },
      include: {
        location: {
          select: {
            name: true,
            code: true
          }
        }
      }
    })
    
    if (existingSession) {
      return NextResponse.json({ 
        error: 'Already have active session',
        details: `You have an active session at ${existingSession.location.name}. Please end it first.`,
        activeSession: {
          id: existingSession.id,
          locationName: existingSession.location.name,
          startTime: existingSession.startTime
        }
      }, { status: 400 })
    }
    
    // Create new work session
    const workSession = await prisma.workSession.create({
      data: {
        userId: session.user.id,
        locationId: validatedData.locationId,
        startTime: new Date(),
        status: 'active' as WorkSessionStatus,
        startNotes: validatedData.startNotes || null,
        totalRevenue: 0,
        totalSessions: 0,
        hourlyRevenue: 0,
        packageRevenue: 0,
        payLaterRevenue: 0
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
    
    console.log('✅ Work session started:', {
      userId: session.user.id,
      userName: session.user.name,
      locationId: validatedData.locationId,
      locationName: hasAccess.location.name,
      sessionId: workSession.id,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      message: 'Work session started successfully',
      data: workSession
    })
    
  } catch (error) {
    console.error('Error starting work session:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT end work session
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'staff') {
      return NextResponse.json({ error: 'Only staff can end work sessions' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = endWorkSessionSchema.parse(body)
    
    // Get existing session with verification
    const existingSession = await prisma.workSession.findUnique({
      where: { id: validatedData.workSessionId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })
    
    if (!existingSession) {
      return NextResponse.json({ error: 'Work session not found' }, { status: 404 })
    }
    
    if (existingSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied to this work session' }, { status: 403 })
    }
    
    if (existingSession.status !== 'active') {
      return NextResponse.json({ 
        error: 'Work session is not active',
        details: `Current status: ${existingSession.status}`
      }, { status: 400 })
    }
    
    // Calculate duration
    const endTime = new Date()
    const durationMinutes = Math.floor(
      (endTime.getTime() - existingSession.startTime.getTime()) / (1000 * 60)
    )
    
    // Update work session with provided data or keep existing values
    const updatedSession = await prisma.workSession.update({
      where: { id: validatedData.workSessionId },
      data: {
        endTime,
        status: 'completed' as WorkSessionStatus,
        durationMinutes,
        endNotes: validatedData.endNotes || null,
        totalRevenue: validatedData.totalRevenue !== undefined ? validatedData.totalRevenue : existingSession.totalRevenue,
        totalSessions: validatedData.totalSessions !== undefined ? validatedData.totalSessions : existingSession.totalSessions,
        hourlyRevenue: validatedData.hourlyRevenue !== undefined ? validatedData.hourlyRevenue : existingSession.hourlyRevenue,
        packageRevenue: validatedData.packageRevenue !== undefined ? validatedData.packageRevenue : existingSession.packageRevenue,
        payLaterRevenue: validatedData.payLaterRevenue !== undefined ? validatedData.payLaterRevenue : existingSession.payLaterRevenue
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
    
    console.log('✅ Work session ended:', {
      userId: session.user.id,
      userName: session.user.name,
      sessionId: updatedSession.id,
      locationName: updatedSession.location.name,
      duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
      totalRevenue: updatedSession.totalRevenue,
      totalSessions: updatedSession.totalSessions,
      timestamp: endTime.toISOString()
    })
    
    return NextResponse.json({
      success: true,
      message: 'Work session ended successfully',
      data: updatedSession,
      summary: {
        duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
        totalRevenue: updatedSession.totalRevenue,
        totalSessions: updatedSession.totalSessions,
        location: updatedSession.location.name,
        averageRevenuePerHour: durationMinutes > 0 ? 
          Math.round((Number(updatedSession.totalRevenue) / durationMinutes) * 60) : 0
      }
    })
    
  } catch (error) {
    console.error('Error ending work session:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PATCH update work session (for updating revenue during active session)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'staff') {
      return NextResponse.json({ error: 'Only staff can update work sessions' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = updateWorkSessionSchema.parse(body)
    
    // Get existing session with verification
    const existingSession = await prisma.workSession.findUnique({
      where: { id: validatedData.workSessionId }
    })
    
    if (!existingSession) {
      return NextResponse.json({ error: 'Work session not found' }, { status: 404 })
    }
    
    if (existingSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied to this work session' }, { status: 403 })
    }
    
    if (existingSession.status !== 'active') {
      return NextResponse.json({ 
        error: 'Can only update active work sessions',
        details: `Current status: ${existingSession.status}`
      }, { status: 400 })
    }
    
    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {}
    
    if (validatedData.totalRevenue !== undefined) {
      updateData.totalRevenue = validatedData.totalRevenue
    }
    
    if (validatedData.totalSessions !== undefined) {
      updateData.totalSessions = validatedData.totalSessions
    }
    
    if (validatedData.hourlyRevenue !== undefined) {
      updateData.hourlyRevenue = validatedData.hourlyRevenue
    }
    
    if (validatedData.packageRevenue !== undefined) {
      updateData.packageRevenue = validatedData.packageRevenue
    }
    
    if (validatedData.payLaterRevenue !== undefined) {
      updateData.payLaterRevenue = validatedData.payLaterRevenue
    }
    
    if (validatedData.startNotes !== undefined) {
      updateData.startNotes = validatedData.startNotes
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields to update',
        allowedFields: ['totalRevenue', 'totalSessions', 'hourlyRevenue', 'packageRevenue', 'payLaterRevenue', 'startNotes']
      }, { status: 400 })
    }
    
    // Update work session
    const updatedSession = await prisma.workSession.update({
      where: { id: validatedData.workSessionId },
      data: updateData,
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
    
    console.log('✅ Work session updated:', {
      userId: session.user.id,
      userName: session.user.name,
      sessionId: updatedSession.id,
      locationName: updatedSession.location.name,
      updatedFields: Object.keys(updateData),
      totalRevenue: updatedSession.totalRevenue,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      message: 'Work session updated successfully',
      data: updatedSession,
      updatedFields: Object.keys(updateData)
    })
    
  } catch (error) {
    console.error('Error updating work session:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}