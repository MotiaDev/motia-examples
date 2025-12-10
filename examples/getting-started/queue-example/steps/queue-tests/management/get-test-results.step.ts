import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetQueueTestResults',
  description: 'Retrieve queue test results from state',
  flows: ['queue-tests'],
  method: 'GET',
  path: '/queue-tests/results',
  queryParams: [
    { name: 'traceId', description: 'Filter by specific trace ID' },
    { name: 'testType', description: 'Filter by test type (simple, chain, parallel, heavy, state, error)' },
  ],
  responseSchema: {
    200: z.object({
      results: z.array(z.any()),
      count: z.number(),
    }),
  },
  emits: [],
}

export const handler: Handlers['GetQueueTestResults'] = async (req, { logger, state }) => {
  const { traceId, testType } = req.queryParams as { traceId?: string; testType?: string }
  
  logger.info('📊 Fetching queue test results', { traceId, testType })

  // Get all test results
  const allResults = await state.getGroup<Record<string, any>>('queue-test-results')

  // Filter results based on query params
  let filteredResults = allResults

  if (traceId) {
    filteredResults = filteredResults.filter(r => r.traceId === traceId)
  }

  if (testType) {
    filteredResults = filteredResults.filter(r => r.testType === testType)
  }

  // Sort by completion time (most recent first)
  filteredResults.sort((a, b) => {
    const aTime = new Date(a.completedAt || 0).getTime()
    const bTime = new Date(b.completedAt || 0).getTime()
    return bTime - aTime
  })

  logger.info('📊 Queue test results retrieved', { 
    totalCount: allResults.length,
    filteredCount: filteredResults.length,
  })

  return {
    status: 200,
    body: {
      results: filteredResults,
      count: filteredResults.length,
    },
  }
}

