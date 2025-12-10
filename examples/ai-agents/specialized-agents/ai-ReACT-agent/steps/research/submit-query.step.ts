/**
 * POST /research/query - Submit a research query
 * 
 * This API endpoint accepts a natural-language question and optional context,
 * validates the request, stores it in state, assigns a query ID, and emits
 * a research.query.requested event to trigger the ReAct agent pipeline.
 */

import { ApiRouteConfig, Handlers } from 'motia'
import { v4 as uuidv4 } from 'uuid'
import type { ResearchQuery, ResearchContext } from '../../src/services/types'
import { STATE_GROUPS } from '../../src/services/types'

// Using JSON Schema to avoid Zod v4 compatibility issues with nested optionals
const bodySchema = {
  type: 'object',
  properties: {
    question: { type: 'string', minLength: 10 },
    context: {
      type: 'object',
      properties: {
        industry: { type: 'string' },
        timeframe: { type: 'string' },
        preferredSources: { type: 'array', items: { type: 'string' } },
        maxIterations: { type: 'number', minimum: 1, maximum: 20 },
        budget: {
          type: 'object',
          properties: {
            maxTokens: { type: 'number' },
            maxToolCalls: { type: 'number' },
          },
        },
      },
    },
  },
  required: ['question'],
}

const responseSuccessSchema = {
  type: 'object',
  properties: {
    queryId: { type: 'string' },
    status: { type: 'string' },
    message: { type: 'string' },
    estimatedTime: { type: 'string' },
  },
  required: ['queryId', 'status', 'message', 'estimatedTime'],
}

const responseErrorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    details: { type: 'object' },
  },
  required: ['error'],
}

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'SubmitResearchQuery',
  description: 'Submit a research query for multi-hop reasoning and analysis',
  path: '/research/query',
  method: 'POST',
  emits: ['research.query.requested'],
  flows: ['research-assistant'],
  bodySchema,
  responseSchema: {
    202: responseSuccessSchema,
    400: responseErrorSchema,
    500: responseErrorSchema,
  },
}

export const handler: Handlers['SubmitResearchQuery'] = async (req, { emit, logger, state }) => {
  try {
    const body = req.body as { question: string; context?: ResearchContext }
    const { question, context } = body
    
    if (!question || question.length < 10) {
      return {
        status: 400,
        body: {
          error: 'Question must be at least 10 characters',
        },
      }
    }
    
    const queryId = uuidv4()
    const now = new Date().toISOString()
    
    logger.info('Research query received', { queryId, question: question.slice(0, 100) })
    
    // Create the research query object
    const researchQuery: ResearchQuery = {
      queryId,
      question,
      context,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    
    // Store the query in state
    await state.set(STATE_GROUPS.QUERIES, queryId, researchQuery)
    
    // Initialize iterations array
    await state.set(STATE_GROUPS.ITERATIONS, queryId, [])
    
    logger.info('Research query stored in state', { queryId })
    
    // Emit event to trigger the ReAct agent pipeline
    await emit({
      topic: 'research.query.requested',
      data: {
        queryId,
        question,
        context,
      },
    })
    
    logger.info('Research query event emitted', { queryId })
    
    return {
      status: 202,
      body: {
        queryId,
        status: 'pending',
        message: 'Research query accepted. Processing will begin shortly.',
        estimatedTime: '30-120 seconds depending on complexity',
      },
    }
  } catch (error) {
    logger.error('Failed to submit research query', { error })
    return {
      status: 500,
      body: {
        error: 'Failed to process research query',
      },
    }
  }
}
