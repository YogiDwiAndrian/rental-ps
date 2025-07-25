// src/app/dashboard/all-locations/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function AllLocationsDashboardPage() {
  // Get user session
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    console.log('❌ No session found, redirecting to login')
    redirect('/auth/signin')
  }
  
  const user = session.user
  
  console.log('🏢 All locations dashboard accessed:', {
    userId: user.id,
    role: user.role,
    email: user.email,
    tenantId: user.tenantId
  })
  
  // Only owner can access all locations dashboard
  if (user.role !== 'owner') {
    console.log('❌ Non-owner accessing all locations dashboard')
    
    if (user.role === 'super_admin') {
      redirect('/admin')
    } else if (user.role === 'staff') {
      redirect('/dashboard')
    } else {
      redirect('/auth/signin')
    }
  }
  
  // Owner must have tenant assigned
  if (!user.tenantId || !user.tenant) {
    console.log('❌ Owner has no tenant assigned')
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-900 mb-4">
            No Tenant Assigned
          </h1>
          <p className="text-red-700 mb-6">
            Your owner account is not assigned to any gaming center. Please contact system administrator.
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
  
  // Get all locations for this tenant with detailed stats
  let locations
  let tenant
  try {
    tenant = await prisma.tenant.findUnique({
      where: { 
        id: user.tenantId,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        address: true,
        phone: true
      }
    })
    
    if (!tenant) {
      console.log('❌ Tenant not found or inactive:', user.tenantId)
      notFound()
    }
    
    locations = await prisma.location.findMany({
      where: { 
        tenantId: user.tenantId,
        isActive: true 
      },
      include: {
        units: {
          where: { isActive: true },
          include: {
            rentalSessions: {
              where: {
                status: 'active'
              },
              select: {
                id: true,
                startTime: true,
                billingModel: true,
                totalAmount: true
              }
            }
          }
        },
        fnbItems: {
          where: { isActive: true },
          select: {
            id: true,
            stockQuantity: true,
            minStockAlert: true,
            sellingPrice: true
          }
        },
        whatsappContacts: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            role: true,
            isPrimary: true
          }
        },
        locationAssignments: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    
  } catch (error) {
    console.error('Failed to fetch locations:', error)
    notFound()
  }
  
  console.log('✅ Owner dashboard data loaded:', {
    tenantName: tenant.name,
    locationsCount: locations.length,
    totalUnits: locations.reduce((sum, loc) => sum + loc.units.length, 0)
  })
  
  // Calculate overall statistics
  const overallStats = {
    totalLocations: locations.length,
    totalUnits: locations.reduce((sum, loc) => sum + loc.units.length, 0),
    availableUnits: locations.reduce((sum, loc) => 
      sum + loc.units.filter(u => u.status === 'available').length, 0),
    occupiedUnits: locations.reduce((sum, loc) => 
      sum + loc.units.filter(u => u.status === 'occupied').length, 0),
    totalStaff: locations.reduce((sum, loc) => sum + loc.locationAssignments.length, 0),
    totalFnbItems: locations.reduce((sum, loc) => sum + loc.fnbItems.length, 0),
    activeSessions: locations.reduce((sum, loc) => 
      sum + loc.units.filter(u => u.rentalSessions.length > 0).length, 0),
    totalRevenue: locations.reduce((sum, loc) => 
      sum + loc.units.reduce((unitSum, unit) => 
        unitSum + unit.rentalSessions.reduce((sessionSum, session) => 
          sessionSum + Number(session.totalAmount), 0), 0), 0)
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-900">
                  🏢 {tenant.name}
                </h1>
              </div>
              <div className="text-sm text-gray-500">
                <span>All Locations Overview</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user.name}</span>
                <span className="text-gray-400"> • </span>
                <span className="capitalize text-blue-600 font-medium">Owner</span>
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

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        
        {/* Welcome Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {user.name?.split(' ')[0]}!
              </h2>
              <p className="text-blue-100">
                Overview of all your gaming center locations and real-time business insights.
              </p>
            </div>
          </div>
        </div>

        {/* Overall Statistics Cards */}
        <div className="px-4 py-6 sm:px-0">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Overview</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Locations */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Locations</dt>
                      <dd className="text-lg font-medium text-gray-900">{overallStats.totalLocations}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Gaming Units */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Gaming Units</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {overallStats.availableUnits} / {overallStats.totalUnits}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-sm text-green-600">{overallStats.occupiedUnits} Active</span>
                </div>
              </div>
            </div>

            {/* Staff */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Staff Members</dt>
                      <dd className="text-lg font-medium text-gray-900">{overallStats.totalStaff}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Sessions</dt>
                      <dd className="text-lg font-medium text-gray-900">{overallStats.activeSessions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Locations List */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Location Details</h3>
            <div className="text-sm text-gray-500">
              Click on a location to access its dashboard
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {locations.map((location) => {
              const locationStats = {
                totalUnits: location.units.length,
                availableUnits: location.units.filter(u => u.status === 'available').length,
                occupiedUnits: location.units.filter(u => u.status === 'occupied').length,
                activeStaff: location.locationAssignments.filter(a => a.user.isActive).length,
                activeSessions: location.units.filter(u => u.rentalSessions.length > 0).length,
                fnbItems: location.fnbItems.length,
                lowStockItems: location.fnbItems.filter(item => item.stockQuantity <= item.minStockAlert).length
              }
              
              return (
                <div key={location.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{location.name}</h4>
                        <p className="text-sm text-gray-500">{location.code}</p>
                      </div>
                      <a
                        href={`/dashboard/location/${location.id}`}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Open
                      </a>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Units Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Gaming Units</span>
                        <span className="text-sm font-medium">
                          <span className="text-green-600">{locationStats.availableUnits}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-gray-900">{locationStats.totalUnits}</span>
                        </span>
                      </div>
                      
                      {/* Active Sessions */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Active Sessions</span>
                        <span className="text-sm font-medium text-purple-600">{locationStats.activeSessions}</span>
                      </div>
                      
                      {/* Staff */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Staff Assigned</span>
                        <span className="text-sm font-medium text-blue-600">{locationStats.activeStaff}</span>
                      </div>
                      
                      {/* F&B Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">F&B Items</span>
                        <span className="text-sm font-medium">
                          <span className="text-gray-900">{locationStats.fnbItems}</span>
                          {locationStats.lowStockItems > 0 && (
                            <>
                              <span className="text-gray-400"> • </span>
                              <span className="text-red-600">{locationStats.lowStockItems} low</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    {/* Address */}
                    {location.address && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 line-clamp-2">{location.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  🚧 Owner Dashboard Features Coming Soon
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Advanced analytics, financial reports, staff management, and cross-location 
                    comparisons are being built. Click on individual locations to manage their operations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}

// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic'

// Generate metadata
export async function generateMetadata() {
  return {
    title: 'All Locations Dashboard - Owner Portal',
    description: 'Owner dashboard for managing all gaming center locations',
    robots: 'noindex, nofollow', // Don't index internal dashboards
  }
}