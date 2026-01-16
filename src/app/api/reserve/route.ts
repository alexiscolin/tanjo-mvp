import { NextRequest, NextResponse } from 'next/server'
import { addReservation, getGifts } from '@/lib/google-sheets'
import { sendReservationNotification, sendReservationConfirmation } from '@/lib/resend'
import { isValidEmail, sanitizeName, sanitizeString } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { giftId, name, email, message } = await request.json()
    
    // Validation
    if (!giftId || !name || !email) {
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
    
    // Sanitize inputs
    const sanitizedName = sanitizeName(name)
    const sanitizedMessage = sanitizeString(message || '')
    
    // Check that gift exists and is not already reserved
    const gifts = await getGifts()
    const gift = gifts.find(g => g.id === giftId)
    
    if (!gift) {
      return NextResponse.json(
        { error: 'Gift not found' },
        { status: 404 }
      )
    }
    
    if (gift.isReserved) {
      return NextResponse.json(
        { error: 'This gift has already been reserved' },
        { status: 400 }
      )
    }
    
    if (gift.isPot) {
      return NextResponse.json(
        { error: 'This gift is a pot, use /api/contribute' },
        { status: 400 }
      )
    }
    
    // Save reservation with sanitized data
    await addReservation({ 
      giftId, 
      name: sanitizedName, 
      email: email.trim().toLowerCase(), 
      message: sanitizedMessage 
    })
    
    // Send emails (don't crash if it fails)
    try {
      const emailData = {
        giftTitle: gift.title,
        giftPrice: gift.price,
        reserverName: sanitizedName,
        reserverEmail: email.trim().toLowerCase(),
        message: sanitizedMessage,
      }
      
      await Promise.all([
        sendReservationNotification(emailData),
        sendReservationConfirmation(emailData),
      ])
    } catch (emailError) {
      console.error('Email sending error (non-blocking):', emailError)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reserving gift:', error)
    return NextResponse.json(
      { error: 'Error reserving gift' },
      { status: 500 }
    )
  }
}
