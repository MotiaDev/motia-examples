import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  testName: z.string(),
  traceId: z.string(),
  processingTimeMs: z.number(),
  status: z.string(),
  completedAt: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'SimpleQueueComplete',
  description: 'Handles completion of simple queue test',
  flows: ['queue-tests'],
  subscribes: ['queue-test.simple-complete'],
  emits: [],
  input: inputSchema,
}

export const handler: Handlers['SimpleQueueComplete'] = async (input, { traceId, logger, state }) => {
  logger.info('🏁 Simple queue test completion received', {
    testName: input.testName,
    traceId,
    processingTimeMs: input.processingTimeMs,
    status: input.status,
  })

  // Store test result in state for auditing
  await state.set('queue-test-results', `simple-${traceId}`, {
    testType: 'simple',
    traceId,
    processingTimeMs: input.processingTimeMs,
    status: input.status,
    completedAt: input.completedAt,
  })

  logger.info('📊 Simple queue test result stored', { traceId })
}

