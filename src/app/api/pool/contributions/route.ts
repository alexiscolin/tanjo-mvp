import { NextRequest, NextResponse } from 'next/server'
import { addContribution, getContributions } from '@/lib/google-sheets'
import { sendContributionNotification, sendContributionConfirmation } from '@/lib/resend'
import { POOL_ID } from '@/lib/constants'
import { isValidEmail, sanitizeName, sanitizeString, isValidPrice } from '@/lib/utils'

// GET /api/pool/contributions - List all pool contributions
export async function GET() {
  try {
    const contributions = await getContributions(POOL_ID)
    
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
    console.error('Error fetching pool contributions:', error)
    return NextResponse.json(
      { error: 'Error fetching contributions' },
      { status: 500 }
    )
  }
}

// POST /api/pool/contributions - Contribute to the global pool
export async function POST(request: NextRequest) {
  try {
    const { name, email, amount, message } = await request.json()
    
    // Validation
    if (!name || !email || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    if (!isValidPrice(amount) || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid or too small amount (minimum 100 JPY)' },
        { status: 400 }
      )
    }
    
    // Sanitize inputs
    const sanitizedName = sanitizeName(name)
    const sanitizedMessage = sanitizeString(message || '')
    const sanitizedEmail = email.trim().toLowerCase()
    
    // Save contribution to pool
    const contributionId = await addContribution({ 
      giftId: POOL_ID, 
      name: sanitizedName, 
      email: sanitizedEmail, 
      amount, 
      message: sanitizedMessage 
    })
    
    // Send emails (don't crash if it fails)
    try {
      const emailData = {
        giftTitle: 'Contribution libre',
        contributorName: sanitizedName,
        contributorEmail: sanitizedEmail,
        amount,
        message: sanitizedMessage,
        totalCollected: amount, // No total tracking for pool
        goal: 0, // Pool has no goal
      }
      
      await Promise.all([
        sendContributionNotification(emailData),
        sendContributionConfirmation(emailData),
      ])
    } catch (emailError) {
      console.error('Email sending error (non-blocking):', emailError)
    }
    
    return NextResponse.json({ 
      success: true,
      contributionId,
      newTotal: amount,
      percentage: 0,
    })
  } catch (error) {
    console.error('Error contributing to pool:', error)
    return NextResponse.json(
      { error: 'Error contributing' },
      { status: 500 }
    )
  }
}
