import { NextRequest, NextResponse } from 'next/server'
import { deleteContribution } from '@/lib/google-sheets'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing contribution ID' },
        { status: 400 }
      )
    }
    
    await deleteContribution(id)
    
    return NextResponse.json({ 
      success: true,
      message: 'Contribution cancelled successfully'
    })
  } catch (error) {
    console.error('Error cancelling contribution:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error cancelling contribution' },
      { status: 500 }
    )
  }
}
