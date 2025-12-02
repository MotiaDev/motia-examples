import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'QueueHealthCheck',
  description: 'Health check endpoint for queue plugin testing',
  flows: ['queue-tests'],
  method: 'GET',
  path: '/queue-tests/health',
  responseSchema: {
    200: z.object({
      status: z.enum(['healthy', 'degraded', 'unhealthy']),
      timestamp: z.string(),
      checks: z.object({
        stateAccessible: z.boolean(),
        testResultsCount: z.number(),
        activeHeavyJobs: z.number(),
      }),
    }),
  },
  emits: [],
}

export const handler: Handlers['QueueHealthCheck'] = async (req, { logger, state }) => {
  logger.info('🏥 Running queue health check')

  const checks = {
    stateAccessible: false,
    testResultsCount: 0,
    activeHeavyJobs: 0,
  }

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  try {
    // Check if state is accessible
    const testKey = `health-check-${Date.now()}`
    await state.set('health-checks', testKey, { timestamp: new Date().toISOString() })
    const retrieved = await state.get('health-checks', testKey)
    await state.delete('health-checks', testKey)
    checks.stateAccessible = retrieved !== null

    if (!checks.stateAccessible) {
      status = 'unhealthy'
    }

    // Count test results
    const results = await state.getGroup('queue-test-results')
    checks.testResultsCount = results.length

    // Count active heavy jobs
    const heavyJobs = await state.getGroup('queue-test-heavy-jobs')
    checks.activeHeavyJobs = heavyJobs.filter((j: any) => j.status === 'processing').length

  } catch (error: any) {
    logger.error('❌ Health check failed', { error: error.message })
    status = 'unhealthy'
    checks.stateAccessible = false
  }

  logger.info('🏥 Queue health check completed', { status, checks })

  return {
    status: 200,
    body: {
      status,
      timestamp: new Date().toISOString(),
      checks,
    },
  }
}

