// src/app/api/user/preference/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for request body
const updatePreferenceSchema = z.object({
  preferredLocationId: z.string().min(1, 'Location ID is required'),
  rememberChoice: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.enum(['id', 'en']).optional(),
  notifications: z.boolean().optional(),
  defaultDashboard: z.enum(['overview', 'units', 'reports']).optional()
})

type UpdatePreferenceRequest = z.infer<typeof updatePreferenceSchema>

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to update preferences' },
        { status: 401 }
      )
    }
    
    const user = session.user
    
    // Only staff can save location preferences
    if (user.role !== 'staff') {
      return NextResponse.json(
        { 
          error: 'Forbidden', 
          message: 'Only staff members can save location preferences' 
        },
        { status: 403 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = updatePreferenceSchema.parse(body)
    
    console.log('💾 Saving user preference:', {
      userId: user.id,
      preferredLocationId: validatedData.preferredLocationId,
      rememberChoice: validatedData.rememberChoice
    })
    
    // Verify user has access to the requested location
    const userLocationAccess = await prisma.locationAssignment.findFirst({
      where: {
        userId: user.id,
        locationId: validatedData.preferredLocationId,
        isActive: true
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
            tenantId: true
          }
        }
      }
    })
    
    if (!userLocationAccess || !userLocationAccess.location.isActive) {
      return NextResponse.json(
        { 
          error: 'Invalid Location', 
          message: 'You do not have access to this location or location is inactive' 
        },
        { status: 400 }
      )
    }
    
    // Verify location belongs to user's tenant
    if (userLocationAccess.location.tenantId !== user.tenantId) {
      return NextResponse.json(
        { 
          error: 'Invalid Location', 
          message: 'Location does not belong to your organization' 
        },
        { status: 400 }
      )
    }
    
    // Create or update user preference
    const userPreference = await prisma.userPreference.upsert({
      where: {
        userId: user.id
      },
      create: {
        userId: user.id,
        preferredLocationId: validatedData.preferredLocationId,
        theme: validatedData.theme || 'light',
        language: validatedData.language || 'id',
        notifications: validatedData.notifications ?? true,
        defaultDashboard: validatedData.defaultDashboard || 'overview',
        settings: {
          rememberChoice: validatedData.rememberChoice,
          savedAt: new Date().toISOString(),
          source: 'location_selector'
        }
      },
      update: {
        preferredLocationId: validatedData.preferredLocationId,
        theme: validatedData.theme,
        language: validatedData.language,
        notifications: validatedData.notifications,
        defaultDashboard: validatedData.defaultDashboard,
        settings: {
          rememberChoice: validatedData.rememberChoice,
          updatedAt: new Date().toISOString(),
          source: 'location_selector',
          previousLocationId: undefined // Could track previous choice
        },
        updatedAt: new Date()
      },
      include: {
        preferredLocation: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })
    
    // Log the preference update for audit
    await prisma.auditLog.create({
      data: {
        eventType: 'USER_UPDATED', // Use existing eventType from enum
        severity: 'LOW',
        success: true,
        userId: user.id,
        email: user.email,
        userRole: user.role,
        tenantId: user.tenantId!,
        locationId: validatedData.preferredLocationId,
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        userAgent: request.headers.get('user-agent'),
        requestPath: '/api/user/preference',
        requestMethod: 'POST',
        resourceType: 'user_preference',
        resourceId: userPreference.id,
        newValues: {
          preferredLocationId: validatedData.preferredLocationId,
          preferredLocationName: userLocationAccess.location.name,
          rememberChoice: validatedData.rememberChoice,
          source: 'location_selector'
        },
        metadata: {
          action: 'user_preference_updated',
          preferredLocationId: validatedData.preferredLocationId,
          preferredLocationName: userLocationAccess.location.name,
          rememberChoice: validatedData.rememberChoice,
          updatedFields: Object.keys(validatedData),
          userAgent: request.headers.get('user-agent'),
          source: 'api_preference_update'
        }
      }
    })
    
    console.log('✅ User preference saved successfully:', {
      userId: user.id,
      preferenceId: userPreference.id,
      locationName: userLocationAccess.location.name
    })
    
    return NextResponse.json({
      success: true,
      message: 'Preference saved successfully',
      data: {
        id: userPreference.id,
        preferredLocation: {
          id: userPreference.preferredLocationId,
          name: userLocationAccess.location.name,
          code: userLocationAccess.location.code
        },
        rememberChoice: validatedData.rememberChoice,
        theme: userPreference.theme,
        updatedAt: userPreference.updatedAt
      }
    })
    
  } catch (error) {
    console.error('❌ Error saving user preference:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.issues
        },
        { status: 400 }
      )
    }
    
    // Handle Prisma errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { 
          error: 'Conflict',
          message: 'Preference already exists for this user'
        },
        { status: 409 }
      )
    }
    
    // Generic server error
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to save preference. Please try again.'
      },
      { status: 500 }
    )
  }
}

// GET method to retrieve user preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const user = session.user
    
    // Get user preference with location details
    const userPreference = await prisma.userPreference.findUnique({
      where: {
        userId: user.id
      },
      include: {
        preferredLocation: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true
          }
        }
      }
    })
    
    if (!userPreference) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No preferences found'
      })
    }
    
    // Verify preferred location is still valid
    const isLocationValid = userPreference.preferredLocation && 
                           userPreference.preferredLocation.isActive
    
    return NextResponse.json({
      success: true,
      data: {
        id: userPreference.id,
        preferredLocation: isLocationValid ? userPreference.preferredLocation : null,
        theme: userPreference.theme,
        language: userPreference.language,
        notifications: userPreference.notifications,
        defaultDashboard: userPreference.defaultDashboard,
        settings: userPreference.settings,
        createdAt: userPreference.createdAt,
        updatedAt: userPreference.updatedAt
      }
    })
    
  } catch (error) {
    console.error('❌ Error fetching user preference:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to fetch preferences'
      },
      { status: 500 }
    )
  }
}