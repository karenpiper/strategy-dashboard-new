import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get today's date in YYYY-MM-DD format using UTC timezone.
 * This ensures consistent date calculation regardless of server timezone.
 * 
 * @returns {string} Today's date in YYYY-MM-DD format (UTC)
 */
export function getTodayDateUTC(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
