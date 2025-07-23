// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { getDatabaseHealth } from '@/lib/db-health'

export async function GET() {
  try {
    const health = await getDatabaseHealth()
    
    // Return appropriate HTTP status based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503
    
    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      error: 'Health check failed',
      connection: {
        isConnected: false,
        error: 'Unable to perform health check'
      },
      tables: {
        hasRequiredTables: false
      }
    }, { status: 503 })
  }
}