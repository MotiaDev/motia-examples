/**
 * Handle Research Failure Step
 * 
 * This event step handles research query failures:
 * - Logs the failure details
 * - Updates query status
 * - Streams failure notification
 */

import { EventConfig, Handlers } from 'motia'
import type { ResearchQuery } from '../../src/services/types'
import { STATE_GROUPS } from '../../src/services/types'

const inputSchema = {
  type: 'object',
  properties: {
    queryId: { type: 'string' },
    error: { type: 'string' },
  },
  required: ['queryId', 'error'],
}

export const config: EventConfig = {
  type: 'event',
  name: 'HandleResearchFailure',
  description: 'Handles research query failures and updates status',
  subscribes: ['research.query.failed'],
  emits: [],
  input: inputSchema,
  flows: ['research-assistant'],
}

export const handler: Handlers['HandleResearchFailure'] = async (input, { logger, state, streams }) => {
  const { queryId, error } = input as { queryId: string; error: string }
  
  logger.error('Research query failed', { queryId, error })
  
  try {
    // Get the query
    const query = await state.get<ResearchQuery>(STATE_GROUPS.QUERIES, queryId)
    
    if (query) {
      // Update status
      query.status = 'failed'
      query.updatedAt = new Date().toISOString()
      await state.set(STATE_GROUPS.QUERIES, queryId, query)
    }
    
    // Stream failure notification
    try {
      await streams.researchProgress?.set(queryId, 'failed', {
        id: 'failed',
        queryId,
        status: 'failed',
        error,
        timestamp: new Date().toISOString(),
      })
    } catch (streamError) {
      logger.warn('Stream update failed', { streamError })
    }
    
    logger.info('Failure handling completed', { queryId })
    
  } catch (handlingError) {
    logger.error('Failed to handle research failure', { 
      queryId, 
      originalError: error,
      handlingError: handlingError instanceof Error ? handlingError.message : String(handlingError),
    })
  }
}
