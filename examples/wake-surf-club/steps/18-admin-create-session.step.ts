import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { verifyHostToken } from '../types/utils'
import { Session } from '../types/models'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'AdminCreateSession',
  description: 'Create a new session for a specific date',
  method: 'POST',
  path: '/admin/session/create',
  bodySchema: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format').default('07:00'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format').default('09:00'),
    capacity: z.number().min(1).max(10).default(3),
    location: z.string().optional(),
    status: z.enum(['draft', 'published', 'closed']).default('published')
  }),
  responseSchema: {
    201: z.object({
      session: z.object({
        id: z.string(),
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        capacity: z.number(),
        status: z.string(),
        location: z.string().nullable(),
        createdAt: z.string()
      })
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    409: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  emits: [],
  flows: ['wake-surf-club']
}

export const handler: Handlers['AdminCreateSession'] = async (req, { emit, logger, state, traceId }) => {
  try {
    // For now, skip authentication - we'll add it back later
    const { date, startTime, endTime, capacity, location, status } = req.body

    // Validate date format (removed Tuesday restriction)
    const sessionDate = new Date(date)
    if (isNaN(sessionDate.getTime())) {
      return {
        status: 400,
        body: { error: 'Invalid date format' }
      }
    }

    // Check if session already exists for this date
    const existingSession = await state.get('sessions', date)
    if (existingSession) {
      return {
        status: 409,
        body: { error: 'Session already exists for this date' }
      }
    }

    // Create new session
    const sessionId = crypto.randomUUID()
    const newSession: Session = {
      id: sessionId,
      date,
      startTime,
      endTime,
      capacity,
      status,
      location: location || null,
      createdAt: new Date().toISOString()
    }

    // Store the session
    await state.set('sessions', date, newSession)
    await state.set('sessions', sessionId, newSession)
    
    // Update sessions list for efficient retrieval
    const existingSessionsList = await state.get('sessions', 'list') || []
    const updatedSessionsList = [...existingSessionsList, newSession]
    await state.set('sessions', 'list', updatedSessionsList)

    logger.info('Session created successfully', { 
      sessionId, 
      date, 
      status,
      traceId 
    })


    return {
      status: 201,
      body: { session: newSession }
    }

  } catch (error: any) {
    logger.error('Failed to create session', { 
      error: error.message, 
      traceId 
    })

    // Authentication errors removed for now

    return {
      status: 500,
      body: { error: 'Failed to create session' }
    }
  }
}
