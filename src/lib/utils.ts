// src/lib/utils.ts - Updated with Decimal support
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Decimal } from "@prisma/client/runtime/library"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number as Indonesian Rupiah currency
 * @param amount - Number, string, or Decimal to format
 * @returns Formatted currency string (e.g., "Rp 15,000")
 */
export function formatCurrency(amount: number | string | Decimal): string {
  // Convert Decimal or string to number
  const numericAmount = typeof amount === 'number' 
    ? amount 
    : Number(amount.toString())
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount)
}

/**
 * Convert Prisma Decimal to number safely
 * @param decimal - Prisma Decimal value
 * @returns Number value
 */
export function decimalToNumber(decimal: Decimal | number | string): number {
  if (typeof decimal === 'number') return decimal
  return Number(decimal.toString())
}

/**
 * Format duration in minutes to human readable format
 * @param minutes - Duration in minutes
 * @returns Formatted duration (e.g., "2h 30m")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}m`
  }
  
  if (mins === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${mins}m`
}

/**
 * Format date to Indonesian locale
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', options).format(dateObj)
}

/**
 * Format time to Indonesian locale
 * @param date - Date to format
 * @returns Formatted time string (e.g., "14:30")
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(dateObj)
}

/**
 * Calculate percentage
 * @param value - Current value
 * @param total - Total value
 * @returns Percentage as number
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}