import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  timestamp: z.string(),
  traceId: z.string(),
  testName: z.string(),
  customPayload: z.record(z.string(), z.any()).optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'SimpleQueueTest',
  description: 'Simple queue processing test - validates basic queue functionality',
  flows: ['queue-tests'],
  subscribes: ['queue-test.simple'],
  emits: ['queue-test.simple-complete'],
  input: inputSchema,
}

export const handler: Handlers['SimpleQueueTest'] = async (input, { traceId, logger, emit }) => {
  const startTime = Date.now()
  
  logger.info('📥 Simple queue test started', {
    testName: input.testName,
    traceId,
    receivedAt: new Date().toISOString(),
    originalTimestamp: input.timestamp,
  })

  // Simulate minimal processing
  await new Promise(resolve => setTimeout(resolve, 100))

  const processingTime = Date.now() - startTime
  
  logger.info('✅ Simple queue test completed', {
    testName: input.testName,
    traceId,
    processingTimeMs: processingTime,
  })

  await emit({
    topic: 'queue-test.simple-complete',
    data: {
      testName: input.testName,
      traceId,
      processingTimeMs: processingTime,
      status: 'completed',
      completedAt: new Date().toISOString(),
    },
  })
}

