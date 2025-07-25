// src/lib/failed-login-rate-limiter.ts
import { NextRequest } from 'next/server'

interface FailedLoginEntry {
  count: number
  firstAttempt: number
  blockedUntil?: number
  lastAttempt: number
}

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxAttempts: number // Max failed attempts per window
  blockDurationMs: number // How long to block after exceeding limit
}

// In-memory store (in production, use Redis)
const failedLoginStore = new Map<string, FailedLoginEntry>()

// Different rate limits for different environments
const FAILED_LOGIN_CONFIGS: Record<string, RateLimitConfig> = {
  development: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxAttempts: 10, // 10 failed attempts per 10 minutes
    blockDurationMs: 5 * 60 * 1000 // Block for 5 minutes
  },
  production: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5, // 5 failed attempts per 15 minutes
    blockDurationMs: 30 * 60 * 1000 // Block for 30 minutes
  }
}

export class FailedLoginRateLimiter {
  private static getConfig(): RateLimitConfig {
    const env = process.env.NODE_ENV || 'development'
    return FAILED_LOGIN_CONFIGS[env] || FAILED_LOGIN_CONFIGS.development
  }

  private static getIdentifierKey(ip: string, email: string): string {
    // Combine IP and email for more precise tracking
    return `failed_login:${ip}:${email.toLowerCase()}`
  }

  // Check if IP/email combination is currently blocked
  static isBlocked(ip: string, email: string): {
    blocked: boolean
    retryAfter?: number
    attempts?: number
  } {
    const config = this.getConfig()
    const key = this.getIdentifierKey(ip, email)
    const now = Date.now()
    
    let entry = failedLoginStore.get(key)
    
    // Clean expired entries
    if (entry && (now - entry.firstAttempt > config.windowMs)) {
      failedLoginStore.delete(key)
      entry = undefined
    }
    
    // Check if currently blocked
    if (entry?.blockedUntil && now < entry.blockedUntil) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000)
      
      console.log('🚫 FAILED LOGIN BLOCKED:', {
        ip: ip.replace(/\d+\.\d+\.\d+\.\d+/, '[IP_HIDDEN]'),
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        attempts: entry.count,
        retryAfter,
        blockedUntil: new Date(entry.blockedUntil).toISOString()
      })
      
      return {
        blocked: true,
        retryAfter,
        attempts: entry.count
      }
    }
    
    return { blocked: false }
  }

  // Record a failed login attempt
  static recordFailedAttempt(ip: string, email: string): {
    blocked: boolean
    attempts: number
    retryAfter?: number
  } {
    const config = this.getConfig()
    const key = this.getIdentifierKey(ip, email)
    const now = Date.now()
    
    let entry = failedLoginStore.get(key)
    
    // Clean expired entries
    if (entry && (now - entry.firstAttempt > config.windowMs)) {
      failedLoginStore.delete(key)
      entry = undefined
    }
    
    // Initialize or update entry
    if (!entry) {
      entry = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      }
    } else {
      entry.count++
      entry.lastAttempt = now
    }
    
    // Check if should be blocked
    if (entry.count >= config.maxAttempts) {
      entry.blockedUntil = now + config.blockDurationMs
      
      console.log('🚫 FAILED LOGIN LIMIT EXCEEDED:', {
        ip: ip.replace(/\d+\.\d+\.\d+\.\d+/, '[IP_HIDDEN]'),
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        attempts: entry.count,
        maxAttempts: config.maxAttempts,
        blockedFor: Math.ceil(config.blockDurationMs / 60000) + ' minutes',
        blockedUntil: new Date(entry.blockedUntil).toISOString()
      })
      
      failedLoginStore.set(key, entry)
      
      return {
        blocked: true,
        attempts: entry.count,
        retryAfter: Math.ceil(config.blockDurationMs / 1000)
      }
    }
    
    failedLoginStore.set(key, entry)
    
    console.log('⚠️ FAILED LOGIN RECORDED:', {
      ip: ip.replace(/\d+\.\d+\.\d+\.\d+/, '[IP_HIDDEN]'),
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      attempts: entry.count,
      maxAttempts: config.maxAttempts,
      timeWindow: Math.ceil(config.windowMs / 60000) + ' minutes'
    })
    
    return {
      blocked: false,
      attempts: entry.count
    }
  }

  // Clear failed attempts for successful login
  static clearFailedAttempts(ip: string, email: string): void {
    const key = this.getIdentifierKey(ip, email)
    const hadEntry = failedLoginStore.has(key)
    
    if (hadEntry) {
      const entry = failedLoginStore.get(key)
      failedLoginStore.delete(key)
      
      console.log('✅ FAILED LOGIN CLEARED:', {
        ip: ip.replace(/\d+\.\d+\.\d+\.\d+/, '[IP_HIDDEN]'),
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        previousAttempts: entry?.count || 0,
        reason: 'successful_login'
      })
    }
  }

  // Get client IP from request
  static getClientIP(req: NextRequest | { headers?: { [key: string]: string } | Headers }): string {
    // Handle NextRequest (has .get method)
    if ('headers' in req && req.headers && typeof req.headers.get === 'function') {
      const headers = req.headers as Headers
      const xForwardedFor = headers.get('x-forwarded-for')
      const xRealIP = headers.get('x-real-ip')
      const cfConnectingIP = headers.get('cf-connecting-ip')
      
      if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim()
      }
      if (cfConnectingIP) return cfConnectingIP
      if (xRealIP) return xRealIP
    }
    
    // Handle regular object with headers (plain object)
    if ('headers' in req && req.headers && typeof req.headers === 'object' && !('get' in req.headers)) {
      const headers = req.headers as { [key: string]: string }
      const xForwardedFor = headers['x-forwarded-for']
      const xRealIP = headers['x-real-ip']
      const cfConnectingIP = headers['cf-connecting-ip']
      
      if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim()
      }
      if (cfConnectingIP) return cfConnectingIP
      if (xRealIP) return xRealIP
    }
    
    return 'unknown'
  }

  // Cleanup old entries (call periodically)
  static cleanup(): number {
    const now = Date.now()
    const config = this.getConfig()
    let cleaned = 0
    
    for (const [key, entry] of failedLoginStore.entries()) {
      // Remove entries older than window + block duration
      const maxAge = config.windowMs + config.blockDurationMs
      if (now - entry.firstAttempt > maxAge) {
        failedLoginStore.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 FAILED LOGIN CLEANUP: Removed ${cleaned} expired entries`)
    }
    
    return cleaned
  }

  // Development helper - get current stats
  static getStats(): {
    totalEntries: number
    blockedEntries: number
    environment: string
    config: RateLimitConfig
  } {
    const now = Date.now()
    const config = this.getConfig()
    let blockedCount = 0
    
    for (const entry of failedLoginStore.values()) {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        blockedCount++
      }
    }
    
    return {
      totalEntries: failedLoginStore.size,
      blockedEntries: blockedCount,
      environment: process.env.NODE_ENV || 'development',
      config
    }
  }
}

// Auto-cleanup every 15 minutes
setInterval(() => {
  FailedLoginRateLimiter.cleanup()
}, 15 * 60 * 1000)

// Development helper
if (process.env.NODE_ENV === 'development') {
  // Log stats every 5 minutes in development
  setInterval(() => {
    const stats = FailedLoginRateLimiter.getStats()
    if (stats.totalEntries > 0) {
      console.log('📊 FAILED LOGIN STATS:', stats)
    }
  }, 5 * 60 * 1000)
}