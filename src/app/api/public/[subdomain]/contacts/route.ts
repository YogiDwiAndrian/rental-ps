// src/app/api/public/[subdomain]/contacts/route.ts
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

    // Validate subdomain
    if (!subdomain || subdomain.length < 2) {
      return NextResponse.json(
        { error: 'Invalid subdomain' },
        { status: 400 }
      )
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
          where: { 
            isActive: true,
            showOnCustomerPage: true 
          },
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
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Combine global and location-specific contacts
    const allContacts = [
      ...tenant.whatsappContacts, // Global contacts
      ...tenant.locations.flatMap(location => 
        location.whatsappContacts.map(contact => ({
          ...contact,
          locationName: location.name // Add locationName property
        }))
      )
    ]

    // Transform contacts for public API
    const publicContacts = allContacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      whatsappNumber: contact.whatsappNumber,
      role: contact.role,
      isPrimary: contact.isPrimary,
      responseTime: contact.responseTime,
      locationName: 'locationName' in contact ? contact.locationName : null,
      displayOrder: contact.displayOrder,
      // Determine if contact is currently "online" based on availability schedule
      isOnline: isContactOnline(contact.availabilitySchedule),
      // Get availability info
      currentAvailability: getCurrentAvailability(contact.availabilitySchedule)
    }))

    const response = NextResponse.json({
      success: true,
      data: {
        contacts: publicContacts,
        tenant: {
          name: tenant.name,
          subdomain: tenant.subdomain
        },
        lastUpdated: new Date().toISOString()
      }
    })

    // Cache for 5 minutes (contacts don't change frequently)
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    
    return response

  } catch (error) {
    console.error('Error fetching WhatsApp contacts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

// Helper function to determine if contact is currently online
function isContactOnline(availabilitySchedule: JsonValue): boolean {
  const schedule = parseAvailabilitySchedule(availabilitySchedule)
  
  if (!schedule) {
    return false
  }

  // If 24/7 availability
  if (schedule.available24_7) {
    return true
  }

  // Check current time against working hours
  if (schedule.workingHours) {
    const now = new Date()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = dayNames[now.getDay()]
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const todayHours = schedule.workingHours[currentDay]
    if (todayHours && todayHours.start && todayHours.end) {
      const [startHour, startMinute] = todayHours.start.split(':').map(Number)
      const [endHour, endMinute] = todayHours.end.split(':').map(Number)
      
      const startTime = startHour * 60 + startMinute
      let endTime = endHour * 60 + endMinute
      
      // Handle overnight shifts
      if (endTime < startTime) {
        endTime += 24 * 60
      }
      
      return currentTime >= startTime && currentTime <= endTime
    }
  }

  return false
}

// Helper function to get current availability status
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
  const now = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = dayNames[now.getDay()]
  
  if (schedule.workingHours && schedule.workingHours[currentDay]) {
    const todayHours = schedule.workingHours[currentDay]
    if (todayHours.start) {
      return `Available from ${todayHours.start}`
    }
  }

  return 'Contact for availability'
}