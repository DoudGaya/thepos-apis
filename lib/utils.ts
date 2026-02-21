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
  if (!size) return 0
  
  // Remove whitespace and convert to uppercase
  const normalized = size.toUpperCase().replace(/\s/g, '')
  const value = parseFloat(normalized)
  
  if (isNaN(value)) return 0
  
  if (normalized.includes('TB')) {
    return Math.round(value * 1024 * 1024)
  }
  
  if (normalized.includes('GB')) {
    return Math.round(value * 1024)
  }

  if (normalized.includes('KB')) {
    return Math.round(value / 1024)
  }
  
  // Default to MB (e.g. "500MB" or just "500")
  return Math.round(value)
}
