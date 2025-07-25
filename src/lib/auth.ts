// src/lib/auth.ts - Updated with Database Audit Logging
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { checkDatabaseConnection } from "./db-health"
import { FailedLoginRateLimiter } from "./failed-login-rate-limiter"
import { AuditService } from "./audit-service"
import { UserRole } from "@prisma/client"

// Define proper types
type TenantData = {
  id: string
  name: string
  subdomain: string
} | null

type LocationData = {
  id: string
  name: string
  code: string
}[]

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        subdomain: { label: "Subdomain", type: "text" }
      },
      async authorize(credentials, req) {
        const startTime = Date.now()

        if (!credentials?.email || !credentials?.password) {
          await AuditService.logAuthEvent({
            eventType: 'LOGIN_FAILED',
            email: credentials?.email || 'unknown',
            success: false,
            failureReason: 'EMAIL_PASSWORD_REQUIRED',
            subdomain: credentials?.subdomain,
            ...AuditService.getClientInfo(req),
            responseTime: Date.now() - startTime
          })
          throw new Error('EMAIL_PASSWORD_REQUIRED')
        }

        try {
          // Get client info for audit logging
          const clientInfo = AuditService.getClientInfo(req)

          console.log('🔍 Starting authentication process:', {
            email: credentials.email,
            ip: clientInfo.ipAddress.replace(/\d+\.\d+\.\d+\.\d+/, '[IP_HIDDEN]'),
            subdomain: credentials.subdomain
          })

          // Step 1: Check rate limiting BEFORE any database operations
          const rateLimitCheck = FailedLoginRateLimiter.isBlocked(clientInfo.ipAddress, credentials.email)
          
          if (rateLimitCheck.blocked) {
            console.log('🚫 Login blocked by rate limiter')
            await AuditService.logAuthEvent({
              eventType: 'LOGIN_FAILED',
              email: credentials.email,
              success: false,
              failureReason: 'RATE_LIMITED',
              subdomain: credentials.subdomain,
              ...clientInfo,
              rateLimitInfo: {
                wasBlocked: true,
                attempts: rateLimitCheck.attempts,
                retryAfter: rateLimitCheck.retryAfter
              },
              responseTime: Date.now() - startTime
            })
            throw new Error(`RATE_LIMITED:${rateLimitCheck.retryAfter}:${rateLimitCheck.attempts}`)
          }

          // Step 2: Check database connection
          console.log('🔍 Checking database connection...')
          const dbStatus = await checkDatabaseConnection()
          
          if (!dbStatus.isConnected) {
            console.error('❌ Database connection failed:', dbStatus.error)
            await AuditService.logAuthEvent({
              eventType: 'LOGIN_FAILED',
              email: credentials.email,
              success: false,
              failureReason: `DATABASE_CONNECTION_FAILED: ${dbStatus.error}`,
              subdomain: credentials.subdomain,
              ...clientInfo,
              responseTime: Date.now() - startTime
            })
            throw new Error(`DATABASE_CONNECTION_FAILED: ${dbStatus.error}`)
          }
          
          console.log(`✅ Database connected (${dbStatus.responseTime}ms)`)

          // Step 3: Find user by email
          console.log('🔍 Looking up user:', credentials.email)
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              tenant: true,
              locationAssignments: {
                where: { isActive: true },
                include: {
                  location: true
                }
              }
            }
          })

          if (!user) {
            console.log('❌ User not found:', credentials.email)
            
            // Record failed attempt for user not found
            const rateLimitResult = FailedLoginRateLimiter.recordFailedAttempt(clientInfo.ipAddress, credentials.email)
            
            await AuditService.logAuthEvent({
              eventType: 'LOGIN_FAILED',
              email: credentials.email,
              success: false,
              failureReason: 'USER_NOT_FOUND',
              subdomain: credentials.subdomain,
              ...clientInfo,
              rateLimitInfo: {
                wasBlocked: rateLimitResult.blocked,
                attempts: rateLimitResult.attempts,
                retryAfter: rateLimitResult.retryAfter
              },
              responseTime: Date.now() - startTime
            })
            throw new Error('USER_NOT_FOUND')
          }

          if (!user.passwordHash) {
            console.log('❌ User has no password hash:', credentials.email)
            
            // Record failed attempt for no password
            const rateLimitResult = FailedLoginRateLimiter.recordFailedAttempt(clientInfo.ipAddress, credentials.email)
            
            await AuditService.logAuthEvent({
              eventType: 'LOGIN_FAILED',
              email: credentials.email,
              success: false,
              failureReason: 'NO_PASSWORD_SET',
              userId: user.id,
              userRole: user.role,
              tenantId: user.tenantId || undefined,
              subdomain: credentials.subdomain,
              ...clientInfo,
              rateLimitInfo: {
                wasBlocked: rateLimitResult.blocked,
                attempts: rateLimitResult.attempts,
                retryAfter: rateLimitResult.retryAfter
              },
              responseTime: Date.now() - startTime
            })
            throw new Error('NO_PASSWORD_SET')
          }

          if (!user.isActive) {
            console.log('❌ User account is disabled:', credentials.email)
            
            // Record failed attempt for disabled account
            const rateLimitResult = FailedLoginRateLimiter.recordFailedAttempt(clientInfo.ipAddress, credentials.email)
            
            await AuditService.logAuthEvent({
              eventType: 'LOGIN_FAILED',
              email: credentials.email,
              success: false,
              failureReason: 'ACCOUNT_DISABLED',
              userId: user.id,
              userRole: user.role,
              tenantId: user.tenantId || undefined,
              subdomain: credentials.subdomain,
              ...clientInfo,
              rateLimitInfo: {
                wasBlocked: rateLimitResult.blocked,
                attempts: rateLimitResult.attempts,
                retryAfter: rateLimitResult.retryAfter
              },
              responseTime: Date.now() - startTime
            })
            throw new Error('ACCOUNT_DISABLED')
          }

          // Step 4: Verify password - CRITICAL: This is where most failed attempts happen
          console.log('🔍 Verifying password...')
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', credentials.email)
            
            // Record failed attempt for invalid password - MAIN CASE
            const rateLimitResult = FailedLoginRateLimiter.recordFailedAttempt(clientInfo.ipAddress, credentials.email)
            
            await AuditService.logAuthEvent({
              eventType: 'LOGIN_FAILED',
              email: credentials.email,
              success: false,
              failureReason: 'INVALID_PASSWORD',
              userId: user.id,
              userRole: user.role,
              tenantId: user.tenantId || undefined,
              subdomain: credentials.subdomain,
              ...clientInfo,
              rateLimitInfo: {
                wasBlocked: rateLimitResult.blocked,
                attempts: rateLimitResult.attempts,
                retryAfter: rateLimitResult.retryAfter
              },
              responseTime: Date.now() - startTime
            })
            
            // If blocked after this attempt, include retry info in error
            if (rateLimitResult.blocked) {
              throw new Error(`INVALID_PASSWORD_BLOCKED:${rateLimitResult.retryAfter}:${rateLimitResult.attempts}`)
            }
            
            throw new Error('INVALID_PASSWORD')
          }

          console.log('✅ Password verified for user:', credentials.email)

          // Step 5: Handle super_admin (no tenant validation needed)
          if (user.role === 'super_admin') {
            console.log('✅ Super admin login successful:', credentials.email)
            
            // Clear failed attempts on successful login
            FailedLoginRateLimiter.clearFailedAttempts(clientInfo.ipAddress, credentials.email)
            
            await AuditService.logAuthEvent({
              eventType: 'LOGIN_SUCCESS',
              email: credentials.email,
              success: true,
              userId: user.id,
              userRole: user.role,
              subdomain: credentials.subdomain,
              ...clientInfo,
              responseTime: Date.now() - startTime
            })

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              tenantId: null,
              tenant: null,
              locations: []
            }
          }

          // Step 6: For owner/staff - validate tenant is assigned
          if (!user.tenant) {
            console.log('❌ User has no tenant assigned:', credentials.email)
            
            // Record failed attempt for no tenant
            const rateLimitResult = FailedLoginRateLimiter.recordFailedAttempt(clientInfo.ipAddress, credentials.email)
            
            await AuditService.logAuthEvent({
              eventType: 'LOGIN_FAILED',
              email: credentials.email,
              success: false,
              failureReason: 'NO_TENANT_ASSIGNED',
              userId: user.id,
              userRole: user.role,
              subdomain: credentials.subdomain,
              ...clientInfo,
              rateLimitInfo: {
                wasBlocked: rateLimitResult.blocked,
                attempts: rateLimitResult.attempts,
                retryAfter: rateLimitResult.retryAfter
              },
              responseTime: Date.now() - startTime
            })
            throw new Error('NO_TENANT_ASSIGNED')
          }

          // Step 7: Validate subdomain access for owner/staff
          if (credentials.subdomain && user.tenant.subdomain !== credentials.subdomain) {
            console.log('❌ User does not have access to tenant:', credentials.subdomain)
            
            // Record failed attempt for tenant access denied
            const rateLimitResult = FailedLoginRateLimiter.recordFailedAttempt(clientInfo.ipAddress, credentials.email)
            
            await AuditService.logAuthEvent({
              eventType: 'LOGIN_FAILED',
              email: credentials.email,
              success: false,
              failureReason: 'TENANT_ACCESS_DENIED',
              userId: user.id,
              userRole: user.role,
              tenantId: user.tenantId || undefined,
              subdomain: credentials.subdomain,
              ...clientInfo,
              rateLimitInfo: {
                wasBlocked: rateLimitResult.blocked,
                attempts: rateLimitResult.attempts,
                retryAfter: rateLimitResult.retryAfter
              },
              responseTime: Date.now() - startTime
            })
            throw new Error('TENANT_ACCESS_DENIED')
          }

          console.log('✅ Login successful for user:', credentials.email)
          
          // Clear failed attempts on successful login - IMPORTANT!
          FailedLoginRateLimiter.clearFailedAttempts(clientInfo.ipAddress, credentials.email)
          
          await AuditService.logAuthEvent({
            eventType: 'LOGIN_SUCCESS',
            email: credentials.email,
            success: true,
            userId: user.id,
            userRole: user.role,
                          tenantId: user.tenantId || undefined,
            subdomain: credentials.subdomain,
            ...clientInfo,
            responseTime: Date.now() - startTime
          })

          // Step 8: Return user data for owner/staff
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            tenant: {
              id: user.tenant.id,
              name: user.tenant.name,
              subdomain: user.tenant.subdomain
            },
            locations: user.locationAssignments.map(assignment => ({
              id: assignment.location.id,
              name: assignment.location.name,
              code: assignment.location.code
            }))
          }

        } catch (error) {
          console.error('🚨 Authorization error:', error)
          
          // Re-throw our custom errors (including rate limit errors)
          if (error instanceof Error) {
            if (error.message.startsWith('DATABASE_CONNECTION_FAILED') ||
                error.message.startsWith('RATE_LIMITED') ||
                error.message.startsWith('INVALID_PASSWORD_BLOCKED') ||
                ['USER_NOT_FOUND', 'INVALID_PASSWORD', 'ACCOUNT_DISABLED', 'NO_PASSWORD_SET', 'TENANT_ACCESS_DENIED', 'NO_TENANT_ASSIGNED'].includes(error.message)) {
              throw error
            }
          }
          
          // Handle unexpected errors
          console.error('Unexpected auth error:', error)
          const clientInfo = AuditService.getClientInfo(req)
          
          await AuditService.logAuthEvent({
            eventType: 'LOGIN_FAILED',
            email: credentials.email,
            success: false,
            failureReason: 'SYSTEM_ERROR',
            subdomain: credentials.subdomain,
            ...clientInfo,
            responseTime: Date.now() - startTime
          })
          throw new Error('SYSTEM_ERROR')
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 90 * 24 * 60 * 60, // 3 months (90 days)
  },
  jwt: {
    maxAge: 90 * 24 * 60 * 60, // 3 months (90 days)
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.tenantId = user.tenantId
        token.tenant = user.tenant
        token.locations = user.locations
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string | null
        session.user.tenant = token.tenant as TenantData
        session.user.locations = token.locations as LocationData
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, account }) {
      // Enhanced login success logging with database audit
      if (user.id) {
        try {
          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          })
          
          // Database audit log for successful sign in
          await AuditService.logAuthEvent({
            eventType: 'LOGIN_SUCCESS',
            email: user.email || 'unknown',
            success: true,
            userId: user.id,
            userRole: user.role as UserRole,
            ipAddress: 'nextauth-callback',
            userAgent: 'nextauth-event'
          })
          
          console.log('✅ LOGIN SUCCESS EVENT:', {
            userId: user.id,
            email: user.email,
            role: user.role,
            timestamp: new Date().toISOString()
          })
          
        } catch (error) {
          console.error('Failed to update last login time or log event:', error)
          // Don't throw error here, login should still succeed
        }
      }
    },
    async signOut({ session, token }) {
      // Database audit log for logout
      try {
        const userId = token?.sub || session?.user?.id
        const email = session?.user?.email
        
        if (userId && email) {
          await AuditService.logAuthEvent({
            eventType: 'LOGOUT',
            email,
            success: true,
            userId,
            ipAddress: 'nextauth-callback',
            userAgent: 'nextauth-event'
          })
        }
        
        console.log('🚪 LOGOUT EVENT:', {
          userId,
          email,
          timestamp: new Date().toISOString()
        })
        
      } catch (error) {
        console.error('Failed to log logout event:', error)
      }
    }
  }
}