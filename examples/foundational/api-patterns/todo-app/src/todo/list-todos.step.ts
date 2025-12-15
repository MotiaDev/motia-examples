import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { todoService } from '../services/todo.service'
import { todoSchema, todoStatusSchema } from '../services/todo-types'

/**
 * List Todos API Step
 *
 * Returns all todos with optional status filter.
 * Supports query parameter filtering for status.
 */
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListTodos',
  description: 'Lists all todos with optional status filter',
  method: 'GET',
  path: '/todos',
  flows: ['todo-app'],
  queryParams: [
    {
      name: 'status',
      description: 'Filter by status: pending, in_progress, completed, archived',
    },
  ],
  responseSchema: {
    200: z.object({
      todos: z.array(todoSchema),
      count: z.number(),
    }),
  },
  emits: [],
  includeFiles: ['../services/todo-types.ts', '../services/todo.service.ts'],
}

export const handler: Handlers['ListTodos'] = async (req, { logger, state }) => {
  const statusParam = req.queryParams.status as string | undefined

  logger.info('Listing todos', { statusFilter: statusParam })

  // Validate status if provided
  let status = undefined
  if (statusParam) {
    const result = todoStatusSchema.safeParse(statusParam)
    if (result.success) {
      status = result.data
    }
  }

  const todos = await todoService.getAll(state, status)

  logger.info('Todos retrieved', { count: todos.length })

  return {
    status: 200,
    body: {
      todos,
      count: todos.length,
    },
  }
}

