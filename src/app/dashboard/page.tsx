// src/app/dashboard/page.tsx - Smart Location Routing (Fixed)
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
  
  console.log('🎯 Dashboard access:', {
    userId: user.id,
    role: user.role,
    email: user.email,
    locations: user.locations?.length || 0
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
      // Staff logic: smart location selection
      const userLocations = user.locations || []
      
      if (userLocations.length === 0) {
        console.log('❌ Staff has no location assignments')
        return (
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-red-900 mb-4">
                No Location Access
              </h1>
              <p className="text-red-700 mb-6">
                You are not assigned to any locations. Please contact your manager.
              </p>
              <a 
                href="/auth/signout"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Sign Out
              </a>
            </div>
          </div>
        )
      }
      
      // Check for specific location in URL params
      const locationParam = params.location as string
      if (locationParam) {
        const validLocation = userLocations.find(loc => loc.id === locationParam)
        if (validLocation) {
          console.log('✅ Valid location from URL param:', validLocation.name)
          redirect(`/dashboard/location/${locationParam}`)
        } else {
          console.log('❌ Invalid location param, ignoring')
        }
      }
      
      // Single location: auto-redirect
      if (userLocations.length === 1) {
        const singleLocation = userLocations[0]
        console.log('🎯 Single location auto-redirect:', singleLocation.name)
        redirect(`/dashboard/location/${singleLocation.id}`)
      }
      
      // Multiple locations: show selector
      console.log('🔀 Multiple locations, showing selector')
      redirect('/dashboard/select-location')
      
    default:
      console.log('❌ Unknown user role:', user.role)
      redirect('/auth/signin')
  }
}

// This page should not be rendered, only used for routing logic
export const dynamic = 'force-dynamic'