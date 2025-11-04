import { CronConfig, Handlers } from 'motia'
import { Friend, Session } from '../types/models'
import { createSignedToken, calculateNextTuesdayDate, getActiveFriends } from '../types/utils'

export const config: CronConfig = {
  type: 'cron',
  name: 'SendInviteBlast',
  description: 'Send SMS invites to all active friends for the next Tuesday session',
  cron: '0 15 * * MON', // Every Monday at 3:00 PM
  emits: ['sms.send'],
  flows: ['wake-surf-club']
}

export const handler: Handlers['SendInviteBlast'] = async ({ emit, logger, state, traceId }) => {
  try {
    const secret = process.env.HOST_SIGNING_SECRET
    const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000'
    
    if (!secret) {
      throw new Error('Host signing secret not configured')
    }
    
    // Get the next Tuesday session using utility
    const dateStr = calculateNextTuesdayDate()
    const session = await state.get('sessions', dateStr) as Session
    if (!session) {
      logger.warn('No session found for next Tuesday', { date: dateStr, traceId })
      return
    }
    
    if (session.status !== 'published') {
      logger.warn('Session is not published', { sessionId: session.id, status: session.status, traceId })
      return
    }
    
    // Get all active friends using utility
    const activeFriends = await getActiveFriends(state) as Friend[]
    
    logger.info('Sending invites to active friends', { 
      friendCount: activeFriends.length, 
      sessionId: session.id,
      traceId 
    })
    
    // Send invites to each friend
    for (const friend of activeFriends) {
      try {
        // Create signed booking link
        const bookingToken = createSignedToken(session.id, friend.phoneE164, secret)
        const bookingUrl = `${appUrl}/book?token=${bookingToken}`
        
        // Create SMS message
        const message = `Tuesday Surf Club is on! 7–9am. Book your spot: ${bookingUrl}`
        
        // Send SMS
        await emit({
          topic: 'sms.send',
          data: {
            to: friend.phoneE164,
            body: message,
            type: 'invite',
            dedupeKey: `invite_${session.id}_${friend.id}`
          }
        })
        
        logger.info('Invite sent to friend', { 
          friendId: friend.id, 
          friendName: friend.name, 
          phone: friend.phoneE164,
          traceId 
        })
        
        logger.info('Invite sent successfully', {
          friendId: friend.id,
          friendName: friend.name,
          phoneE164: friend.phoneE164,
          sessionId: session.id,
          sentAt: new Date().toISOString(),
          traceId
        })
        
      } catch (error: any) {
        logger.error('Failed to send invite to friend', { 
          friendId: friend.id, 
          error: error.message,
          traceId 
        })
        
        logger.error('Invite failed', {
          friendId: friend.id,
          friendName: friend.name,
          phoneE164: friend.phoneE164,
          sessionId: session.id,
          error: error.message,
          failedAt: new Date().toISOString(),
          traceId
        })
      }
    }
    
    logger.info('Invite blast completed', { 
      totalFriends: activeFriends.length,
      sessionId: session.id,
      traceId 
    })
    
  } catch (error: any) {
    logger.error('Invite blast failed', { error: error.message, traceId })
    
    await emit({
      topic: 'invite.blast.failed',
      data: {
        error: error.message,
        failedAt: new Date().toISOString()
      }
    })
  }
}
