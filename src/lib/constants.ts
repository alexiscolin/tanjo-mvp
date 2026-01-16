/**
 * Application constants and default values
 */

/**
 * Special gift ID for free contributions (virtual pot)
 */
export const FREE_CONTRIBUTION_ID = 'FREE_CONTRIBUTION'

/**
 * Fake price for free contribution pot (very high to never be reached)
 */
export const FREE_CONTRIBUTION_PRICE = 999999999

/**
 * Default configuration values
 * Used as fallback when spreadsheet config is unavailable or invalid
 */
export const DEFAULT_CONFIG = {
  /** Minimum gift price (in JPY) to suggest pot mode */
  POT_THRESHOLD_JPY: 18000,
  
  /** Minimum contribution amount (in JPY) */
  MIN_CONTRIBUTION_JPY: 500,
  
  /** Suggested contribution amounts (in JPY) */
  SUGGESTED_CONTRIBUTIONS_JPY: [1000, 2500, 5000, 10000],
} as const
