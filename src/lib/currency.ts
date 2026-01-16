// ============================================================================
// Configuration
// ============================================================================
const EXCHANGE_RATE_API_URL = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/JPY'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds (rates change slowly)
const FALLBACK_RATE_EUR = 0.00625 // 1 JPY ≈ 0.00625 EUR (fallback rate)
const FALLBACK_RATE_USD = 0.0069 // 1 JPY ≈ 0.0069 USD (fallback rate)
const DEBUG = process.env.NODE_ENV === 'development'

// ============================================================================
// Types
// ============================================================================
export type Currency = 'EUR' | 'JPY' | 'USD'

/**
 * List of supported currencies
 */
export const CURRENCIES: Currency[] = ['EUR', 'JPY', 'USD'] as const

/**
 * Exchange rates from JPY (base currency) to EUR and USD
 */
export type ExchangeRates = {
  EUR: number // 1 JPY = X EUR
  USD: number // 1 JPY = X USD
}

// ============================================================================
// Cache
// ============================================================================
let cachedRate: ExchangeRates | null = null
let cacheTimestamp: number | null = null

// ============================================================================
// Automatic currency detection
// ============================================================================

/**
 * Detects preferred currency based on browser timezone AND locale
 * No geolocation permission needed!
 */
export function detectPreferredCurrency(): Currency {
  if (typeof window === 'undefined') return 'EUR'
  
  // 1. Check if there's a saved preference
  const savedCurrency = localStorage.getItem('preferredCurrency') as Currency | null
  if (savedCurrency && CURRENCIES.includes(savedCurrency)) {
    if (DEBUG) console.log('💾 Saved currency:', savedCurrency)
    return savedCurrency
  }
  
  // 2. Detect by timezone (more reliable than locale!)
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (DEBUG) console.log('🌏 Detected timezone:', timeZone)
    
    // Japan
    if (timeZone.startsWith('Asia/Tokyo')) return 'JPY'
    
    // USA
    if (timeZone.startsWith('America/')) {
      // Exclude South/Central America for some cases
      if (timeZone.includes('New_York') || 
          timeZone.includes('Chicago') || 
          timeZone.includes('Denver') || 
          timeZone.includes('Los_Angeles') ||
          timeZone.includes('Phoenix')) {
        return 'USD'
      }
    }
    
    // Europe
    if (timeZone.startsWith('Europe/')) return 'EUR'
  } catch (error) {
    if (DEBUG) console.warn('⚠️ Unable to detect timezone')
  }
  
  // 3. Fallback to browser locale
  const locale = navigator.language || 'en-US'
  if (DEBUG) console.log('🌐 Detected locale:', locale)
  
  if (locale.startsWith('ja')) return 'JPY'
  if (locale.startsWith('en-US')) return 'USD'
  if (locale.startsWith('en-GB')) return 'EUR'
  if (locale.includes('FR') || locale.includes('BE') || locale.includes('IT') || 
      locale.includes('ES') || locale.includes('DE') || locale.includes('PT') ||
      locale.includes('NL') || locale.includes('AT')) {
    return 'EUR'
  }
  
  // Default EUR
  return 'EUR'
}

/**
 * Saves user's currency preference
 */
export function savePreferredCurrency(currency: Currency): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('preferredCurrency', currency)
  if (DEBUG) console.log('✅ Currency saved:', currency)
}

// ============================================================================
// Exchange rate fetching
// ============================================================================

/**
 * Fetches real-time exchange rates from JPY to EUR and USD
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  // Check cache
  if (cachedRate && cacheTimestamp) {
    const now = Date.now()
    if (now - cacheTimestamp < CACHE_DURATION) {
      if (DEBUG) console.log('📊 Using cached rates')
      return cachedRate
    }
  }

  try {
    if (DEBUG) console.log('🌐 Fetching exchange rates from JPY...')
    
    const response = await fetch(EXCHANGE_RATE_API_URL, {
      next: { revalidate: 86400 } // Next.js cache for 24h
    })
    
    if (!response.ok) {
      throw new Error('API rate response not ok')
    }

    const data = await response.json()
    const rates: ExchangeRates = {
      EUR: data.rates.EUR || FALLBACK_RATE_EUR,
      USD: data.rates.USD || FALLBACK_RATE_USD,
    }
    
    // Update cache
    cachedRate = rates
    cacheTimestamp = Date.now()
    
    if (DEBUG) console.log('✅ Rates fetched:', rates)
    return rates
  } catch (error) {
    if (DEBUG) console.error('⚠️ Exchange rate API error, using fallback rates')
    return { EUR: FALLBACK_RATE_EUR, USD: FALLBACK_RATE_USD }
  }
}

// ============================================================================
// Currency conversion
// ============================================================================

/**
 * Converts from yens (JPY - base currency) to target currency
 * @param jpy Amount in yens (no cents, yen doesn't have them)
 * @param targetCurrency Target currency (EUR, JPY, USD)
 * @param rates Exchange rates from JPY
 * @returns Amount in target currency (in cents for EUR/USD, in yens for JPY)
 */
export function convertFromJpy(jpy: number, targetCurrency: Currency, rates: ExchangeRates): number {
  switch (targetCurrency) {
    case 'JPY':
      return jpy // Already in yen
    case 'EUR':
      return Math.round(jpy * rates.EUR * 100) // Convert to EUR cents
    case 'USD':
      return Math.round(jpy * rates.USD * 100) // Convert to USD cents
    default:
      return jpy
  }
}

/**
 * Converts from a currency to yens (JPY - base currency)
 * @param amount Amount (in cents for EUR/USD, in yens for JPY)
 * @param fromCurrency Source currency
 * @param rates Exchange rates from JPY
 * @returns Amount in yens
 */
export function convertToJpy(amount: number, fromCurrency: Currency, rates: ExchangeRates): number {
  switch (fromCurrency) {
    case 'JPY':
      return amount
    case 'EUR':
      // amount is in EUR cents
      return Math.round((amount / 100) / rates.EUR)
    case 'USD':
      // amount is in USD cents
      return Math.round((amount / 100) / rates.USD)
    default:
      return amount
  }
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Formats an amount in the specified currency
 * @param jpy Amount in yens (base currency)
 * @param currency Display currency
 * @param rates Exchange rates from JPY
 */
export function formatCurrency(jpy: number, currency: Currency, rates: ExchangeRates): string {
  const amount = convertFromJpy(jpy, currency, rates)
  
  const localeMap: Record<Currency, string> = {
    EUR: 'fr-FR',
    JPY: 'ja-JP',
    USD: 'en-US',
  }
  
  // For JPY, amount is in yen (no cents)
  // For EUR/USD, amount is in cents
  const displayAmount = currency === 'JPY' 
    ? amount 
    : amount / 100
  
  return new Intl.NumberFormat(localeMap[currency], {
    style: 'currency',
    currency: currency,
  }).format(displayAmount)
}

/**
 * Currency symbols
 */
export const currencySymbols: Record<Currency, string> = {
  EUR: '€',
  JPY: '¥',
  USD: '$',
}

/**
 * Currency labels
 */
export const currencyLabels: Record<Currency, string> = {
  EUR: 'Euro',
  JPY: 'Yen',
  USD: 'Dollar',
}

// ============================================================================
// Admin utility functions
// ============================================================================

/**
 * Formats an amount in yens (base currency)
 */
export function formatJpy(jpy: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(jpy)
}

/**
 * Formats an amount in euros
 */
export function formatEur(jpy: number, rates: ExchangeRates): string {
  const eurCents = convertFromJpy(jpy, 'EUR', rates)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(eurCents / 100)
}

/**
 * Formats a price displaying both yen and euro (for admin)
 */
export function formatDualPrice(jpy: number, rates: ExchangeRates): string {
  return `${formatJpy(jpy)} (${formatEur(jpy, rates)})`
}
