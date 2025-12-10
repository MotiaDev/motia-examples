import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  timestamp: z.string(),
  traceId: z.string(),
  testName: z.string(),
  step: z.number(),
  maxSteps: z.number(),
  chainData: z.object({
    step1CompletedAt: z.string(),
    step1ProcessingMs: z.number(),
  }),
  customPayload: z.record(z.string(), z.any()).optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'ChainQueueMiddle',
  description: 'Middle step in a chained queue processing test',
  flows: ['queue-tests'],
  subscribes: ['queue-test.chain-middle'],
  emits: ['queue-test.chain-end'],
  input: inputSchema,
}

export const handler: Handlers['ChainQueueMiddle'] = async (input, { traceId, logger, emit }) => {
  logger.info('🔗 Chain queue step 2/3 started', {
    testName: input.testName,
    traceId,
    step: input.step,
    maxSteps: input.maxSteps,
    previousStepData: input.chainData,
  })

  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 300))

  logger.info('➡️ Chain queue step 2/3 completed, emitting to step 3', { traceId })

  await emit({
    topic: 'queue-test.chain-end',
    data: {
      timestamp: input.timestamp,
      traceId,
      testName: input.testName,
      step: 3,
      maxSteps: input.maxSteps,
      chainData: {
        ...input.chainData,
        step2CompletedAt: new Date().toISOString(),
        step2ProcessingMs: 300,
      },
      customPayload: input.customPayload,
    },
  })
}

