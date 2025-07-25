// src/app/dashboard/select-location/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import LocationSelectorClient from '@/components/dashboard/location-selector-client'

export default async function SelectLocationPage() {
  // Get user session
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    console.log('❌ No session found, redirecting to login')
    redirect('/auth/signin')
  }
  
  const user = session.user
  
  console.log('📍 Location selector accessed:', {
    userId: user.id,
    role: user.role,
    email: user.email,
    locations: user.locations?.length || 0
  })
  
  // Only staff should access this page
  if (user.role !== 'staff') {
    console.log('❌ Non-staff user accessing location selector, redirecting')
    
    if (user.role === 'super_admin') {
      redirect('/admin')
    } else if (user.role === 'owner') {
      redirect('/dashboard/all-locations')
    } else {
      redirect('/auth/signin')
    }
  }
  
  // Staff with no locations - show error
  if (!user.locations || user.locations.length === 0) {
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
            You are not assigned to any locations. Please contact your owner to assign you to a location before you can access the dashboard.
          </p>
          
          <div className="space-y-3">
            <a 
              href="/auth/signout"
              className="block w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </a>
            
            <button 
              onClick={() => window.location.reload()}
              className="block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-600">
            <p>Need help? Contact your administrator:</p>
            <p className="font-medium text-gray-800 mt-1">
              {user.tenant?.name || 'Your Organization'}
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  // Staff with single location - auto redirect
  if (user.locations.length === 1) {
    const singleLocation = user.locations[0]
    console.log('🎯 Single location auto-redirect:', singleLocation.name)
    redirect(`/dashboard/location/${singleLocation.id}`)
  }
  
  // Staff with multiple locations - show selector
  console.log('🔀 Multiple locations, showing selector:', user.locations.length)
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with user info and logout */}
      <nav className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-900">
                  🎮 {user.tenant?.name || 'Gaming Center'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user.name}</span>
                <span className="text-gray-400"> • </span>
                <span className="capitalize">{user.role}</span>
              </div>
              
              <a
                href="/auth/signout"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Location Selector Content */}
      <main>
        <LocationSelectorClient 
          user={{
            id: user.id,
            name: user.name || 'Unknown User',
            email: user.email || 'unknown@email.com',
            role: user.role,
            tenantId: user.tenantId || '',
            tenant: user.tenant
          }}
          locations={user.locations}
        />
      </main>
      
      {/* Footer info */}
      <footer className="bg-white border-t mt-8">
        <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>
              💡 Your location preference will be remembered for future logins
            </p>
            <p className="mt-1">
              Having trouble? Contact your administrator for assistance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Force dynamic rendering to ensure fresh session data
export const dynamic = 'force-dynamic'

// Generate metadata
export async function generateMetadata() {
  return {
    title: 'Select Location - Dashboard',
    description: 'Choose your working location to access the dashboard',
    robots: 'noindex, nofollow', // Don't index internal pages
  }
}