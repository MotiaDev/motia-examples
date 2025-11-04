import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { BookRequestSchema, BookResponseSchema } from '../types/models'
import { verifySignedToken } from '../types/utils'
import { Friend, Session, Booking } from '../types/models'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'BookFromSignedLink',
  description: 'Book a surf session from a signed link',
  method: 'POST',
  path: '/api/book',
  bodySchema: BookRequestSchema,
  responseSchema: {
    200: BookResponseSchema,
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    409: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  emits: ['booking.created'],
  flows: ['wake-surf-club']
}

export const handler: Handlers['BookFromSignedLink'] = async (req, { emit, logger, state, traceId }) => {
  try {
    const { token } = req.body
    
    // Verify the signed token
    const secret = process.env.HOST_SIGNING_SECRET
    if (!secret) {
      throw new Error('Host signing secret not configured')
    }
    
    const claim = verifySignedToken(token, secret)
    const { sessionId, phoneE164 } = claim
    
    logger.info('Processing booking request', { sessionId, phoneE164, traceId })
    
    // Get the session
    const session = await state.get('sessions', sessionId) as Session
    if (!session) {
      return {
        status: 400,
        body: { error: 'Session not found' }
      }
    }
    
    if (session.status !== 'published') {
      return {
        status: 400,
        body: { error: 'Session is not available for booking' }
      }
    }
    
    // Get or create friend
    let friend = await state.get('friends', phoneE164) as Friend
    if (!friend) {
      // Create a new friend entry
      const friendId = crypto.randomUUID()
      friend = {
        id: friendId,
        name: 'Friend', // Will be updated when they provide their name
        phoneE164,
        active: true,
        createdAt: new Date().toISOString()
      }
      await state.set('friends', phoneE164, friend)
      await state.set('friends', friendId, friend)
    }
    
    // Check if already booked
    const existingBooking = await state.get('bookings', `${sessionId}:${phoneE164}`) as Booking
    if (existingBooking && existingBooking.status === 'confirmed') {
      return {
        status: 400,
        body: { error: 'Already booked for this session' }
      }
    }
    
    // Get current confirmed bookings count
    const allBookings = await state.get('bookings', 'list') || []
    const confirmedBookings = allBookings.filter(
      (booking: any) => booking.sessionId === sessionId && booking.status === 'confirmed'
    )
    
    const bookingId = crypto.randomUUID()
    let bookingStatus: 'confirmed' | 'waitlisted' = 'confirmed'
    let responseStatus = 200
    
    // Check capacity
    if (confirmedBookings.length >= session.capacity) {
      // Check if waitlist is enabled (for now, we'll just return full)
      return {
        status: 409,
        body: { 
          status: 'full',
          roster: await getSessionRoster(sessionId, state)
        }
      }
    }
    
    // Create booking
    const booking: Booking = {
      id: bookingId,
      sessionId,
      friendId: friend.id,
      phoneE164,
      status: bookingStatus,
      createdAt: new Date().toISOString()
    }
    
    // Store booking with atomic key
    const bookingKey = `${sessionId}:${phoneE164}`
    await state.set('bookings', bookingKey, booking)
    await state.set('bookings', bookingId, booking)
    
    // Update bookings list for efficient retrieval
    const existingBookingsList = await state.get('bookings', 'list') || []
    const updatedBookingsList = [...existingBookingsList, booking]
    await state.set('bookings', 'list', updatedBookingsList)
    
    // Get updated roster
    const roster = await getSessionRoster(sessionId, state)
    
    logger.info('Booking created successfully', { 
      bookingId, 
      sessionId, 
      friendId: friend.id, 
      status: bookingStatus,
      traceId 
    })
    
    // Emit booking event
    await emit({
      topic: 'booking.created',
      data: {
        bookingId,
        sessionId,
        friendId: friend.id,
        friendName: friend.name,
        phoneE164,
        status: bookingStatus,
        roster
      }
    })
    
    return {
      status: responseStatus,
      body: {
        status: bookingStatus,
        roster
      }
    }
    
  } catch (error: any) {
    logger.error('Booking failed', { error: error.message, traceId })
    
    if (error.message.includes('Invalid or expired token')) {
      return {
        status: 401,
        body: { error: 'Invalid or expired booking link' }
      }
    }
    
    return {
      status: 500,
      body: { error: 'Booking failed' }
    }
  }
}

async function getSessionRoster(sessionId: string, state: any) {
  const allBookings = await state.get('bookings', 'list') || []
  const allFriends = await state.get('friends', 'list') || []
  
  const sessionBookings = allBookings.filter(
    (booking: any) => booking.sessionId === sessionId && booking.status === 'confirmed'
  )
  
  return sessionBookings.map((booking: any) => {
    const friend = allFriends[booking.friendId]
    return {
      name: friend?.name || 'Friend',
      phoneMasked: booking.phoneE164.replace(/(\+\d{1,3})\d{3}(\d{3})\d{4}/, '$1***-***-$2')
    }
  })
}
