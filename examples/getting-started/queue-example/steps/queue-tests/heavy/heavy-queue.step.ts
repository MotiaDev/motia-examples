import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  timestamp: z.string(),
  traceId: z.string(),
  testName: z.string(),
  processingTimeMs: z.number(),
  customPayload: z.record(z.string(), z.any()).optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'HeavyQueueTest',
  description: 'Heavy/long-running queue processing test - validates timeout handling and job persistence',
  flows: ['queue-tests'],
  subscribes: ['queue-test.heavy'],
  emits: [],
  input: inputSchema,
  // Note: Queue timeout and retry settings are configured at the BullMQ adapter level
  // The handler simulates long-running jobs with progress tracking
}

export const handler: Handlers['HeavyQueueTest'] = async (input, { traceId, logger, state }) => {
  const startTime = Date.now()
  const targetProcessingTime = input.processingTimeMs || 5000
  
  logger.info('⏳ Heavy queue test started', {
    testName: input.testName,
    traceId,
    targetProcessingTimeMs: targetProcessingTime,
    startedAt: new Date().toISOString(),
  })

  // Store job start state
  await state.set('queue-test-heavy-jobs', traceId, {
    status: 'processing',
    startedAt: new Date().toISOString(),
    targetProcessingTimeMs: targetProcessingTime,
    progress: 0,
  })

  // Simulate heavy processing with progress updates
  const progressIntervals = 10
  const intervalTime = targetProcessingTime / progressIntervals

  for (let i = 1; i <= progressIntervals; i++) {
    await new Promise(resolve => setTimeout(resolve, intervalTime))
    
    const progress = (i / progressIntervals) * 100
    
    // Update progress in state
    await state.set('queue-test-heavy-jobs', traceId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      targetProcessingTimeMs: targetProcessingTime,
      progress,
      lastUpdateAt: new Date().toISOString(),
    })

    logger.info(`⏳ Heavy queue test progress: ${progress.toFixed(0)}%`, {
      traceId,
      progress,
      elapsedMs: Date.now() - startTime,
    })
  }

  const actualProcessingTime = Date.now() - startTime

  logger.info('✅ Heavy queue test completed', {
    testName: input.testName,
    traceId,
    targetProcessingTimeMs: targetProcessingTime,
    actualProcessingTimeMs: actualProcessingTime,
    completedAt: new Date().toISOString(),
  })

  // Store final result
  await state.set('queue-test-results', `heavy-${traceId}`, {
    testType: 'heavy',
    traceId,
    targetProcessingTimeMs: targetProcessingTime,
    actualProcessingTimeMs: actualProcessingTime,
    status: 'completed',
    completedAt: new Date().toISOString(),
  })

  // Clean up job tracking state
  await state.delete('queue-test-heavy-jobs', traceId)
}

