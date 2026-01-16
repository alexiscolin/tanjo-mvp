import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Sanitize string input (remove HTML tags, trim)
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim()
    .substring(0, 500) // Limit length
}

/**
 * Validate and sanitize name
 */
export function sanitizeName(name: string): string {
  const sanitized = sanitizeString(name)
  if (sanitized.length < 2) {
    throw new Error('Name must be at least 2 characters')
  }
  return sanitized
}

/**
 * Validate price (must be positive number)
 */
export function isValidPrice(price: number): boolean {
  return typeof price === 'number' && price > 0 && isFinite(price)
}
