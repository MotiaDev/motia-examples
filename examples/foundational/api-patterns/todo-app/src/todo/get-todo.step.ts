import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { todoService } from '../services/todo.service'
import { todoSchema } from '../services/todo-types'

/**
 * Get Todo API Step
 *
 * Returns a single todo by ID.
 * Returns 404 if the todo is not found.
 */
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetTodo',
  description: 'Gets a single todo by ID',
  method: 'GET',
  path: '/todos/:id',
  flows: ['todo-app'],
  responseSchema: {
    200: todoSchema,
    404: z.object({ error: z.string() }),
  },
  emits: [],
  includeFiles: ['../services/todo-types.ts', '../services/todo.service.ts'],
}

export const handler: Handlers['GetTodo'] = async (req, { logger, state }) => {
  const { id } = req.pathParams

  logger.info('Getting todo', { todoId: id })

  const todo = await todoService.getById(id, state)

  if (!todo) {
    logger.warn('Todo not found', { todoId: id })
    return {
      status: 404,
      body: { error: 'Todo not found' },
    }
  }

  return {
    status: 200,
    body: todo,
  }
}

