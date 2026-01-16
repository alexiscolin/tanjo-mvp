import { NextRequest, NextResponse } from 'next/server'
import { addContribution, getGifts } from '@/lib/google-sheets'
import { sendContributionNotification, sendContributionConfirmation } from '@/lib/resend'
import { FREE_CONTRIBUTION_ID, FREE_CONTRIBUTION_PRICE } from '@/lib/constants'
import { isValidEmail, sanitizeName, sanitizeString, isValidPrice } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { giftId, name, email, amount, message } = await request.json()
    
    // Validation
    if (!giftId || !name || !email || amount === undefined || amount === null) {
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
    
    // Handle FREE_CONTRIBUTION (virtual pot)
    if (giftId === FREE_CONTRIBUTION_ID) {
      // Save contribution without checking gift existence
      await addContribution({ 
        giftId, 
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
          totalCollected: amount, // No total tracking for free contributions
          goal: FREE_CONTRIBUTION_PRICE, // No goal
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
        newTotal: amount,
        percentage: 0,
      })
    }
    
    // Check that gift exists and is a pot
    const gifts = await getGifts()
    const gift = gifts.find(g => g.id === giftId)
    
    if (!gift) {
      return NextResponse.json(
        { error: 'Gift not found' },
        { status: 404 }
      )
    }
    
    if (!gift.isPot) {
      return NextResponse.json(
        { error: 'This gift is not a pot' },
        { status: 400 }
      )
    }
    
    // Save contribution with sanitized data
    await addContribution({ 
      giftId, 
      name: sanitizedName, 
      email: sanitizedEmail, 
      amount, 
      message: sanitizedMessage 
    })
    
    // Calculate new total
    const newTotal = (gift.potCurrentAmount || 0) + amount
    
    // Send emails (don't crash if it fails)
    try {
      const emailData = {
        giftTitle: gift.title,
        contributorName: sanitizedName,
        contributorEmail: sanitizedEmail,
        amount,
        message: sanitizedMessage,
        totalCollected: newTotal,
        goal: gift.price,
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
      newTotal,
      percentage: Math.round((newTotal / gift.price) * 100),
    })
  } catch (error) {
    console.error('Error contributing:', error)
    return NextResponse.json(
      { error: 'Error contributing' },
      { status: 500 }
    )
  }
}
