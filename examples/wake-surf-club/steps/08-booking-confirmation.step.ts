import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { createSignedToken } from '../types/utils'

export const config: EventConfig = {
  type: 'event',
  name: 'BookingConfirmation',
  description: 'Send confirmation SMS and generate calendar invite when booking is created',
  subscribes: ['booking.created'],
  emits: ['sms.send', 'calendar.generate'],
  input: z.object({
    bookingId: z.string(),
    sessionId: z.string(),
    friendId: z.string(),
    friendName: z.string(),
    phoneE164: z.string(),
    status: z.enum(['confirmed', 'waitlisted']),
    roster: z.array(z.object({
      name: z.string(),
      phoneMasked: z.string()
    }))
  }),
  flows: ['wake-surf-club']
}

export const handler = async (input: any, { emit, logger, state, traceId }: any) => {
  const { bookingId, sessionId, friendId, friendName, phoneE164, status, roster } = input
  
  try {
    const secret = process.env.HOST_SIGNING_SECRET
    const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000'
    
    if (!secret) {
      throw new Error('Host signing secret not configured')
    }
    
    // Get session details
    const session = await state.get('sessions', sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    if (status === 'confirmed') {
      // Create cancellation link
      const cancelToken = createSignedToken(sessionId, phoneE164, secret)
      const cancelUrl = `${appUrl}/cancel?token=${cancelToken}`
      
      // Send confirmation SMS
      const message = `You're in for Tue 7–9am. Add to calendar: ${appUrl}/api/calendar/download?sessionId=${sessionId}&friendId=${friendId}. Need to cancel? ${cancelUrl}`
      
      await emit({
        topic: 'sms.send',
        data: {
          to: phoneE164,
          body: message,
          type: 'confirmation',
          dedupeKey: `confirmation_${bookingId}`
        }
      })
      
      // Generate calendar invite
      await emit({
        topic: 'calendar.generate',
        data: {
          sessionId,
          friendId,
          friendName,
          sessionDate: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          location: session.location
        }
      })
      
      logger.info('Booking confirmation sent', { 
        bookingId, 
        friendId, 
        friendName,
        traceId 
      })
      
      logger.info('Booking confirmation sent', {
        bookingId,
        friendId,
        friendName,
        phoneE164,
        sessionId,
        sentAt: new Date().toISOString(),
        traceId
      })
      
    } else if (status === 'waitlisted') {
      // Send waitlist confirmation
      const message = `You're on the waitlist for Tue 7–9am. We'll text you if a spot opens up!`
      
      await emit({
        topic: 'sms.send',
        data: {
          to: phoneE164,
          body: message,
          type: 'confirmation',
          dedupeKey: `waitlist_${bookingId}`
        }
      })
      
      logger.info('Waitlist confirmation sent', { 
        bookingId, 
        friendId, 
        friendName,
        traceId 
      })
    }
    
  } catch (error: any) {
    logger.error('Booking confirmation failed', { 
      error: error.message, 
      bookingId, 
      friendId,
      traceId 
    })
    
    logger.error('Booking confirmation failed', {
      bookingId,
      friendId,
      phoneE164,
      sessionId,
      error: error.message,
      failedAt: new Date().toISOString(),
      traceId
    })
  }
}
