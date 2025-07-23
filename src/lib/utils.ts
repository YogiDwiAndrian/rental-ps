// src/lib/utils.ts - Proper TypeScript typing
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Type for values that can be converted to number
type NumberLike = string | number | bigint | { toString(): string } | { toNumber?(): number }

// Currency formatting dengan "Rp" prefix
export function formatCurrency(amount: NumberLike): string {
  let numAmount: number
  
  // Handle different types
  if (typeof amount === 'object' && amount !== null) {
    // Handle Prisma Decimal which has toNumber method
    if ('toNumber' in amount && typeof amount.toNumber === 'function') {
      numAmount = amount.toNumber()
    } else {
      numAmount = Number(amount.toString())
    }
  } else {
    numAmount = Number(amount)
  }
  
  // Handle invalid numbers
  if (isNaN(numAmount)) {
    return "Rp 0"
  }
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount)
}

// Number formatting tanpa currency symbol
export function formatNumber(amount: NumberLike): string {
  let numAmount: number
  
  if (typeof amount === 'object' && amount !== null) {
    if ('toNumber' in amount && typeof amount.toNumber === 'function') {
      numAmount = amount.toNumber()
    } else {
      numAmount = Number(amount.toString())
    }
  } else {
    numAmount = Number(amount)
  }
  
  if (isNaN(numAmount)) {
    return "0"
  }
  
  return numAmount.toLocaleString('id-ID')
}