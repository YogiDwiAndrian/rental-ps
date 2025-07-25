// src/app/customer/[subdomain]/auth/signin/page.tsx
import { Suspense } from 'react'
import SignInForm from '@/components/auth/signin-form'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

interface CustomerSignInPageProps {
  params: Promise<{
    subdomain: string
  }>
}

// Enhanced loading component
function SignInLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-blue-600 font-medium">Loading login page...</p>
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

export default async function CustomerSignInPage({ params }: CustomerSignInPageProps) {
  // Await params in Next.js 15
  const { subdomain } = await params
  
  console.log(`🔐 Customer signin accessed for subdomain: ${subdomain}`)
  
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
  
  console.log('✅ Tenant validated for signin:', {
    subdomain: tenant.subdomain,
    name: tenant.name,
    id: tenant.id
  })
  
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInForm 
        subdomain={subdomain} 
        domainType="tenant"
      />
    </Suspense>
  )
}

// Generate metadata dynamically based on tenant
export async function generateMetadata({ params }: CustomerSignInPageProps) {
  const { subdomain } = await params
  const tenant = await validateTenant(subdomain)
  
  return {
    title: tenant ? `Staff Login - ${tenant.name}` : `Staff Login - ${subdomain}`,
    description: tenant ? `Staff and owner login portal for ${tenant.name} gaming center` : 'Staff login portal',
    robots: 'noindex, nofollow', // Don't index login pages
  }
}