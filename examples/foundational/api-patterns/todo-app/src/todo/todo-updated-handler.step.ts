import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Todo Updated Handler Event Step
 *
 * Background job that handles generic todo updates.
 * Could be used for:
 * - Audit logging
 * - Sync with external systems
 * - Cache invalidation
 */

const inputSchema = z.object({
  todoId: z.string(),
  updates: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    dueDate: z.string().optional(),
  }),
  timestamp: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'TodoUpdatedHandler',
  description: 'Handles todo update events for audit logging and sync',
  subscribes: ['todo-updated'],
  flows: ['todo-app'],
  input: inputSchema,
  emits: [],
}

export const handler: Handlers['TodoUpdatedHandler'] = async (input, { logger, state }) => {
  const { todoId, updates, timestamp } = input

  logger.info('Processing todo update', { todoId, updates, timestamp })

  // Create audit log entry
  const auditEntry = {
    todoId,
    action: 'update',
    changes: updates,
    timestamp,
    recordedAt: new Date().toISOString(),
  }

  // Store audit log in state (append to list)
  const auditKey = `${todoId}-${Date.now()}`
  await state.set('audit-log', auditKey, auditEntry)

  logger.info('Audit log entry created', { auditKey, todoId })
}

