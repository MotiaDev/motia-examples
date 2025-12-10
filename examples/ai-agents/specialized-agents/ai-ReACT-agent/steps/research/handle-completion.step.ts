/**
 * Handle Research Completion Step
 * 
 * This event step handles successful research completion:
 * - Logs completion details
 * - Can trigger notifications or webhooks
 */

import { EventConfig, Handlers } from 'motia'
import type { ResearchResult } from '../../src/services/types'
import { STATE_GROUPS } from '../../src/services/types'

const inputSchema = {
  type: 'object',
  properties: {
    queryId: { type: 'string' },
    success: { type: 'boolean' },
  },
  required: ['queryId', 'success'],
}

export const config: EventConfig = {
  type: 'event',
  name: 'HandleResearchCompletion',
  description: 'Handles successful research completion',
  subscribes: ['research.completed'],
  emits: [],
  input: inputSchema,
  flows: ['research-assistant'],
}

export const handler: Handlers['HandleResearchCompletion'] = async (input, { logger, state }) => {
  const { queryId, success } = input as { queryId: string; success: boolean }
  
  logger.info('Research completion handler triggered', { queryId, success })
  
  try {
    // Get the result
    const result = await state.get<ResearchResult>(STATE_GROUPS.RESULTS, queryId)
    
    if (result) {
      logger.info('Research completed successfully', {
        queryId,
        question: result.question.slice(0, 100),
        answerLength: result.answer.length,
        iterations: result.metadata.totalIterations,
        toolCalls: result.metadata.totalToolCalls,
        executionTimeMs: result.metadata.executionTimeMs,
        model: result.metadata.model,
      })
      
      // Here you could:
      // - Send a webhook notification
      // - Trigger email notifications
      // - Store in a database
      // - etc.
    }
    
  } catch (error) {
    logger.error('Failed to handle completion', { 
      queryId, 
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
