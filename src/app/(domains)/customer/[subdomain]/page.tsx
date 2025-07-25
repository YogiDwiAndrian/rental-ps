// src/app/(domains)/customer/[subdomain]/page.tsx
import { Suspense } from 'react'
import { ResponsiveWrapper } from '@/components/customer/responsive-wrapper'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

interface CustomerPageProps {
  params: Promise<{
    subdomain: string
  }>
}

// Loading component
function CustomerPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-blue-600 font-medium">Loading gaming center...</p>
      </div>
    </div>
  )
}

// Validate tenant exists and is active
async function validateTenant(subdomain: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { 
        subdomain: subdomain,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        customerPageEnabled: true
      }
    })
    
    return tenant
  } catch (error) {
    console.error('Failed to validate tenant:', error)
    return null
  }
}

export default async function CustomerPage({ params }: CustomerPageProps) {
  // Await params in Next.js 15
  const { subdomain } = await params
  
  console.log(`🏪 Customer page accessed for subdomain: ${subdomain}`)
  
  // Basic subdomain validation
  if (!subdomain || subdomain.length < 2) {
    console.log('❌ Invalid subdomain:', subdomain)
    notFound()
  }
  
  // Enhanced tenant validation
  const tenant = await validateTenant(subdomain)
  
  if (!tenant) {
    console.log('❌ Tenant not found or inactive:', subdomain)
    notFound()
  }
  
  if (!tenant.customerPageEnabled) {
    console.log('❌ Customer page disabled for tenant:', subdomain)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="mb-6">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Page Temporarily Unavailable
          </h1>
          
          <p className="text-gray-600 mb-6">
            The customer page for <strong>{tenant.name}</strong> is currently disabled. 
            Please contact the gaming center directly or try again later.
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>Gaming Center: <span className="font-medium text-gray-700">{tenant.name}</span></p>
            <p>Subdomain: <span className="font-medium text-gray-700">{tenant.subdomain}</span></p>
          </div>
        </div>
      </div>
    )
  }
  
  console.log('✅ Tenant validated for customer page:', {
    subdomain: tenant.subdomain,
    name: tenant.name,
    id: tenant.id
  })
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Suspense fallback={<CustomerPageLoading />}>
        <ResponsiveWrapper subdomain={subdomain} />
      </Suspense>
    </div>
  )
}

// Generate metadata dynamically based on tenant
export async function generateMetadata({ params }: CustomerPageProps) {
  const { subdomain } = await params
  const tenant = await validateTenant(subdomain)
  
  if (!tenant) {
    return {
      title: 'Gaming Center Not Found',
      description: 'The requested gaming center could not be found.',
    }
  }
  
  return {
    title: `${tenant.name} - Gaming Center`,
    description: `Live unit status, F&B menu, and information for ${tenant.name} gaming center. Check available PlayStation units and place orders.`,
    keywords: ['gaming center', 'playstation rental', tenant.name, 'gaming', 'ps4', 'ps5'],
    openGraph: {
      title: `${tenant.name} - Gaming Center`,
      description: `Live gaming unit status and F&B menu for ${tenant.name}`,
      type: 'website',
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      'gaming-center': tenant.name,
      'subdomain': tenant.subdomain,
    }
  }
}

// Enable ISR (Incremental Static Regeneration) for better performance
export const revalidate = 300 // Revalidate every 5 minutes