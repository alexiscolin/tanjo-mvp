import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/google-sheets'
import { DEFAULT_CONFIG } from '@/lib/constants'

export async function GET() {
  try {
    const config = await getAppConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching config:', error)
    // Return defaults on error
    return NextResponse.json({
      potThresholdJpy: DEFAULT_CONFIG.POT_THRESHOLD_JPY,
      minContributionJpy: DEFAULT_CONFIG.MIN_CONTRIBUTION_JPY,
      suggestedContributionsJpy: DEFAULT_CONFIG.SUGGESTED_CONTRIBUTIONS_JPY,
    })
  }
}
