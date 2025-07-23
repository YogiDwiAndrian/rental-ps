// src/lib/db-health.ts
import { prisma } from './prisma'

export type DatabaseStatus = {
  isConnected: boolean
  error?: string
  responseTime?: number
}

export async function checkDatabaseConnection(): Promise<DatabaseStatus> {
  const startTime = Date.now()
  
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`
    
    const responseTime = Date.now() - startTime
    
    return {
      isConnected: true,
      responseTime
    }
  } catch (error) {
    console.error('Database connection failed:', error)
    
    let errorMessage = 'Database connection failed'
    
    if (error instanceof Error) {
      // Specific error messages based on error type
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Database server is not running. Please start Docker containers.'
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Database host not found. Check your DATABASE_URL configuration.'
      } else if (error.message.includes('authentication failed')) {
        errorMessage = 'Database authentication failed. Check username/password in DATABASE_URL.'
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        errorMessage = 'Database does not exist. Run migration first: npm run db:migrate'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Database connection timeout. Check if PostgreSQL is running.'
      } else {
        errorMessage = `Database error: ${error.message}`
      }
    }
    
    return {
      isConnected: false,
      error: errorMessage
    }
  }
}

export async function checkDatabaseTables(): Promise<{ hasRequiredTables: boolean; missingTables?: string[] }> {
  try {
    // Check if required tables exist
    const requiredTables = ['users', 'tenants', 'locations', 'units']
    const missingTables: string[] = []
    
    for (const tableName of requiredTables) {
      try {
        await prisma.$queryRawUnsafe(`SELECT 1 FROM ${tableName} LIMIT 1`)
      } catch (error) {
        if (error instanceof Error && error.message.includes('does not exist')) {
          missingTables.push(tableName)
        }
      }
    }
    
    return {
      hasRequiredTables: missingTables.length === 0,
      missingTables: missingTables.length > 0 ? missingTables : undefined
    }
  } catch (error) {
    console.error('Error checking database tables:', error)
    return {
      hasRequiredTables: false,
      missingTables: ['Unable to check tables']
    }
  }
}

// Health check endpoint data
export async function getDatabaseHealth() {
  const connectionStatus = await checkDatabaseConnection()
  
  if (!connectionStatus.isConnected) {
    return {
      status: 'error',
      connection: connectionStatus,
      tables: { hasRequiredTables: false }
    }
  }
  
  const tablesStatus = await checkDatabaseTables()
  
  return {
    status: connectionStatus.isConnected && tablesStatus.hasRequiredTables ? 'healthy' : 'warning',
    connection: connectionStatus,
    tables: tablesStatus
  }
}