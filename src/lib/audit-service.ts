// src/lib/audit-service.ts
import { prisma } from './prisma'
import { AuditEventType, AuditSeverity, UserRole, Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'

// Type for JSON values that Prisma accepts
type JsonValue = Prisma.InputJsonValue

// Enhanced types for audit logging
interface BaseAuditData {
  eventType: AuditEventType
  severity?: AuditSeverity
  success?: boolean
  errorMessage?: string
  
  // User context
  userId?: string
  email?: string
  userRole?: UserRole
  tenantId?: string
  locationId?: string
  
  // Request context
  ipAddress?: string
  userAgent?: string
  subdomain?: string
  requestPath?: string
  requestMethod?: string
  
  // Resource context
  resourceType?: string
  resourceId?: string
  oldValues?: JsonValue
  newValues?: JsonValue
  metadata?: JsonValue
  
  // Performance
  responseTime?: number
  
  // Rate limiting specific
  rateLimitInfo?: {
    wasBlocked?: boolean
    attempts?: number
    retryAfter?: number
    maxAttempts?: number
    windowMs?: number
  }
}

export class AuditService {
  
  /**
   * Log authentication events (login attempts, success, failures)
   */
  static async logAuthEvent(data: {
    eventType: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'ACCOUNT_LOCKED'
    email: string
    success: boolean
    failureReason?: string
    userId?: string
    userRole?: UserRole
    tenantId?: string
    ipAddress?: string
    userAgent?: string
    subdomain?: string
    rateLimitInfo?: BaseAuditData['rateLimitInfo']
    responseTime?: number
  }): Promise<void> {
    
    const severity = this.determineSeverity(data.eventType, data.success, data.rateLimitInfo)
    
    try {
      await prisma.auditLog.create({
        data: {
          eventType: data.eventType as AuditEventType,
          severity,
          success: data.success,
          errorMessage: data.failureReason,
          
          userId: data.userId,
          email: data.email,
          userRole: data.userRole,
          tenantId: data.tenantId,
          
          ipAddress: data.ipAddress || 'unknown',
          userAgent: data.userAgent,
          subdomain: data.subdomain,
          requestPath: '/auth/signin',
          requestMethod: 'POST',
          
          resourceType: 'authentication',
          resourceId: data.userId,
          
          rateLimitInfo: data.rateLimitInfo ? (data.rateLimitInfo as JsonValue) : undefined,
          
          metadata: {
            authEventType: data.eventType,
            failureReason: data.failureReason,
            environment: process.env.NODE_ENV || 'development'
          },
          
          responseTime: data.responseTime,
          timestamp: new Date(),
        }
      })
      
      // Console log for development visibility
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 [${data.eventType}] ${data.email} - ${data.success ? 'SUCCESS' : 'FAILED'}${data.failureReason ? ` (${data.failureReason})` : ''}`)
      }
      
    } catch (error) {
      // Fallback to console if database logging fails
      console.error('❌ Failed to log audit event to database:', error)
      console.log('🔐 FALLBACK AUDIT:', {
        eventType: data.eventType,
        email: data.email,
        success: data.success,
        failureReason: data.failureReason,
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Log user management events
   */
  static async logUserEvent(data: {
    eventType: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_ACTIVATED' | 'USER_DEACTIVATED' | 'USER_ROLE_CHANGED'
    targetUserId: string
    targetUserEmail?: string
    performedByUserId?: string
    performedByEmail?: string
    tenantId?: string
    oldValues?: JsonValue
    newValues?: JsonValue
    ipAddress?: string
    userAgent?: string
    responseTime?: number
  }): Promise<void> {
    
    try {
      await prisma.auditLog.create({
        data: {
          eventType: data.eventType as AuditEventType,
          severity: AuditSeverity.MEDIUM,
          success: true,
          
          userId: data.performedByUserId,
          email: data.performedByEmail,
          tenantId: data.tenantId,
          
          ipAddress: data.ipAddress || 'unknown',
          userAgent: data.userAgent,
          
          resourceType: 'user',
          resourceId: data.targetUserId,
          oldValues: data.oldValues,
          newValues: data.newValues,
          
          metadata: {
            targetUserId: data.targetUserId,
            targetUserEmail: data.targetUserEmail,
            userManagementEvent: data.eventType
          },
          
          responseTime: data.responseTime,
          timestamp: new Date(),
        }
      })
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`👤 [${data.eventType}] User ${data.targetUserEmail} by ${data.performedByEmail}`)
      }
      
    } catch (error) {
      console.error('❌ Failed to log user event:', error)
    }
  }

  /**
   * Log system events
   */
  static async logSystemEvent(data: {
    eventType: 'SYSTEM_BACKUP' | 'SYSTEM_MAINTENANCE' | 'DATA_EXPORT' | 'DATA_IMPORT' | 'RATE_LIMIT_TRIGGERED' | 'SECURITY_VIOLATION'
    success: boolean
    errorMessage?: string
    userId?: string
    email?: string
    ipAddress?: string
    userAgent?: string
    metadata?: JsonValue
    responseTime?: number
  }): Promise<void> {
    
    const severity = data.eventType === 'SECURITY_VIOLATION' ? AuditSeverity.CRITICAL :
                    data.eventType === 'RATE_LIMIT_TRIGGERED' ? AuditSeverity.HIGH :
                    AuditSeverity.MEDIUM
    
    try {
      await prisma.auditLog.create({
        data: {
          eventType: data.eventType as AuditEventType,
          severity,
          success: data.success,
          errorMessage: data.errorMessage,
          
          userId: data.userId,
          email: data.email,
          
          ipAddress: data.ipAddress || 'system',
          userAgent: data.userAgent || 'system',
          
          resourceType: 'system',
          
          metadata: {
            ...(data.metadata as Record<string, unknown> || {}),
            systemEvent: data.eventType,
            environment: process.env.NODE_ENV || 'development'
          } as JsonValue,
          
          responseTime: data.responseTime,
          timestamp: new Date(),
        }
      })
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚙️ [${data.eventType}] ${data.success ? 'SUCCESS' : 'FAILED'}`)
      }
      
    } catch (error) {
      console.error('❌ Failed to log system event:', error)
    }
  }

  /**
   * Log business operation events (rental sessions, F&B, transactions)
   */
  static async logBusinessEvent(data: {
    eventType: 'SESSION_STARTED' | 'SESSION_EXTENDED' | 'SESSION_COMPLETED' | 'FNB_ORDER_CREATED' | 'PAYMENT_RECEIVED'
    success: boolean
    userId?: string
    tenantId?: string
    locationId?: string
    resourceType: string
    resourceId?: string
    amount?: number
    metadata?: JsonValue
    ipAddress?: string
    responseTime?: number
  }): Promise<void> {
    
    try {
      await prisma.auditLog.create({
        data: {
          eventType: data.eventType as AuditEventType,
          severity: AuditSeverity.LOW,
          success: data.success,
          
          userId: data.userId,
          tenantId: data.tenantId,
          locationId: data.locationId,
          
          ipAddress: data.ipAddress || 'system',
          userAgent: 'business-operation',
          
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          
          metadata: {
            ...(data.metadata as Record<string, unknown> || {}),
            amount: data.amount,
            businessEvent: data.eventType
          } as JsonValue,
          
          responseTime: data.responseTime,
          timestamp: new Date(),
        }
      })
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`💼 [${data.eventType}] ${data.resourceType}:${data.resourceId}`)
      }
      
    } catch (error) {
      console.error('❌ Failed to log business event:', error)
    }
  }

  /**
   * Helper method to get client info from request
   */
  static getClientInfo(req?: NextRequest | { headers?: Record<string, string | string[]> | Headers }): {
    ipAddress: string
    userAgent: string
  } {
    if (!req) {
      return {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      }
    }

    // Type guard for Headers object
    const isHeadersObject = (headers: unknown): headers is Headers => {
      return headers !== null && 
             typeof headers === 'object' && 
             'get' in headers && 
             typeof (headers as Record<string, unknown>).get === 'function'
    }

    // Handle NextRequest
    if ('headers' in req && req.headers && typeof req.headers.get === 'function') {
      const headers = req.headers as Headers
      const xForwardedFor = headers.get('x-forwarded-for')
      const xRealIP = headers.get('x-real-ip')
      const userAgent = headers.get('user-agent')
      
      const ipAddress = xForwardedFor?.split(',')[0].trim() || xRealIP || 'unknown'
      
      return {
        ipAddress,
        userAgent: userAgent || 'unknown'
      }
    }

    // Handle regular request object with Headers object
    if ('headers' in req && req.headers && isHeadersObject(req.headers)) {
      const headers = req.headers
      const xForwardedFor = headers.get('x-forwarded-for')
      const xRealIP = headers.get('x-real-ip')
      const userAgent = headers.get('user-agent')
      
      const ipAddress = xForwardedFor?.split(',')[0].trim() || xRealIP || 'unknown'
      
      return {
        ipAddress,
        userAgent: userAgent || 'unknown'
      }
    }

    // Handle plain object headers
    if ('headers' in req && req.headers && typeof req.headers === 'object' && !isHeadersObject(req.headers)) {
      const headers = req.headers as Record<string, string | string[]>
      const xForwardedFor = headers['x-forwarded-for']
      const xRealIP = headers['x-real-ip']
      const userAgent = headers['user-agent']
      
      const ipAddress = Array.isArray(xForwardedFor) 
        ? xForwardedFor[0].split(',')[0].trim()
        : typeof xForwardedFor === 'string' 
          ? xForwardedFor.split(',')[0].trim()
          : Array.isArray(xRealIP)
            ? xRealIP[0]
            : typeof xRealIP === 'string'
              ? xRealIP
              : 'unknown'
      
      const userAgentValue = Array.isArray(userAgent) ? userAgent[0] : userAgent || 'unknown'
      
      return {
        ipAddress,
        userAgent: userAgentValue
      }
    }

    return {
      ipAddress: 'unknown',
      userAgent: 'unknown'
    }
  }

  /**
   * Determine audit severity based on event type and context
   */
  private static determineSeverity(
    eventType: string, 
    success: boolean, 
    rateLimitInfo?: BaseAuditData['rateLimitInfo']
  ): AuditSeverity {
    
    // Critical events
    if (!success && (eventType === 'LOGIN_FAILED' && rateLimitInfo?.wasBlocked)) {
      return AuditSeverity.CRITICAL
    }
    
    // High severity events
    if (eventType === 'ACCOUNT_LOCKED' || (rateLimitInfo && rateLimitInfo.attempts && rateLimitInfo.attempts >= 5)) {
      return AuditSeverity.HIGH
    }
    
    // Medium severity events
    if (eventType === 'LOGIN_FAILED' || eventType === 'LOGIN_SUCCESS') {
      return AuditSeverity.MEDIUM
    }
    
    // Default to low
    return AuditSeverity.LOW
  }

  /**
   * Get recent audit logs for monitoring (useful for admin dashboard)
   */
  static async getRecentLogs(options?: {
    limit?: number
    eventTypes?: AuditEventType[]
    severity?: AuditSeverity
    userId?: string
    tenantId?: string
    since?: Date
  }) {
    try {
      const where: Prisma.AuditLogWhereInput = {}
      
      if (options?.eventTypes?.length) {
        where.eventType = { in: options.eventTypes }
      }
      
      if (options?.severity) {
        where.severity = options.severity
      }
      
      if (options?.userId) {
        where.userId = options.userId
      }
      
      if (options?.tenantId) {
        where.tenantId = options.tenantId
      }
      
      if (options?.since) {
        where.timestamp = { gte: options.since }
      }
      
      return await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options?.limit || 50,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true
            }
          },
          location: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      })
      
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      return []
    }
  }

  /**
   * Clean up old audit logs (retention policy)
   */
  static async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      
      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          },
          // Keep critical and high severity logs longer
          severity: {
            in: [AuditSeverity.LOW, AuditSeverity.MEDIUM]
          }
        }
      })
      
      console.log(`🧹 Cleaned up ${result.count} old audit logs older than ${retentionDays} days`)
      return result.count
      
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error)
      return 0
    }
  }
}