import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ClearQueueTestResults',
  description: 'Clear all queue test results from state',
  flows: ['queue-tests'],
  method: 'DELETE',
  path: '/queue-tests/results',
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      clearedGroups: z.array(z.string()),
    }),
  },
  emits: [],
}

export const handler: Handlers['ClearQueueTestResults'] = async (req, { logger, state }) => {
  logger.info('🗑️ Clearing all queue test results')

  const groupsToClear = [
    'queue-test-results',
    'queue-test-counters',
    'queue-test-attempts',
    'queue-test-heavy-jobs',
    'queue-state-test',
  ]

  for (const groupId of groupsToClear) {
    try {
      await state.clear(groupId)
      logger.info(`✅ Cleared state group: ${groupId}`)
    } catch (error: any) {
      logger.warn(`⚠️ Failed to clear state group: ${groupId}`, { error: error.message })
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      message: 'All queue test results cleared',
      clearedGroups: groupsToClear,
    },
  }
}

