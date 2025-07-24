// src/middleware.ts - Fixed Routing
import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

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
    console.log(`🔍 Processing tenant subdomain: ${subdomain}`)
    
    // Apply rate limiting ONLY for auth pages (not every request)
    if (pathname.startsWith('/auth/')) {
      console.log(`🔐 Auth page request - applying rate limit`)
      const rateLimitResult = checkRateLimit(ip, 'auth')
      
      if (!rateLimitResult.success) {
        console.log(`🚫 Rate limit exceeded for IP: ${ip}, attempts: ${rateLimitResult.attempts}`)
        
        // Development-friendly error page
        if (process.env.NODE_ENV === 'development') {
          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Rate Limited - Development</title>
                <style>
                  body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
                  .container { text-align: center; }
                  .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; margin: 20px 0; }
                  button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
                  .code { background: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🚫 Rate Limited (Development)</h1>
                  <div class="error">
                    <h3>Too Many Auth Requests</h3>
                    <p><strong>Attempts:</strong> ${rateLimitResult.attempts}/10</p>
                    <p><strong>Retry in:</strong> ${Math.ceil(rateLimitResult.retryAfter / 60)} minutes</p>
                  </div>
                  <p><strong>Quick Fix:</strong> Restart dev server with <code class="code">npm run dev</code></p>
                  <p><a href="/">← Back to Customer Page</a></p>
                </div>
              </body>
            </html>
          `
          
          return new NextResponse(html, {
            status: 429,
            headers: { 'Content-Type': 'text/html' }
          })
        }

        return new NextResponse(
          JSON.stringify({
            error: 'Too many auth attempts. Please try again later.',
            retryAfter: rateLimitResult.retryAfter
          }),
          { 
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }
    
    // Handle auth and dashboard routes for tenants
    if (pathname.startsWith('/auth/') || pathname.startsWith('/dashboard')) {
      console.log(`🔐 Tenant auth/dashboard route: ${pathname}`)
      // FIXED: Use correct path structure
      return NextResponse.rewrite(
        new URL(`/customer/${subdomain}${pathname}`, request.url)
      )
    } else {
      // Regular customer page
      console.log(`🏪 Customer page: ${pathname}`)
      // FIXED: Use correct path structure  
      return NextResponse.rewrite(
        new URL(`/customer/${subdomain}${pathname}`, request.url)
      )
    }
  }
  
  // Default behavior
  console.log(`⚡ Default routing for: ${hostname}${pathname}`)
  return NextResponse.next()
}

// Helper function to get client IP
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

// Rate limiting function - ONLY for auth requests
function checkRateLimit(identifier: string, type: 'auth'): { 
  success: boolean; 
  attempts: number; 
  retryAfter: number 
} {
  const now = Date.now()
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // More generous limits for development
  const windowMs = isDevelopment ? 10 * 60 * 1000 : 15 * 60 * 1000 // 10 min dev, 15 min prod
  const maxAttempts = isDevelopment ? 20 : 5 // 20 attempts dev, 5 prod
  
  const key = `${type}:${identifier}`
  const current = rateLimitMap.get(key)
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    console.log(`✅ Auth rate limit: ${1}/${maxAttempts} for ${identifier}`)
    return { success: true, attempts: 1, retryAfter: 0 }
  }
  
  if (current.count >= maxAttempts) {
    const retryAfter = Math.ceil((current.resetTime - now) / 1000)
    console.log(`🚫 Auth rate limit exceeded: ${current.count}/${maxAttempts} for ${identifier}`)
    return { success: false, attempts: current.count, retryAfter }
  }
  
  current.count++
  rateLimitMap.set(key, current)
  
  console.log(`⚠️ Auth rate limit: ${current.count}/${maxAttempts} for ${identifier}`)
  return { success: true, attempts: current.count, retryAfter: 0 }
}

// Cleanup old entries
setInterval(() => {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
      cleaned++
    }
  }
  
  if (cleaned > 0 && process.env.NODE_ENV === 'development') {
    console.log(`🧹 Cleaned ${cleaned} expired rate limit entries`)
  }
}, 5 * 60 * 1000) // Clean every 5 minutes

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