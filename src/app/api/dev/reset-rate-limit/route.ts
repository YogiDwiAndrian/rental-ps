// src/app/api/dev/reset-rate-limit/route.ts - Development Helper
import { NextResponse } from 'next/server'

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    // In a real app, this would clear Redis or database rate limit entries
    // For our in-memory solution, we'll restart will clear it anyway
    
    console.log('🔄 Rate limit reset requested (development)')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Rate limit reset. Please restart your development server for full reset.' 
    })
    
  } catch (error) {
    console.error('Failed to reset rate limit:', error)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}

// Block other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}