import { NextRequest, NextResponse } from 'next/server'
import { getGifts, addGift, getListInfo } from '@/lib/google-sheets'

// GET /api/gifts - Fetch all gifts
export async function GET() {
  try {
    const [gifts, listInfo] = await Promise.all([
      getGifts(),
      getListInfo(),
    ])
    
    // Filter empty rows
    const validGifts = gifts.filter(g => g.title && g.title.trim() !== '')
    
    return NextResponse.json({ gifts: validGifts, listInfo })
  } catch (error) {
    console.error('Error fetching gifts:', error)
    return NextResponse.json(
      { error: 'Error fetching gifts' },
      { status: 500 }
    )
  }
}

// POST /api/gifts - Add a gift (password protected)
export async function POST(request: NextRequest) {
  try {
    const { password, gift } = await request.json()
    
    // Verify admin password
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await addGift(gift)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding gift:', error)
    return NextResponse.json(
      { error: 'Error adding gift' },
      { status: 500 }
    )
  }
}
