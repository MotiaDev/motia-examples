import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { todoService } from '../services/todo.service'
import { createTodoSchema, todoSchema } from '../services/todo-types'

/**
 * Create Todo API Step
 *
 * Creates a new todo item and emits events for:
 * - Notifications (e.g., email, push)
 * - Analytics tracking
 * - Real-time stream updates
 */
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CreateTodo',
  description: 'Creates a new todo item',
  method: 'POST',
  path: '/todos',
  flows: ['todo-app'],
  bodySchema: createTodoSchema,
  responseSchema: {
    201: todoSchema,
    400: z.object({ error: z.string() }),
  },
  emits: [
    { topic: 'todo-created', label: 'New Todo Created' },
    { topic: 'track-analytics', label: 'Track Analytics Event' },
  ],
  includeFiles: ['../services/todo-types.ts', '../services/todo.service.ts'],
}

export const handler: Handlers['CreateTodo'] = async (req, { emit, logger, streams, state }) => {
  try {
    const input = createTodoSchema.parse(req.body)
    logger.info('Creating new todo', { title: input.title, priority: input.priority })

    // Create the todo in our service layer (using state for persistence)
    const todo = await todoService.create(input, state)

    // Update the real-time stream so clients get immediate updates
    await streams.todo.set('all-todos', todo.id, todo)

    // Emit event for notification processing (background job)
    await emit({
      topic: 'todo-created',
      data: {
        todoId: todo.id,
        title: todo.title,
        priority: todo.priority,
      },
    })

    // Emit event for analytics tracking (background job)
    await emit({
      topic: 'track-analytics',
      data: {
        event: 'todo_created',
        todoId: todo.id,
        priority: todo.priority,
        timestamp: todo.createdAt,
      },
    })

    logger.info('Todo created successfully', { todoId: todo.id })

    return {
      status: 201,
      body: todo,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validation error creating todo', { error: error.message })
      return {
        status: 400,
        body: { error: 'Validation failed: ' + error.errors.map((e) => e.message).join(', ') },
      }
    }

    logger.error('Error creating todo', { error: String(error) })
    return {
      status: 400,
      body: { error: 'Failed to create todo' },
    }
  }
}

