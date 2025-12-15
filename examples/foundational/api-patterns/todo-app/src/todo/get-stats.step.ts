import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { todoService } from '../services/todo.service'

/**
 * Get Todo Stats API Step
 *
 * Returns aggregated statistics about todos.
 * Useful for dashboards and reporting.
 */
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetTodoStats',
  description: 'Gets aggregated todo statistics',
  method: 'GET',
  path: '/todo-stats',
  flows: ['todo-app'],
  responseSchema: {
    200: z.object({
      total: z.number(),
      pending: z.number(),
      inProgress: z.number(),
      completed: z.number(),
      archived: z.number(),
    }),
  },
  emits: [],
  includeFiles: ['../services/todo.service.ts', '../services/todo-types.ts'],
}

export const handler: Handlers['GetTodoStats'] = async (_req, { logger, state }) => {
  logger.info('Getting todo statistics')

  const stats = await todoService.getStats(state)

  logger.info('Todo stats retrieved', stats)

  return {
    status: 200,
    body: stats,
  }
}

