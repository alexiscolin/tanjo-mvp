import { NextRequest, NextResponse } from 'next/server'
import { getContributions } from '@/lib/google-sheets'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contributions = await getContributions(id)
    
    // Return anonymized data (hide email for privacy)
    const anonymizedContributions = contributions.map(c => ({
      id: c.id,
      name: c.name,
      amount: c.amount,
      message: c.message,
      createdAt: c.createdAt,
    }))
    
    return NextResponse.json({ contributions: anonymizedContributions })
  } catch (error) {
    console.error('Error fetching contributions:', error)
    return NextResponse.json(
      { error: 'Error fetching contributions' },
      { status: 500 }
    )
  }
}
