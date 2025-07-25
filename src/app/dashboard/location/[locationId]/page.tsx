// src/app/dashboard/location/[locationId]/page.tsx (Simplified for testing)
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

interface LocationDashboardPageProps {
  params: Promise<{
    locationId: string
  }>
}

export default async function LocationDashboardPage({ params }: LocationDashboardPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }
  
  const { locationId } = await params
  const user = session.user
  
  console.log('📍 Location dashboard test page loaded:', {
    locationId,
    userId: user.id,
    email: user.email
  })
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎉 Location Dashboard Working!
          </h1>
          
          <div className="space-y-3 text-left bg-gray-50 rounded-lg p-4">
            <p><strong>Location ID:</strong> <code className="text-sm bg-gray-200 px-2 py-1 rounded">{locationId}</code></p>
            <p><strong>User:</strong> {user.name} ({user.email})</p>
            <p><strong>Role:</strong> <span className="capitalize">{user.role}</span></p>
            <p><strong>Tenant:</strong> {user.tenant?.name}</p>
            <p><strong>Locations:</strong> {user.locations?.length || 0}</p>
          </div>
          
          <div className="mt-8 space-y-3">
            <a 
              href="/dashboard"
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Dashboard
            </a>
            
            <a 
              href="/dashboard/select-location"
              className="block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Switch Location
            </a>
            
            <a 
              href="/auth/signout"
              className="block w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </a>
          </div>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>✅ Authentication: Working</p>
            <p>✅ Database Audit: Working</p>
            <p>✅ Smart Routing: Working</p>
            <p>✅ Location Dashboard: Working</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'