// src/lib/work-session-utils.ts
import { Decimal } from "@prisma/client/runtime/library"

export interface WorkSessionDuration {
  hours: number
  minutes: number
  totalMinutes: number
}

export interface WorkSessionSummary {
  duration: WorkSessionDuration
  totalRevenue: number
  totalSessions: number
  averageRevenuePerHour: number
  performanceScore: 'excellent' | 'good' | 'average' | 'needs_improvement'
}

/**
 * Calculate work session duration
 */
export function calculateWorkSessionDuration(
  startTime: Date,
  endTime?: Date | null
): WorkSessionDuration {
  const start = startTime.getTime()
  const end = endTime ? endTime.getTime() : Date.now()
  
  const totalMinutes = Math.floor((end - start) / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  return {
    hours,
    minutes,
    totalMinutes
  }
}

/**
 * Format work session duration to human readable string
 */
export function formatWorkSessionDuration(duration: WorkSessionDuration): string {
  if (duration.hours === 0) {
    return `${duration.minutes}m`
  }
  
  if (duration.minutes === 0) {
    return `${duration.hours}h`
  }
  
  return `${duration.hours}h ${duration.minutes}m`
}

/**
 * Calculate work session summary with performance metrics
 */
export function calculateWorkSessionSummary(
  startTime: Date,
  endTime: Date | null,
  totalRevenue: Decimal | number,
  totalSessions: number
): WorkSessionSummary {
  const duration = calculateWorkSessionDuration(startTime, endTime)
  const revenue = typeof totalRevenue === 'number' ? totalRevenue : Number(totalRevenue.toString())
  
  // Calculate average revenue per hour
  const hoursWorked = duration.totalMinutes / 60
  const averageRevenuePerHour = hoursWorked > 0 ? revenue / hoursWorked : 0
  
  // Determine performance score based on revenue per hour
  let performanceScore: WorkSessionSummary['performanceScore']
  if (averageRevenuePerHour >= 100000) {
    performanceScore = 'excellent'
  } else if (averageRevenuePerHour >= 75000) {
    performanceScore = 'good'
  } else if (averageRevenuePerHour >= 50000) {
    performanceScore = 'average'
  } else {
    performanceScore = 'needs_improvement'
  }
  
  return {
    duration,
    totalRevenue: revenue,
    totalSessions,
    averageRevenuePerHour,
    performanceScore
  }
}

/**
 * Get performance score color for UI
 */
export function getPerformanceScoreColor(score: WorkSessionSummary['performanceScore']): {
  bg: string
  text: string
  border: string
} {
  switch (score) {
    case 'excellent':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200'
      }
    case 'good':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200'
      }
    case 'average':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200'
      }
    case 'needs_improvement':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200'
      }
  }
}

/**
 * Get performance score label
 */
export function getPerformanceScoreLabel(score: WorkSessionSummary['performanceScore']): string {
  switch (score) {
    case 'excellent':
      return 'Excellent'
    case 'good':
      return 'Good'
    case 'average':
      return 'Average'
    case 'needs_improvement':
      return 'Needs Improvement'
  }
}

/**
 * Format remaining time for active session
 */
export function formatRemainingTime(
  startTime: Date,
  targetDurationMinutes?: number
): { hours: number; minutes: number; isOvertime: boolean } {
  if (!targetDurationMinutes) {
    // No target duration, just show elapsed time
    const duration = calculateWorkSessionDuration(startTime)
    return {
      hours: duration.hours,
      minutes: duration.minutes,
      isOvertime: false
    }
  }
  
  const elapsed = calculateWorkSessionDuration(startTime)
  const remaining = targetDurationMinutes - elapsed.totalMinutes
  
  if (remaining <= 0) {
    // Overtime
    const overtime = Math.abs(remaining)
    return {
      hours: Math.floor(overtime / 60),
      minutes: overtime % 60,
      isOvertime: true
    }
  }
  
  return {
    hours: Math.floor(remaining / 60),
    minutes: remaining % 60,
    isOvertime: false
  }
}

/**
 * Check if work session is considered long (>8 hours)
 */
export function isLongWorkSession(startTime: Date, endTime?: Date | null): boolean {
  const duration = calculateWorkSessionDuration(startTime, endTime)
  return duration.totalMinutes > 8 * 60 // More than 8 hours
}

/**
 * Get shift status message
 */
export function getShiftStatusMessage(
  startTime: Date,
  scheduledEndTime?: Date,
  currentRevenue?: Decimal | number
): string {
  const duration = calculateWorkSessionDuration(startTime)
  const revenue = currentRevenue ? 
    (typeof currentRevenue === 'number' ? currentRevenue : Number(currentRevenue.toString())) : 0
  
  if (scheduledEndTime && Date.now() > scheduledEndTime.getTime()) {
    return `Overtime: ${formatWorkSessionDuration(duration)}`
  }
  
  if (duration.totalMinutes > 8 * 60) {
    return `Long shift: ${formatWorkSessionDuration(duration)}`
  }
  
  if (revenue > 500000) {
    return `Great performance: ${formatWorkSessionDuration(duration)}`
  }
  
  return `Active: ${formatWorkSessionDuration(duration)}`
}