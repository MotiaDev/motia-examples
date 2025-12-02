import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  timestamp: z.string(),
  traceId: z.string(),
  testName: z.string(),
  index: z.number(),
  total: z.number(),
  customPayload: z.record(z.string(), z.any()).optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'ParallelQueueTest',
  description: '🔀 Parallel processing with concurrency control (5 workers). Demonstrates how BullMQ handles multiple jobs simultaneously while respecting resource limits - essential for high-throughput production systems.',
  flows: ['queue-tests'],
  subscribes: ['queue-test.parallel'],
  emits: [],
  input: inputSchema,
  // Note: Concurrency is configured at the BullMQ adapter level, not per-step
  // BullMQ handles parallel processing automatically based on worker configuration
}

export const handler: Handlers['ParallelQueueTest'] = async (input, { traceId, logger, state }) => {
  const startTime = Date.now()
  const workerId = `worker-${input.index}`
  
  logger.info(`🔀 Parallel queue test started [${input.index + 1}/${input.total}]`, {
    testName: input.testName,
    traceId,
    workerId,
    index: input.index,
    total: input.total,
  })

  // Simulate variable processing time based on index
  const processingTime = 100 + (input.index * 50) + Math.random() * 100
  await new Promise(resolve => setTimeout(resolve, processingTime))

  const actualProcessingTime = Date.now() - startTime

  logger.info(`✅ Parallel queue test completed [${input.index + 1}/${input.total}]`, {
    testName: input.testName,
    traceId,
    workerId,
    processingTimeMs: actualProcessingTime,
  })

  // Store individual parallel test result
  await state.set('queue-test-results', `parallel-${traceId}-${input.index}`, {
    testType: 'parallel',
    traceId,
    workerId,
    index: input.index,
    total: input.total,
    processingTimeMs: actualProcessingTime,
    status: 'completed',
    completedAt: new Date().toISOString(),
  })

  // Update parallel test counter
  const counterKey = `parallel-counter-${traceId}`
  const currentCount = await state.get<number>('queue-test-counters', counterKey) || 0
  await state.set('queue-test-counters', counterKey, currentCount + 1)

  logger.info(`📊 Parallel test progress: ${currentCount + 1}/${input.total}`, { traceId })
}

