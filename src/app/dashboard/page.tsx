// src/app/dashboard/page.tsx - Smart Location Routing with User Preferences
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Get user session
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    console.log('❌ No session found, redirecting to login')
    redirect('/auth/signin')
  }
  
  const user = session.user
  const params = await searchParams
  const forceSelection = params?.['select'] === 'true' // Manual location selection trigger
  
  console.log('🎯 Dashboard access:', {
    userId: user.id,
    role: user.role,
    email: user.email,
    locations: user.locations?.length || 0,
    forceSelection
  })
  
  // Handle different user roles
  switch (user.role) {
    case 'super_admin':
      console.log('👑 Super admin access - redirecting to admin portal')
      redirect('/admin')
      
    case 'owner':
      console.log('🏢 Owner access - redirecting to all locations dashboard')
      // Owners always see all locations overview
      redirect('/dashboard/all-locations')
      
    case 'staff':
      // Staff logic: smart location selection with preference support
      const userLocations = user.locations || []
      
      if (userLocations.length === 0) {
        console.log('❌ Staff has no location assignments')
        return (
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <div className="text-center p-8 max-w-md">
              <div className="mb-6">
                <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
                  <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-red-900 mb-4">
                No Location Access
              </h1>
              
              <p className="text-red-700 mb-6">
                You are not assigned to any locations. Please contact your owner to assign you to a location.
              </p>
              
              <div className="space-y-3">
                <a 
                  href="/auth/signout"
                  className="block w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </a>
              </div>
            </div>
          </div>
        )
      }
      
      // Single location - always auto redirect
      if (userLocations.length === 1) {
        const singleLocation = userLocations[0]
        console.log('🎯 Single location auto-redirect:', singleLocation.name)
        redirect(`/dashboard/location/${singleLocation.id}`)
      }
      
      // Multi location logic with user preferences
      if (userLocations.length > 1) {
        console.log('🔀 Multi location staff detected:', userLocations.length, 'locations')
        
        // If force selection is requested, skip preference check
        if (forceSelection) {
          console.log('🎛️ Force selection requested, showing location selector')
          redirect('/dashboard/select-location')
        }
        
        // Check if user has saved location preference
        const userPreference = await prisma.userPreference.findUnique({
          where: { userId: user.id },
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
        
        console.log('🔍 User preference check:', {
          hasPreference: !!userPreference,
          preferredLocationId: userPreference?.preferredLocationId,
          preferredLocationName: userPreference?.preferredLocation?.name
        })
        
        // If user has a valid preferred location
        if (userPreference?.preferredLocation && userPreference.preferredLocation.isActive) {
          const preferredLocationId = userPreference.preferredLocationId
          
          // Verify user still has access to this location
          const hasAccessToPreferred = userLocations.some(loc => loc.id === preferredLocationId)
          
          if (hasAccessToPreferred) {
            console.log('✅ Auto-redirecting to preferred location:', userPreference.preferredLocation.name)
            
            // Update last login time (non-blocking)
            prisma.userPreference.update({
              where: { userId: user.id },
              data: { 
                updatedAt: new Date(),
                settings: {
                  ...((userPreference.settings as Record<string, unknown>) || {}),
                  lastAutoRedirect: new Date().toISOString()
                }
              }
            }).catch(error => {
              console.warn('⚠️ Failed to update last redirect time:', error)
            })
            
            // Redirect to preferred location
            redirect(`/dashboard/location/${preferredLocationId}`)
          } else {
            console.log('⚠️ User lost access to preferred location, clearing preference')
            
            // Clear invalid preference (non-blocking)
            prisma.userPreference.update({
              where: { userId: user.id },
              data: { 
                preferredLocationId: null,
                settings: {
                  ...((userPreference.settings as Record<string, unknown>) || {}),
                  clearedReason: 'Lost access to preferred location',
                  clearedAt: new Date().toISOString()
                }
              }
            }).catch(error => {
              console.warn('⚠️ Failed to clear invalid preference:', error)
            })
            
            // Show location selector
            redirect('/dashboard/select-location')
          }
        } else {
          console.log('📍 No valid preference found, showing location selector')
          redirect('/dashboard/select-location')
        }
      }
      
      // Fallback (should not reach here)
      console.log('⚠️ Unexpected staff flow, redirecting to location selector')
      redirect('/dashboard/select-location')
      
    default:
      console.log('❌ Unknown user role:', user.role)
      redirect('/auth/signin')
  }
}

// Force dynamic rendering for real-time user data
export const dynamic = 'force-dynamic'

// SEO metadata
export async function generateMetadata() {
  return {
    title: 'Dashboard - Gaming Center',
    description: 'Access your gaming center dashboard',
    robots: 'noindex, nofollow'
  }
}