/**
 * GET /research/query/:queryId - Get research query status and result
 * 
 * This API endpoint retrieves the current status and result of a research query.
 */

import { ApiRouteConfig, Handlers } from 'motia'
import type { ResearchQuery, ResearchResult, ReActIteration } from '../../src/services/types'
import { STATE_GROUPS } from '../../src/services/types'

const responseSuccessSchema = {
  type: 'object',
  properties: {
    queryId: { type: 'string' },
    status: { type: 'string' },
    question: { type: 'string' },
    currentIteration: { type: 'number' },
    iterations: { type: 'array' },
    result: { type: 'object' },
  },
  required: ['queryId', 'status', 'question'],
}

const responseErrorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
}

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetResearchQueryStatus',
  description: 'Get the status and result of a research query',
  path: '/research/query/:queryId',
  method: 'GET',
  emits: [],
  flows: ['research-assistant'],
  responseSchema: {
    200: responseSuccessSchema,
    404: responseErrorSchema,
    500: responseErrorSchema,
  },
}

export const handler: Handlers['GetResearchQueryStatus'] = async (req, { logger, state }) => {
  try {
    const { queryId } = req.pathParams
    
    logger.info('Fetching research query status', { queryId })
    
    // Get the query from state
    const query = await state.get<ResearchQuery>(STATE_GROUPS.QUERIES, queryId)
    
    if (!query) {
      return {
        status: 404,
        body: {
          error: 'Research query not found',
        },
      }
    }
    
    // Get iterations
    const iterations = await state.get<ReActIteration[]>(STATE_GROUPS.ITERATIONS, queryId) || []
    
    // Get result if completed
    let result: ResearchResult | null = null
    if (query.status === 'completed') {
      result = await state.get<ResearchResult>(STATE_GROUPS.RESULTS, queryId)
    }
    
    return {
      status: 200,
      body: {
        queryId: query.queryId,
        status: query.status,
        question: query.question,
        currentIteration: iterations.length,
        iterations: iterations,
        result: result || undefined,
      },
    }
  } catch (error) {
    logger.error('Failed to get research query status', { error })
    return {
      status: 500,
      body: {
        error: 'Failed to retrieve query status',
      },
    }
  }
}
