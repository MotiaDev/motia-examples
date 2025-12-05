import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { createEvent } from 'ics'
import { Session, Friend } from '../types/models'

export const config: EventConfig = {
  type: 'event',
  name: 'GenerateIcs',
  description: 'Generate ICS calendar invite for surf session',
  subscribes: ['calendar.generate'],
  emits: [],
  input: z.object({
    sessionId: z.string(),
    friendId: z.string(),
    friendName: z.string(),
    sessionDate: z.string(), // YYYY-MM-DD
    startTime: z.string(), // "07:00"
    endTime: z.string(), // "09:00"
    location: z.string().optional()
  }),
  flows: ['wake-surf-club']
}

export const handler = async (input: any, { emit, logger, state, traceId }: any) => {
  const { sessionId, friendId, friendName, sessionDate, startTime, endTime, location } = input
  
  try {
    // Parse session date and times
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    // Create date objects (assuming local timezone for simplicity)
    const sessionDateTime = new Date(`${sessionDate}T${startTime}:00`)
    const endDateTime = new Date(`${sessionDate}T${endTime}:00`)
    
    // Use local time for ICS (in production, you'd want proper timezone handling)
    const startUTC = sessionDateTime
    const endUTC = endDateTime
    
    // Generate ICS event
    const icsEvent = {
      start: [
        startUTC.getFullYear(),
        startUTC.getMonth() + 1, // ICS uses 1-based months
        startUTC.getDate(),
        startUTC.getHours(),
        startUTC.getMinutes()
      ] as [number, number, number, number, number],
      end: [
        endUTC.getFullYear(),
        endUTC.getMonth() + 1,
        endUTC.getDate(),
        endUTC.getHours(),
        endUTC.getMinutes()
      ] as [number, number, number, number, number],
      title: 'Tuesday WakeSurf Club',
      description: `WakeSurf session with the Tuesday Surf Club!\n\nLocation: ${location || 'TBD'}\n\nSee you on the water!`,
      location: location || 'TBD',
      status: 'CONFIRMED' as const,
      busyStatus: 'BUSY' as const,
      organizer: { name: 'Tuesday Surf Club', email: 'surf@tuesdaysurfclub.com' },
      attendees: [
        { name: friendName, email: 'friend@example.com', rsvp: true, partstat: 'ACCEPTED' as const }
      ]
    }
    
    const { error, value } = createEvent(icsEvent)
    
    if (error) {
      throw new Error(`ICS generation failed: ${error.message}`)
    }
    
    if (!value) {
      throw new Error('ICS generation returned no value')
    }
    
    // Store the ICS content
    const icsContent = value
    const icsKey = `ics_${sessionId}_${friendId}`
    
    await state.set(traceId, icsKey, {
      content: icsContent,
      sessionId,
      friendId,
      friendName,
      generatedAt: new Date().toISOString()
    })
    
    // Create a signed download URL (in a real app, this would be a proper signed URL)
    const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000'
    const downloadUrl = `${appUrl}/api/calendar/download?sessionId=${sessionId}&friendId=${friendId}`
    
    logger.info('ICS calendar invite generated', { 
      sessionId, 
      friendId, 
      friendName, 
      downloadUrl,
      traceId 
    })
    
    logger.info('ICS calendar generated successfully', {
      sessionId,
      friendId,
      friendName,
      downloadUrl,
      generatedAt: new Date().toISOString(),
      traceId
    })
    
  } catch (error: any) {
    logger.error('ICS generation failed', { 
      error: error.message, 
      sessionId, 
      friendId, 
      traceId 
    })
    
    // Log failure
    logger.error('ICS generation failed', {
      sessionId,
      friendId,
      error: error.message,
      failedAt: new Date().toISOString(),
      traceId
    })
  }
}
