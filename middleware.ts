// middleware.ts (di root project)
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  
  console.log(`🌐 Request: ${hostname}${pathname}`) // Debug log
  
  // Get the base domain
  const baseDomain = process.env.MAIN_DOMAIN || 'rentalps.local'
  
  // Handle different domain types
  if (hostname === baseDomain) {
    // Main domain - Landing page
    console.log(`📍 Routing to: /landing${pathname}`)
    return NextResponse.rewrite(new URL(`/landing${pathname}`, request.url))
  }
  
  if (hostname === `admin.${baseDomain}`) {
    // Admin subdomain
    console.log(`🏛️ Routing to: /admin${pathname}`)
    return NextResponse.rewrite(new URL(`/admin${pathname}`, request.url))
  }
  
  // Check if it's a tenant subdomain (demo, pslounge, etc)
  const subdomain = hostname.replace(`.${baseDomain}`, '')
  
  if (subdomain && subdomain !== hostname && subdomain !== 'admin') {
    // Tenant subdomain - customer page by default
    console.log(`🏪 Routing to: /customer/${subdomain}${pathname}`)
    return NextResponse.rewrite(
      new URL(`/customer/${subdomain}${pathname}`, request.url)
    )
  }
  
  // Default behavior
  console.log(`⚡ Default routing`)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}