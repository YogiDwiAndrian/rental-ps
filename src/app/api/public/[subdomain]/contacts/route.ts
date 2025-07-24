// src/app/api/public/[subdomain]/contacts/route.ts - ENHANCED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { JsonValue } from '@prisma/client/runtime/library'

interface RouteParams {
  params: Promise<{
    subdomain: string
  }>
}

// Type definitions for availability schedule
interface WorkingHours {
  start: string
  end: string
}

interface AvailabilitySchedule {
  available24_7?: boolean
  workingHours?: Record<string, WorkingHours>
  preferredHours?: string
  [key: string]: unknown
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

    // Get tenant and WhatsApp contacts
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
            whatsappContacts: {
              where: {
                isActive: true
              },
              include: {
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: [
                { isPrimary: 'desc' }, // Primary contacts first
                { displayOrder: 'asc' },
                { role: 'asc' }, // owner, manager, staff, custom
                { name: 'asc' }
              ]
            }
          }
        },
        // Also get global contacts (not tied to specific location)
        whatsappContacts: {
          where: {
            isActive: true,
            locationId: null // Global contacts
          },
          include: {
            user: {
              select: {
                name: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: [
            { isPrimary: 'desc' },
            { displayOrder: 'asc' },
            { role: 'asc' },
            { name: 'asc' }
          ]
        }
      }
    })

    if (!tenant) {
      console.error(`❌ Tenant not found for subdomain: ${subdomain}`)
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

    // Combine global and location-specific contacts
    const allContacts = [
      // Global contacts (always included)
      ...tenant.whatsappContacts.map(contact => ({
        ...contact,
        locationName: null as string | null
      })),
      // Location-specific contacts
      ...tenant.locations.flatMap(location => 
        location.whatsappContacts.map(contact => ({
          ...contact,
          locationName: location.name
        }))
      )
    ]

    // Transform contacts for public API with enhanced availability
    const publicContacts = allContacts.map(contact => {
      const availabilitySchedule = parseAvailabilitySchedule(contact.availabilitySchedule)
      const isOnline = isContactOnline(contact.availabilitySchedule)
      const currentAvailability = getCurrentAvailability(contact.availabilitySchedule)

      return {
        id: contact.id,
        name: contact.name,
        whatsappNumber: contact.whatsappNumber,
        role: contact.role,
        isPrimary: contact.isPrimary,
        responseTime: contact.responseTime,
        locationName: contact.locationName,
        displayOrder: contact.displayOrder,
        // Enhanced availability data
        isOnline,
        currentAvailability,
        // Pass the parsed availability schedule for frontend use
        availabilitySchedule: availabilitySchedule ? {
          available24_7: availabilitySchedule.available24_7,
          workingHours: availabilitySchedule.workingHours,
          preferredHours: availabilitySchedule.preferredHours
        } : undefined
      }
    })

    const responseData = {
      success: true,
      data: {
        contacts: publicContacts,
        locationFilter: locationId ? { 
          locationId, 
          locationName: tenant.locations[0]?.name 
        } : null,
        tenant: {
          name: tenant.name,
          subdomain: tenant.subdomain
        },
        lastUpdated: new Date().toISOString(),
        // Add debug info
        debug: {
          totalContactsFound: allContacts.length,
          globalContacts: tenant.whatsappContacts.length,
          locationSpecificContacts: tenant.locations.reduce((acc, loc) => acc + loc.whatsappContacts.length, 0),
          filteredByLocation: locationId ? 'yes' : 'no'
        }
      }
    }

    const response = NextResponse.json(responseData)

    // FIXED: More aggressive cache headers to prevent stale data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
    console.error('❌ Error fetching WhatsApp contacts:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper function to safely parse JsonValue to AvailabilitySchedule
function parseAvailabilitySchedule(jsonValue: JsonValue): AvailabilitySchedule | null {
  if (!jsonValue || typeof jsonValue !== 'object' || Array.isArray(jsonValue)) {
    return null
  }
  
  try {
    // JsonValue is already an object, we just need to type it properly
    return jsonValue as AvailabilitySchedule
  } catch {
    return null
  }
}

// Enhanced helper function to determine if contact is currently online
function isContactOnline(availabilitySchedule: JsonValue): boolean {
  const schedule = parseAvailabilitySchedule(availabilitySchedule)
  
  if (!schedule) {
    return false
  }

  // If 24/7 availability
  if (schedule.available24_7) {
    return true
  }

  // Check current time against working hours (Jakarta timezone)
  if (schedule.workingHours) {
    try {
      const now = new Date()
      // Convert to Jakarta time
      const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}))
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const currentDay = dayNames[jakartaTime.getDay()]
      const currentTime = jakartaTime.getHours() * 60 + jakartaTime.getMinutes()
      
      const todayHours = schedule.workingHours[currentDay]
      if (todayHours && todayHours.start && todayHours.end) {
        const [startHour, startMinute] = todayHours.start.split(':').map(Number)
        const [endHour, endMinute] = todayHours.end.split(':').map(Number)
        
        const startTime = startHour * 60 + startMinute
        let endTime = endHour * 60 + endMinute
        
        // Handle overnight shifts (e.g., 22:00 - 02:00)
        if (endTime < startTime) {
          endTime += 24 * 60
        }
        
        return currentTime >= startTime && currentTime <= endTime
      }
    } catch (error) {
      console.error('Error checking working hours:', error)
      return false
    }
  }

  return false
}

// Enhanced helper function to get current availability status
function getCurrentAvailability(availabilitySchedule: JsonValue): string {
  const schedule = parseAvailabilitySchedule(availabilitySchedule)
  
  if (!schedule) {
    return 'Contact for availability'
  }

  if (schedule.available24_7) {
    return 'Available 24/7'
  }

  if (isContactOnline(availabilitySchedule)) {
    return 'Online now'
  }

  // Try to get next available time
  try {
    const now = new Date()
    const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}))
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = dayNames[jakartaTime.getDay()]
    
    if (schedule.workingHours && schedule.workingHours[currentDay]) {
      const todayHours = schedule.workingHours[currentDay]
      if (todayHours.start) {
        const currentTime = jakartaTime.getHours() * 60 + jakartaTime.getMinutes()
        const [startHour, startMinute] = todayHours.start.split(':').map(Number)
        const startTime = startHour * 60 + startMinute
        
        if (currentTime < startTime) {
          return `Available from ${todayHours.start} today`
        }
      }
    }

    // Check next few days for availability
    for (let i = 1; i <= 7; i++) {
      const checkDayIndex = (jakartaTime.getDay() + i) % 7
      const checkDay = dayNames[checkDayIndex]
      
      if (schedule.workingHours && schedule.workingHours[checkDay]) {
        const nextHours = schedule.workingHours[checkDay]
        if (nextHours.start) {
          const dayName = i === 1 ? 'tomorrow' : checkDay
          return `Next available: ${nextHours.start} ${dayName}`
        }
      }
    }
  } catch (error) {
    console.error('Error getting next availability:', error)
  }

  return 'Contact for availability'
}