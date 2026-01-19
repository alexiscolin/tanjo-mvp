// ============================================================================
// Configuration
// ============================================================================
const EXCHANGE_RATE_API_URL =
  process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_URL ?? "https://open.er-api.com/v6/latest/JPY";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds (rates change slowly)
const FALLBACK_RATE_EUR = 0.00625; // 1 JPY ≈ 0.00625 EUR (fallback rate)
const FALLBACK_RATE_USD = 0.0069; // 1 JPY ≈ 0.0069 USD (fallback rate)
const isDebugMode = process.env.NODE_ENV === "development";

// ============================================================================
// Types
// ============================================================================
export type Currency = "EUR" | "JPY" | "USD";

/**
 * Currency constants - Use these instead of magic strings!
 */
export const CURRENCY = {
  EUR: "EUR" as const,
  JPY: "JPY" as const,
  USD: "USD" as const,
} as const;

/**
 * Default/Base currency for the application
 */
export const BASE_CURRENCY = CURRENCY.JPY;

/**
 * Default fallback currency
 */
export const DEFAULT_CURRENCY = CURRENCY.EUR;

/**
 * List of supported currencies
 */
export const CURRENCIES: Currency[] = ["EUR", "JPY", "USD"] as const;

/**
 * Exchange rates from JPY (base currency) to EUR and USD
 */
export interface ExchangeRates {
  EUR: number; // 1 JPY = X EUR
  USD: number; // 1 JPY = X USD
}

// ============================================================================
// Cache
// ============================================================================
let cachedRate: ExchangeRates | null = null;
let cacheTimestamp: number | null = null;

// ============================================================================
// Automatic currency detection
// ============================================================================

/**
 * Detects preferred currency based on browser timezone AND locale
 * No geolocation permission needed!
 */
export function detectPreferredCurrency(): Currency {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;

  // 1. Check if there's a saved preference
  const savedCurrency = localStorage.getItem("preferredCurrency") as Currency | null;

  if (savedCurrency && CURRENCIES.includes(savedCurrency)) {
    if (isDebugMode) console.warn("💾 Saved currency:", savedCurrency);

    return savedCurrency;
  }

  // 2. Detect by timezone (more reliable than locale!)
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (isDebugMode) console.warn("🌏 Detected timezone:", timeZone);

    // Japan
    if (timeZone.startsWith("Asia/Tokyo")) return CURRENCY.JPY;

    // USA
    if (timeZone.startsWith("America/")) {
      // Exclude South/Central America for some cases
      if (
        timeZone.includes("New_York") ||
        timeZone.includes("Chicago") ||
        timeZone.includes("Denver") ||
        timeZone.includes("Los_Angeles") ||
        timeZone.includes("Phoenix")
      ) {
        return CURRENCY.USD;
      }
    }

    // Europe
    if (timeZone.startsWith("Europe/")) return CURRENCY.EUR;
  } catch {
    if (isDebugMode) console.warn("⚠️ Unable to detect timezone");
  }

  // 3. Fallback to browser locale
  const locale = navigator.language ?? "en-US";

  if (isDebugMode) console.warn("🌐 Detected locale:", locale);

  if (locale.startsWith("ja")) return CURRENCY.JPY;
  if (locale.startsWith("en-US")) return CURRENCY.USD;
  if (locale.startsWith("en-GB")) return CURRENCY.EUR;
  if (
    locale.includes("FR") ||
    locale.includes("BE") ||
    locale.includes("IT") ||
    locale.includes("ES") ||
    locale.includes("DE") ||
    locale.includes("PT") ||
    locale.includes("NL") ||
    locale.includes("AT")
  ) {
    return CURRENCY.EUR;
  }

  // Default
  return DEFAULT_CURRENCY;
}

/**
 * Saves user's currency preference
 */
export function savePreferredCurrency(currency: Currency): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("preferredCurrency", currency);
  if (isDebugMode) console.warn("✅ Currency saved:", currency);
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
    const now = Date.now();

    if (now - cacheTimestamp < CACHE_DURATION) {
      if (isDebugMode) console.warn("📊 Using cached rates");

      return cachedRate;
    }
  }

  try {
    if (isDebugMode) console.warn("🌐 Fetching exchange rates from JPY...");

    const response = await fetch(EXCHANGE_RATE_API_URL, {
      next: { revalidate: 86400 }, // Next.js cache for 24h
    });

    if (!response.ok) {
      throw new Error("API rate response not ok");
    }

    const data = await response.json();
    const rates: ExchangeRates = {
      EUR: data.rates.EUR ?? FALLBACK_RATE_EUR,
      USD: data.rates.USD ?? FALLBACK_RATE_USD,
    };

    // Update cache
    cachedRate = rates;
    cacheTimestamp = Date.now();

    if (isDebugMode) console.warn("✅ Rates fetched:", rates);

    return rates;
  } catch {
    if (isDebugMode) console.error("⚠️ Exchange rate API error, using fallback rates");

    return { EUR: FALLBACK_RATE_EUR, USD: FALLBACK_RATE_USD };
  }
}

// ============================================================================
// Currency conversion
// ============================================================================

/**
 * Rounding options for currency conversion
 */
export type RoundingMode = "exact" | "toCents" | "toWholeUnits";

/**
 * Converts from yens (JPY - base currency) to target currency
 * @param jpy Amount in yens (no cents, yen doesn't have them)
 * @param targetCurrency Target currency (EUR, JPY, USD)
 * @param rates Exchange rates from JPY
 * @param rounding Rounding mode: 'exact' = raw value in cents, 'toCents' = round to cents (default), 'toWholeUnits' = round to whole units (returns units, not cents)
 * @returns Amount in target currency (in cents for EUR/USD with 'exact'/'toCents', in whole units with 'toWholeUnits', in yens for JPY)
 */
export function convertFromJpy(
  jpy: number,
  targetCurrency: Currency,
  rates: ExchangeRates,
  rounding: RoundingMode = "toCents"
): number {
  switch (targetCurrency) {
    case CURRENCY.JPY:
      return jpy; // Always in yen
    case CURRENCY.EUR:
    case CURRENCY.USD:
      const rate = targetCurrency === CURRENCY.EUR ? rates.EUR : rates.USD;
      const cents = jpy * rate * 100;

      if (rounding === "exact") return cents;
      if (rounding === "toWholeUnits") return Math.round(cents / 100); // Return whole units, not cents

      return Math.round(cents); // Default: return cents
    default:
      return jpy;
  }
}

/**
 * Converts from a currency to yens (JPY - base currency)
 * @param amount Amount (in cents for EUR/USD, in yens for JPY)
 * @param fromCurrency Source currency
 * @param rates Exchange rates from JPY
 * @param rounding Rounding mode: 'exact' = no rounding, 'toCents' = round to yen (default), 'toWholeUnits' = round to hundreds of yen
 * @returns Amount in yens
 */
export function convertToJpy(
  amount: number,
  fromCurrency: Currency,
  rates: ExchangeRates,
  rounding: RoundingMode = "toCents"
): number {
  switch (fromCurrency) {
    case CURRENCY.JPY:
      return amount;
    case CURRENCY.EUR:
    case CURRENCY.USD:
      const rate = fromCurrency === CURRENCY.EUR ? rates.EUR : rates.USD;
      const jpy = amount / 100 / rate;

      if (rounding === "exact") return jpy;
      if (rounding === "toWholeUnits") return Math.round(jpy / 100) * 100; // Round to hundreds of yen

      return Math.round(jpy); // Default: round to yen
    default:
      return amount;
  }
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Converts and formats an amount from JPY to the specified currency
 * This is the main formatting function that handles both conversion and display.
 * @param jpy Amount in yens (base currency)
 * @param currency Display currency
 * @param rates Exchange rates from JPY
 * @param rounded If true, rounds to nearest whole unit (14€ instead of 14.27€)
 */
export function formatCurrency(
  jpy: number,
  currency: Currency,
  rates: ExchangeRates,
  rounded: boolean = false
): string {
  // Use appropriate rounding mode
  const amount = rounded
    ? convertFromJpy(jpy, currency, rates, "toWholeUnits") // Already in whole units, rounded
    : convertFromJpy(jpy, currency, rates, "toCents"); // In cents, precise

  const localeMap: Record<Currency, string> = {
    EUR: "fr-FR",
    JPY: "ja-JP",
    USD: "en-US",
  };

  // For JPY, amount is always in yen
  // For EUR/USD: whole units if rounded, otherwise cents/100
  const displayAmount = currency === CURRENCY.JPY ? amount : rounded ? amount : amount / 100;

  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currency,
  };

  // If rounded, don't show decimals
  if (rounded) {
    options.minimumFractionDigits = 0;
    options.maximumFractionDigits = 0;
  }

  return new Intl.NumberFormat(localeMap[currency], options).format(displayAmount);
}

/**
 * Currency symbols
 */
export const currencySymbols: Record<Currency, string> = {
  EUR: "€",
  JPY: "¥",
  USD: "$",
};

/**
 * Currency labels
 */
export const currencyLabels: Record<Currency, string> = {
  EUR: "Euro",
  JPY: "Yen",
  USD: "Dollar",
};

// ============================================================================
// Admin utility functions
// ============================================================================

/**
 * Formats an amount in yens (base currency)
 */
export function formatJpy(jpy: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(jpy);
}

/**
 * Formats an amount in euros
 */
export function formatEur(jpy: number, rates: ExchangeRates): string {
  const eurCents = convertFromJpy(jpy, "EUR", rates, "toCents");

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(eurCents / 100);
}

/**
 * Formats a price displaying both yen and euro (for admin)
 */
export function formatDualPrice(jpy: number, rates: ExchangeRates): string {
  return `${formatJpy(jpy)} (${formatEur(jpy, rates)})`;
}
