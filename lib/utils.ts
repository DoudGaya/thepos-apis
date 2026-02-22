import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function parseDataSizeToMb(size: string): number {
  if (!size) {
    console.warn('[parseDataSizeToMb] Empty input')
    return 0
  }
  
  // Remove whitespace and convert to uppercase
  const normalized = size.toUpperCase().replace(/\s/g, '')
  
  // Check if input is just a number (assume MB)
  if (/^\d+(\.\d+)?$/.test(normalized)) {
      return Math.round(parseFloat(normalized))
  }

  // Extract number
  const match = normalized.match(/(\d+(\.\d+)?)/)
  if (!match) {
    console.warn(`[parseDataSizeToMb] Failed to parse number from: "${size}"`)
    return 0
  }
  const value = parseFloat(match[0])

  if (normalized.includes('TB')) {
    return Math.round(value * 1024 * 1024)
  }
  
  if (normalized.includes('GB')) {
    return Math.round(value * 1024)
  }

  if (normalized.includes('KB')) {
    return Math.round(value / 1024)
  }
  
  // Handle case where unit might be separated or implicit, assume MB if no other unit matched
  // But also check if it contains MB/M
  if (normalized.includes('MB') || normalized.endsWith('M')) {
      return Math.round(value)
  }

  // Default fallback (log warning if unit is unclear but return MB value)
  // console.debug(`[parseDataSizeToMb] No unit found for "${size}", defaulting to MB`)
  return Math.round(value)
}
