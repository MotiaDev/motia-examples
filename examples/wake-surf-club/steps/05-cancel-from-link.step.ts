import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { CancelRequestSchema, CancelResponseSchema, Booking, Session } from '../types/models'
import { verifySignedToken } from '../types/utils'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CancelFromSignedLink',
  description: 'Cancel a surf session booking from a signed link',
  method: 'POST',
  path: '/api/cancel',
  bodySchema: CancelRequestSchema,
  responseSchema: {
    200: CancelResponseSchema,
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  emits: ['booking.canceled'],
  flows: ['wake-surf-club']
}

export const handler: Handlers['CancelFromSignedLink'] = async (req, { emit, logger, state, traceId }) => {
  try {
    const { token } = req.body
    
    // Verify the signed token
    const secret = process.env.HOST_SIGNING_SECRET
    if (!secret) {
      throw new Error('Host signing secret not configured')
    }
    
    const claim = verifySignedToken(token, secret)
    const { sessionId, phoneE164 } = claim
    
    logger.info('Processing cancellation request', { sessionId, phoneE164, traceId })
    
    // Find the booking
    const bookingKey = `${sessionId}:${phoneE164}`
    const booking = await state.get('bookings', bookingKey) as Booking
    
    if (!booking) {
      return {
        status: 404,
        body: { error: 'No booking found for this session' }
      }
    }
    
    if (booking.status === 'canceled') {
      return {
        status: 400,
        body: { error: 'Booking already canceled' }
      }
    }
    
    // Check cancellation deadline (12 hours before session)
    const session = await state.get('sessions', sessionId) as Session
    if (session) {
      const sessionDate = new Date(session.date + 'T' + session.startTime + ':00')
      const now = new Date()
      const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      if (hoursUntilSession < 12) {
        return {
          status: 400,
          body: { error: 'Cancellation deadline has passed (12 hours before session)' }
        }
      }
    }
    
    // Update booking status
    const updatedBooking: Booking = {
      ...booking,
      status: 'canceled',
      canceledAt: new Date().toISOString()
    }
    
    await state.set('bookings', bookingKey, updatedBooking)
    await state.set('bookings', booking.id, updatedBooking)
    
    logger.info('Booking canceled successfully', { 
      bookingId: booking.id, 
      sessionId, 
      phoneE164,
      traceId 
    })
    
    // Emit cancellation event
    await emit({
      topic: 'booking.canceled',
      data: {
        bookingId: booking.id,
        sessionId,
        friendId: booking.friendId,
        phoneE164,
        canceledAt: updatedBooking.canceledAt!
      }
    })
    
    // TODO: Check for waitlist promotion
    // For now, we'll just emit the cancellation
    
    return {
      status: 200,
      body: { ok: true }
    }
    
  } catch (error: any) {
    logger.error('Cancellation failed', { error: error.message, traceId })
    
    if (error.message.includes('Invalid or expired token')) {
      return {
        status: 401,
        body: { error: 'Invalid or expired cancellation link' }
      }
    }
    
    return {
      status: 500,
      body: { error: 'Cancellation failed' }
    }
  }
}
