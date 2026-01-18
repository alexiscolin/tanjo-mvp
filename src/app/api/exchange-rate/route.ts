import { NextResponse } from 'next/server'
import { getExchangeRates, type ExchangeRates } from '@/lib/currency'

/**
 * API endpoint to fetch real-time exchange rates
 * GET /api/exchange-rate
 * 
 * Returns JPY to EUR and USD rates
 * 
 * NOTE: This endpoint is no longer used by the frontend.
 * Exchange rates are now included in the /api/registry response.
 * Kept for potential external use or debugging.
 */
export async function GET() {
  try {
    const rates: ExchangeRates = await getExchangeRates()
    
    return NextResponse.json(
      { 
        rates, // { EUR: 0.00625, USD: 0.0069 }
        timestamp: Date.now(),
        baseCurrency: 'JPY'
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
          // Cache 24h, can serve stale for additional 24h
        }
      }
    )
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    return NextResponse.json(
      { error: 'Error fetching exchange rates' },
      { status: 500 }
    )
  }
}
