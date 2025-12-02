import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  timestamp: z.string(),
  traceId: z.string(),
  testName: z.string(),
  step: z.number(),
  maxSteps: z.number(),
  customPayload: z.record(z.string(), z.any()).optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'ChainQueueStart',
  description: '🔗 Multi-step workflow chaining - Step 1/3. Each step can have independent retry policies. Failures are isolated to the failed step, enabling partial recovery and resumable workflows.',
  flows: ['queue-tests'],
  subscribes: ['queue-test.chain-start'],
  emits: ['queue-test.chain-middle'],
  input: inputSchema,
}

export const handler: Handlers['ChainQueueStart'] = async (input, { traceId, logger, emit }) => {
  logger.info('🔗 Chain queue step 1/3 started', {
    testName: input.testName,
    traceId,
    step: input.step,
    maxSteps: input.maxSteps,
  })

  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 200))

  logger.info('➡️ Chain queue step 1/3 completed, emitting to step 2', { traceId })

  await emit({
    topic: 'queue-test.chain-middle',
    data: {
      timestamp: input.timestamp,
      traceId,
      testName: input.testName,
      step: 2,
      maxSteps: input.maxSteps,
      chainData: {
        step1CompletedAt: new Date().toISOString(),
        step1ProcessingMs: 200,
      },
      customPayload: input.customPayload,
    },
  })
}

