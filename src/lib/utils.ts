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

/**
 * Deobfuscate phone number
 * Phone numbers are stored obfuscated (reversed + base64) to prevent scraping
 * @param obfuscated - Base64 encoded reversed phone number
 * @returns Original phone number
 */
export function deobfuscatePhone(obfuscated: string): string {
  if (!obfuscated) return ''
  
  try {
    // For Node.js (server-side)
    if (typeof Buffer !== 'undefined') {
      const decoded = Buffer.from(obfuscated, 'base64').toString('utf-8')
      return decoded.split('').reverse().join('')
    }
    
    // For browser (client-side)
    const decoded = atob(obfuscated)
    return decoded.split('').reverse().join('')
  } catch {
    return obfuscated // Fallback if not encoded
  }
}

/**
 * Obfuscate phone number for storage
 * @param phone - Plain phone number
 * @returns Base64 encoded reversed phone number
 */
export function obfuscatePhone(phone: string): string {
  if (!phone) return ''
  
  try {
    const reversed = phone.split('').reverse().join('')
    
    // For Node.js (server-side)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(reversed).toString('base64')
    }
    
    // For browser (client-side)
    return btoa(reversed)
  } catch {
    return phone
  }
}
