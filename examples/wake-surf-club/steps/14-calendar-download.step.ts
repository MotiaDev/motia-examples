import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CalendarDownload',
  description: 'Download ICS calendar file for a booking',
  method: 'GET',
  path: '/api/calendar/download',
  responseSchema: {
    200: z.object({ content: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  emits: [],
  flows: ['wake-surf-club']
}

export const handler = async (req: any, { emit, logger, state, traceId }: any) => {
  try {
    const { sessionId, friendId } = req.query
    
    if (!sessionId || !friendId) {
      return {
        status: 400,
        body: { error: 'sessionId and friendId are required' }
      }
    }
    
    // Get the stored ICS content
    const icsKey = `ics_${sessionId}_${friendId}`
    const icsData = await state.get(traceId, icsKey)
    
    if (!icsData || !icsData.content) {
      return {
        status: 404,
        body: { error: 'Calendar invite not found' }
      }
    }
    
    logger.info('Calendar download requested', { 
      sessionId, 
      friendId,
      traceId 
    })
    
    // Return ICS content
    return {
      status: 200,
      body: { content: icsData.content }
    }
    
  } catch (error: any) {
    logger.error('Calendar download failed', { error: error.message, traceId })
    
    return {
      status: 500,
      body: { error: 'Failed to download calendar' }
    }
  }
}
