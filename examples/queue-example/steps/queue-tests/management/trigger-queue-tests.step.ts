import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const bodySchema = z.object({
  testType: z.enum([
    'simple',
    'chain',
    'parallel',
    'heavy',
    'state',
    'error',
    'error-permanent', // New: Test permanent failures that go directly to DLQ
    'all'
  ]).describe('Type of queue test to run'),
  payload: z.record(z.string(), z.any()).optional().describe('Optional custom payload'),
  count: z.number().optional().default(1).describe('Number of events to emit for parallel tests'),
  failureCount: z.number().optional().default(2).describe('For error tests: number of failures before success'),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'TriggerQueueTests',
  description: '🚀 Entry point for BullMQ queue demonstrations - showcases retry mechanisms, DLQ, parallel processing, and event chaining. Use this to trigger various queue scenarios and watch them process in Workbench.',
  flows: ['queue-tests'],
  method: 'POST',
  path: '/queue-tests/trigger',
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      testType: z.string(),
      emittedEvents: z.number(),
      traceId: z.string(),
    }),
    400: z.object({ error: z.string() }),
  },
  emits: [
    'queue-test.simple',
    'queue-test.chain-start',
    'queue-test.parallel',
    'queue-test.heavy',
    'queue-test.state',
    'queue-test.error',
  ],
}

export const handler: Handlers['TriggerQueueTests'] = async (req, { logger, traceId, emit }) => {
  const { testType, payload, count = 1, failureCount = 2 } = bodySchema.parse(req.body)
  
  logger.info('🚀 Triggering queue tests', { testType, count, failureCount, traceId })
  
  let emittedEvents = 0
  const timestamp = new Date().toISOString()
  const baseData = { timestamp, traceId, customPayload: payload }

  try {
    if (testType === 'simple' || testType === 'all') {
      await emit({
        topic: 'queue-test.simple',
        data: { ...baseData, testName: 'simple-processing' },
      })
      emittedEvents++
      logger.info('✅ Emitted simple queue test')
    }

    if (testType === 'chain' || testType === 'all') {
      await emit({
        topic: 'queue-test.chain-start',
        data: { ...baseData, testName: 'chain-processing', step: 1, maxSteps: 3 },
      })
      emittedEvents++
      logger.info('✅ Emitted chain queue test')
    }

    if (testType === 'parallel' || testType === 'all') {
      const parallelCount = testType === 'all' ? 3 : count
      for (let i = 0; i < parallelCount; i++) {
        await emit({
          topic: 'queue-test.parallel',
          data: { ...baseData, testName: 'parallel-processing', index: i, total: parallelCount },
        })
        emittedEvents++
      }
      logger.info(`✅ Emitted ${parallelCount} parallel queue tests`)
    }

    if (testType === 'heavy' || testType === 'all') {
      await emit({
        topic: 'queue-test.heavy',
        data: { ...baseData, testName: 'heavy-processing', processingTimeMs: 5000 },
      })
      emittedEvents++
      logger.info('✅ Emitted heavy queue test')
    }

    if (testType === 'state' || testType === 'all') {
      await emit({
        topic: 'queue-test.state',
        data: { ...baseData, testName: 'state-management', operation: 'create' },
      })
      emittedEvents++
      logger.info('✅ Emitted state queue test')
    }

    if (testType === 'error' || testType === 'all') {
      await emit({
        topic: 'queue-test.error',
        data: { 
          ...baseData, 
          testName: 'error-retry-recovery',
          shouldFail: true,
          failureCount, // Will fail this many times then succeed
          errorType: 'throw',
        },
      })
      emittedEvents++
      logger.info('✅ Emitted error/retry queue test', { 
        message: `Will fail ${failureCount} times then succeed (demonstrates retry mechanism)` 
      })
    }

    // 🔥 NEW: Test permanent failures that go directly to DLQ
    if (testType === 'error-permanent') {
      await emit({
        topic: 'queue-test.error',
        data: { 
          ...baseData, 
          testName: 'permanent-failure-to-dlq',
          shouldFail: true,
          failureCount: 0, // Not used for permanent failures, but required by schema
          errorType: 'permanent', // Goes directly to DLQ
        },
      })
      emittedEvents++
      logger.info('✅ Emitted permanent failure test', {
        message: 'This will route directly to Dead Letter Queue - check /queue-tests/dlq'
      })
    }

    return {
      status: 200,
      body: {
        success: true,
        testType,
        emittedEvents,
        traceId,
      },
    }
  } catch (error: any) {
    logger.error('❌ Failed to trigger queue tests', { error: error.message })
    return {
      status: 400,
      body: { error: error.message },
    }
  }
}

