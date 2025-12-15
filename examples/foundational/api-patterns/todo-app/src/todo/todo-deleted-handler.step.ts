import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Todo Deleted Handler Event Step
 *
 * Background job that handles todo deletion.
 * Performs cleanup tasks:
 * - Removes from any lists/collections
 * - Clears cached data
 * - Logs deletion for audit
 */

const inputSchema = z.object({
  todoId: z.string(),
  title: z.string(),
  timestamp: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'TodoDeletedHandler',
  description: 'Handles todo deletion cleanup and audit',
  subscribes: ['todo-deleted'],
  flows: ['todo-app'],
  input: inputSchema,
  emits: [],
}

export const handler: Handlers['TodoDeletedHandler'] = async (input, { logger, state }) => {
  const { todoId, title, timestamp } = input

  logger.info('Processing todo deletion', { todoId, title, timestamp })

  // Create deletion audit log
  const auditEntry = {
    todoId,
    title,
    action: 'delete',
    timestamp,
    recordedAt: new Date().toISOString(),
  }

  const auditKey = `deleted-${todoId}-${Date.now()}`
  await state.set('audit-log', auditKey, auditEntry)

  // Clean up any related state data
  // In a real app, this would clean up notifications, assignments, etc.
  await state.delete('notification-history', todoId)

  logger.info('Todo deletion processed', { todoId, title })
}

