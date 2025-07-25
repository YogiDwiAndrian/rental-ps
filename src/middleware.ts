// src/middleware.ts - Fixed Dashboard Routing
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const ip = getClientIP(request)
  
  console.log(`🌐 Request: ${hostname}${pathname} from IP: ${ip}`)
  
  // Skip static files
  if (pathname.includes('.')) {
    return NextResponse.next()
  }

  // IMPORTANT: Let NextAuth API routes pass through without any interference
  if (pathname.startsWith('/api/auth/')) {
    console.log(`🔐 NextAuth API route: ${pathname} - passing through`)
    return NextResponse.next()
  }

  // Skip other API routes (public API, etc.)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Get domain configuration from environment
  const baseDomain = process.env.MAIN_DOMAIN || 'rentalps.local'
  const adminSubdomain = process.env.ADMIN_SUBDOMAIN || 'admin'
  
  console.log(`🏠 Base domain: ${baseDomain}`)
  
  // Handle different domain types
  if (hostname === baseDomain || hostname === `${baseDomain}:3000`) {
    // Main domain - Landing page
    console.log(`📍 Routing to: /(domains)/landing${pathname}`)
    return NextResponse.rewrite(new URL(`/(domains)/landing${pathname}`, request.url))
  }
  
  if (hostname === `${adminSubdomain}.${baseDomain}` || hostname === `${adminSubdomain}.${baseDomain}:3000`) {
    // Admin subdomain
    console.log(`🏛️ Routing to: /(domains)/admin${pathname}`)
    return NextResponse.rewrite(new URL(`/(domains)/admin${pathname}`, request.url))
  }
  
  // Check if it's a tenant subdomain
  const subdomain = hostname.replace(`.${baseDomain}`, '').replace(`:3000`, '')
  
  if (subdomain && subdomain !== hostname && subdomain !== adminSubdomain) {
    console.log(`🔍 Processing tenant subdomain: ${subdomain}`)
    
    // IMPORTANT: Dashboard routes should NOT be rewritten - they exist in root /dashboard
    if (pathname.startsWith('/dashboard')) {
      console.log(`📊 Dashboard route: ${pathname} - passing through to root /dashboard`)
      return NextResponse.next()
    }
    
    // Handle auth routes for tenants (login/signup pages)
    if (pathname.startsWith('/auth/')) {
      console.log(`🔐 Tenant auth route: ${pathname} → /customer/${subdomain}${pathname}`)
      return NextResponse.rewrite(
        new URL(`/customer/${subdomain}${pathname}`, request.url)
      )
    }
    
    // Handle regular customer pages (public unit status, etc.)
    console.log(`🏪 Customer page: ${pathname} → /customer/${subdomain}${pathname}`)
    return NextResponse.rewrite(
      new URL(`/customer/${subdomain}${pathname}`, request.url)
    )
  }
  
  // Default behavior
  console.log(`⚡ Default routing for: ${hostname}${pathname}`)
  return NextResponse.next()
}

// Helper function to get client IP (kept for logging purposes)
function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for')
  const xRealIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  
  if (cfConnectingIP) return cfConnectingIP
  if (xRealIP) return xRealIP
  
  // Development IP identifier
  return `dev-localhost`
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)  
     * - favicon.ico (favicon file)
     * - files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}