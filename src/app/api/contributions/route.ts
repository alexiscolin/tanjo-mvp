import { NextResponse } from 'next/server'
import { getContributions, getGifts } from '@/lib/google-sheets'
import { POOL_ID } from '@/lib/constants'

export async function GET() {
  try {
    const [contributions, gifts] = await Promise.all([
      getContributions(),
      getGifts(),
    ])

    // Enrich contributions with gift details
    const enrichedContributions = contributions.map(contrib => {
      let giftTitle = 'Unknown Gift'
      
      if (contrib.giftId === POOL_ID) {
        giftTitle = 'Contribution libre 💝'
      } else {
        const gift = gifts.find(g => g.id === contrib.giftId)
        giftTitle = gift?.title || `Gift ${contrib.giftId}`
      }

      return {
        ...contrib,
        giftTitle,
      }
    })

    // Sort by date (most recent first)
    enrichedContributions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ contributions: enrichedContributions })
  } catch (error) {
    console.error('Error fetching contributions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contributions' },
      { status: 500 }
    )
  }
}
