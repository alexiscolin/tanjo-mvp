import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind classes with clsx
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Sanitize string input (remove HTML tags, trim, limit length)
 * @param input - Raw string input
 * @returns Sanitized string (max 500 chars)
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '')
    .trim()
    .substring(0, 500)
}

/**
 * Validate and sanitize name
 * @param name - Name to validate
 * @returns Sanitized name
 * @throws Error if name is less than 2 characters
 */
export function sanitizeName(name: string): string {
  const sanitized = sanitizeString(name)
  if (sanitized.length < 2) {
    throw new Error('Name must be at least 2 characters')
  }
  return sanitized
}

/**
 * Validate price (must be positive finite number)
 * @param price - Price to validate
 * @returns True if valid price
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
    if (typeof Buffer !== 'undefined') {
      const decoded = Buffer.from(obfuscated, 'base64').toString('utf-8')
      return decoded.split('').reverse().join('')
    }
    const decoded = atob(obfuscated)
    return decoded.split('').reverse().join('')
  } catch {
    return obfuscated
  }
}

/**
 * Obfuscate phone number for storage
 * Uses reversed + base64 encoding to prevent scraping
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

/**
 * Contribution input from API request
 */
export interface ContributionInput {
  name: string
  email: string
  amount: number
  message?: string
  currency?: string
}

/**
 * Validated and sanitized contribution
 */
export interface ValidatedContribution {
  name: string
  email: string
  amount: number
  message: string
  currency: string
}

/**
 * Validation error response
 */
export interface ValidationError {
  error: string
  status: 400
}

/**
 * Validate and sanitize contribution input
 * @param input - Raw contribution data from request
 * @returns Validated contribution or validation error
 */
export function validateContribution(
  input: Partial<ContributionInput>
): ValidatedContribution | ValidationError {
  const { name, email, amount, message, currency } = input

  if (!name || !email || amount === undefined || amount === null) {
    return { error: 'Missing required fields', status: 400 }
  }

  if (!isValidEmail(email)) {
    return { error: 'Invalid email format', status: 400 }
  }

  if (!isValidPrice(amount) || amount < 100) {
    return { error: 'Invalid or too small amount (minimum 100 JPY)', status: 400 }
  }

  return {
    name: sanitizeName(name),
    email: email.trim().toLowerCase(),
    amount: Math.round(amount),
    message: sanitizeString(message || ''),
    currency: currency || 'JPY',
  }
}

/**
 * Type guard to check if validation result is an error
 * @param result - Validation result to check
 * @returns True if result is a ValidationError
 */
export function isValidationError(
  result: ValidatedContribution | ValidationError
): result is ValidationError {
  return 'error' in result
}
