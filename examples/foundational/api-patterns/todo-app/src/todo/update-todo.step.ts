import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { todoService } from '../services/todo.service'
import { updateTodoSchema, todoSchema } from '../services/todo-types'

/**
 * Update Todo API Step
 *
 * Updates an existing todo item.
 * Emits events for completion workflow if status changes to completed.
 * Updates real-time stream for immediate UI updates.
 */
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'UpdateTodo',
  description: 'Updates an existing todo',
  method: 'PATCH',
  path: '/todos/:id',
  flows: ['todo-app'],
  bodySchema: updateTodoSchema,
  responseSchema: {
    200: todoSchema,
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
  emits: [
    { topic: 'todo-updated', label: 'Todo Updated' },
    { topic: 'todo-completed', label: 'Todo Completed', conditional: true },
    { topic: 'track-analytics', label: 'Track Analytics Event' },
  ],
  includeFiles: ['../services/todo-types.ts', '../services/todo.service.ts'],
}

export const handler: Handlers['UpdateTodo'] = async (req, { emit, logger, streams, state }) => {
  const { id } = req.pathParams

  try {
    const input = updateTodoSchema.parse(req.body)

    logger.info('Updating todo', { todoId: id, updates: input })

    // Get current todo to check for status change
    const existingTodo = await todoService.getById(id, state)

    if (!existingTodo) {
      logger.warn('Todo not found', { todoId: id })
      return {
        status: 404,
        body: { error: 'Todo not found' },
      }
    }

    // Update the todo
    const todo = await todoService.update(id, input, state)

    if (!todo) {
      return {
        status: 404,
        body: { error: 'Todo not found' },
      }
    }

    // Update the real-time stream
    await streams.todo.set('all-todos', todo.id, todo)

    // Emit generic update event
    await emit({
      topic: 'todo-updated',
      data: {
        todoId: todo.id,
        updates: input,
        timestamp: todo.updatedAt,
      },
    })

    // If status changed to completed, emit completion workflow event
    if (input.status === 'completed' && existingTodo.status !== 'completed') {
      logger.info('Todo completed, triggering completion workflow', { todoId: id })

      await emit({
        topic: 'todo-completed',
        data: {
          todoId: todo.id,
          title: todo.title,
          completedAt: todo.completedAt!,
        },
      })
    }

    // Track analytics
    await emit({
      topic: 'track-analytics',
      data: {
        event: input.status === 'completed' ? 'todo_completed' : 'todo_updated',
        todoId: todo.id,
        previousStatus: existingTodo.status,
        newStatus: todo.status,
        timestamp: todo.updatedAt,
      },
    })

    logger.info('Todo updated successfully', { todoId: todo.id })

    return {
      status: 200,
      body: todo,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validation error updating todo', { error: error.message })
      return {
        status: 400,
        body: { error: 'Validation failed: ' + error.errors.map((e) => e.message).join(', ') },
      }
    }

    logger.error('Error updating todo', { error: String(error) })
    return {
      status: 400,
      body: { error: 'Failed to update todo' },
    }
  }
}

