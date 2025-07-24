import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { checkDatabaseConnection } from "./db-health"

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

// Enhanced audit logging function
async function auditLoginAttempt(data: {
  email: string
  subdomain?: string
  ip?: string
  userAgent?: string
  success: boolean
  failureReason?: string
  userId?: string
  userRole?: string
}) {
  try {
    const auditData = {
      event: 'LOGIN_ATTEMPT',
      email: data.email,
      subdomain: data.subdomain || 'unknown',
      ip: data.ip || 'unknown',
      userAgent: data.userAgent || 'unknown',
      success: data.success,
      failureReason: data.failureReason,
      userId: data.userId,
      userRole: data.userRole,
      timestamp: new Date().toISOString()
    }
    
    // Console logging for now (will be enhanced with database logging later)
    console.log('🔐 AUTH AUDIT:', JSON.stringify(auditData, null, 2))
    
    // TODO: Store in database audit table
    // await prisma.auditLog.create({ data: auditData })
    
  } catch (error) {
    console.error('❌ Failed to log audit data:', error)
  }
}

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
        if (!credentials?.email || !credentials?.password) {
          await auditLoginAttempt({
            email: credentials?.email || 'unknown',
            subdomain: credentials?.subdomain,
            success: false,
            failureReason: 'EMAIL_PASSWORD_REQUIRED'
          })
          throw new Error('EMAIL_PASSWORD_REQUIRED')
        }

        try {
          // Get IP and User Agent for audit logging
          const ip = req?.headers?.['x-forwarded-for'] || 
                    req?.headers?.['x-real-ip'] || 
                    'unknown'
          const userAgent = req?.headers?.['user-agent'] || 'unknown'

          // Step 1: Check database connection first
          console.log('🔍 Checking database connection...')
          const dbStatus = await checkDatabaseConnection()
          
          if (!dbStatus.isConnected) {
            console.error('❌ Database connection failed:', dbStatus.error)
            await auditLoginAttempt({
              email: credentials.email,
              subdomain: credentials.subdomain,
              ip: ip as string,
              userAgent: userAgent as string,
              success: false,
              failureReason: `DATABASE_CONNECTION_FAILED: ${dbStatus.error}`
            })
            throw new Error(`DATABASE_CONNECTION_FAILED: ${dbStatus.error}`)
          }
          
          console.log(`✅ Database connected (${dbStatus.responseTime}ms)`)

          // Step 2: Find user by email
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
            await auditLoginAttempt({
              email: credentials.email,
              subdomain: credentials.subdomain,
              ip: ip as string,
              userAgent: userAgent as string,
              success: false,
              failureReason: 'USER_NOT_FOUND'
            })
            throw new Error('USER_NOT_FOUND')
          }

          if (!user.passwordHash) {
            console.log('❌ User has no password hash:', credentials.email)
            await auditLoginAttempt({
              email: credentials.email,
              subdomain: credentials.subdomain,
              ip: ip as string,
              userAgent: userAgent as string,
              success: false,
              failureReason: 'NO_PASSWORD_SET',
              userId: user.id,
              userRole: user.role
            })
            throw new Error('NO_PASSWORD_SET')
          }

          if (!user.isActive) {
            console.log('❌ User account is disabled:', credentials.email)
            await auditLoginAttempt({
              email: credentials.email,
              subdomain: credentials.subdomain,
              ip: ip as string,
              userAgent: userAgent as string,
              success: false,
              failureReason: 'ACCOUNT_DISABLED',
              userId: user.id,
              userRole: user.role
            })
            throw new Error('ACCOUNT_DISABLED')
          }

          // Step 3: Verify password
          console.log('🔍 Verifying password...')
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', credentials.email)
            await auditLoginAttempt({
              email: credentials.email,
              subdomain: credentials.subdomain,
              ip: ip as string,
              userAgent: userAgent as string,
              success: false,
              failureReason: 'INVALID_PASSWORD',
              userId: user.id,
              userRole: user.role
            })
            throw new Error('INVALID_PASSWORD')
          }

          console.log('✅ Password verified for user:', credentials.email)

          // Step 4: Handle super_admin (no tenant validation needed)
          if (user.role === 'super_admin') {
            console.log('✅ Super admin login successful:', credentials.email)
            await auditLoginAttempt({
              email: credentials.email,
              subdomain: credentials.subdomain,
              ip: ip as string,
              userAgent: userAgent as string,
              success: true,
              userId: user.id,
              userRole: user.role
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

          // Step 5: For owner/staff - validate tenant is assigned
          if (!user.tenant) {
            console.log('❌ User has no tenant assigned:', credentials.email)
            await auditLoginAttempt({
              email: credentials.email,
              subdomain: credentials.subdomain,
              ip: ip as string,
              userAgent: userAgent as string,
              success: false,
              failureReason: 'NO_TENANT_ASSIGNED',
              userId: user.id,
              userRole: user.role
            })
            throw new Error('NO_TENANT_ASSIGNED')
          }

          // Step 6: Validate subdomain access for owner/staff
          if (credentials.subdomain && user.tenant.subdomain !== credentials.subdomain) {
            console.log('❌ User does not have access to tenant:', credentials.subdomain)
            await auditLoginAttempt({
              email: credentials.email,
              subdomain: credentials.subdomain,
              ip: ip as string,
              userAgent: userAgent as string,
              success: false,
              failureReason: 'TENANT_ACCESS_DENIED',
              userId: user.id,
              userRole: user.role
            })
            throw new Error('TENANT_ACCESS_DENIED')
          }

          console.log('✅ Login successful for user:', credentials.email)
          await auditLoginAttempt({
            email: credentials.email,
            subdomain: credentials.subdomain,
            ip: ip as string,
            userAgent: userAgent as string,
            success: true,
            userId: user.id,
            userRole: user.role
          })

          // Step 7: Return user data for owner/staff
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
          
          // Re-throw our custom errors
          if (error instanceof Error && error.message.startsWith('DATABASE_CONNECTION_FAILED')) {
            throw error
          }
          if (error instanceof Error && ['USER_NOT_FOUND', 'INVALID_PASSWORD', 'ACCOUNT_DISABLED', 'NO_PASSWORD_SET', 'TENANT_ACCESS_DENIED', 'NO_TENANT_ASSIGNED'].includes(error.message)) {
            throw error
          }
          
          // Handle unexpected errors
          console.error('Unexpected auth error:', error)
          await auditLoginAttempt({
            email: credentials.email,
            subdomain: credentials.subdomain,
            success: false,
            failureReason: 'SYSTEM_ERROR'
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
      // Enhanced login success logging
      if (user.id) {
        try {
          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          })
          
          // Success audit log
          console.log('✅ LOGIN SUCCESS:', {
            userId: user.id,
            email: user.email,
            role: user.role,
            timestamp: new Date().toISOString()
          })
          
        } catch (error) {
          console.error('Failed to update last login time:', error)
          // Don't throw error here, login should still succeed
        }
      }
    },
    async signOut({ session, token }) {
      // Logout audit log
      console.log('🚪 LOGOUT:', {
        userId: token?.sub || session?.user?.id,
        email: session?.user?.email,
        timestamp: new Date().toISOString()
      })
    }
  }
}