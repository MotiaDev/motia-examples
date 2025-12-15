import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { todoService } from '../services/todo.service'

/**
 * Delete Todo API Step
 *
 * Deletes a todo by ID.
 * Updates real-time stream to notify clients of deletion.
 * Emits analytics event for tracking.
 */
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'DeleteTodo',
  description: 'Deletes a todo by ID',
  method: 'DELETE',
  path: '/todos/:id',
  flows: ['todo-app'],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
    404: z.object({ error: z.string() }),
  },
  emits: [
    { topic: 'todo-deleted', label: 'Todo Deleted' },
    { topic: 'track-analytics', label: 'Track Analytics Event' },
  ],
  includeFiles: ['../services/todo-types.ts', '../services/todo.service.ts'],
}

export const handler: Handlers['DeleteTodo'] = async (req, { emit, logger, streams, state }) => {
  const { id } = req.pathParams

  logger.info('Deleting todo', { todoId: id })

  const deletedTodo = await todoService.delete(id, state)

  if (!deletedTodo) {
    logger.warn('Todo not found', { todoId: id })
    return {
      status: 404,
      body: { error: 'Todo not found' },
    }
  }

  // Remove from real-time stream
  await streams.todo.delete('all-todos', id)

  // Emit deletion event
  await emit({
    topic: 'todo-deleted',
    data: {
      todoId: id,
      title: deletedTodo.title,
      timestamp: new Date().toISOString(),
    },
  })

  // Track analytics
  await emit({
    topic: 'track-analytics',
    data: {
      event: 'todo_deleted',
      todoId: id,
      status: deletedTodo.status,
      timestamp: new Date().toISOString(),
    },
  })

  logger.info('Todo deleted successfully', { todoId: id })

  return {
    status: 200,
    body: {
      success: true,
      message: `Todo "${deletedTodo.title}" deleted successfully`,
    },
  }
}

