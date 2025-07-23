// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  
  console.log(`🌐 Request: ${hostname}${pathname}`) // Debug log
  
  // Skip static files and API routes
  if (pathname.includes('.') || pathname.startsWith('/api/')) {
    console.log(`🚫 Skipping: ${pathname}`)
    return NextResponse.next()
  }
  
  // Get domain configuration from environment
  const baseDomain = process.env.MAIN_DOMAIN || 'rentalps.local'
  const adminSubdomain = process.env.ADMIN_SUBDOMAIN || 'admin'
  
  console.log(`🏠 Base domain: ${baseDomain}`)
  
  // Handle different domain types
  if (hostname === baseDomain || hostname === `${baseDomain}:3000`) {
    // Main domain - Landing page
    console.log(`📍 Routing to: /landing${pathname}`)
    return NextResponse.rewrite(new URL(`/landing${pathname}`, request.url))
  }
  
  if (hostname === `${adminSubdomain}.${baseDomain}` || hostname === `${adminSubdomain}.${baseDomain}:3000`) {
    // Admin subdomain
    console.log(`🏛️ Routing to: /admin${pathname}`)
    return NextResponse.rewrite(new URL(`/admin${pathname}`, request.url))
  }
  
  // Check if it's a tenant subdomain
  const subdomain = hostname.replace(`.${baseDomain}`, '').replace(`:3000`, '')
  
  if (subdomain && subdomain !== hostname && subdomain !== adminSubdomain) {
    // Tenant subdomain - customer page by default
    console.log(`🏪 Routing to: /customer/${subdomain}${pathname}`)
    return NextResponse.rewrite(
      new URL(`/customer/${subdomain}${pathname}`, request.url)
    )
  }
  
  // Default behavior
  console.log(`⚡ Default routing for: ${hostname}${pathname}`)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - files with extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}