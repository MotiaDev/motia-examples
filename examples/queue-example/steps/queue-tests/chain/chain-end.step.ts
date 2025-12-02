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
    step2CompletedAt: z.string(),
    step2ProcessingMs: z.number(),
  }),
  customPayload: z.record(z.string(), z.any()).optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'ChainQueueEnd',
  description: 'Final step in a chained queue processing test',
  flows: ['queue-tests'],
  subscribes: ['queue-test.chain-end'],
  emits: [],
  input: inputSchema,
}

export const handler: Handlers['ChainQueueEnd'] = async (input, { traceId, logger, state }) => {
  const step3ProcessingMs = 150
  
  logger.info('🔗 Chain queue step 3/3 started', {
    testName: input.testName,
    traceId,
    step: input.step,
    maxSteps: input.maxSteps,
    chainData: input.chainData,
  })

  // Simulate final processing
  await new Promise(resolve => setTimeout(resolve, step3ProcessingMs))

  const totalProcessingMs = 
    input.chainData.step1ProcessingMs + 
    input.chainData.step2ProcessingMs + 
    step3ProcessingMs

  logger.info('🏁 Chain queue test completed', {
    traceId,
    totalSteps: 3,
    totalProcessingMs,
    chainSummary: {
      step1: input.chainData.step1ProcessingMs,
      step2: input.chainData.step2ProcessingMs,
      step3: step3ProcessingMs,
    },
  })

  // Store chain test result
  await state.set('queue-test-results', `chain-${traceId}`, {
    testType: 'chain',
    traceId,
    totalSteps: 3,
    totalProcessingMs,
    chainData: {
      ...input.chainData,
      step3CompletedAt: new Date().toISOString(),
      step3ProcessingMs,
    },
    status: 'completed',
    completedAt: new Date().toISOString(),
  })
}

