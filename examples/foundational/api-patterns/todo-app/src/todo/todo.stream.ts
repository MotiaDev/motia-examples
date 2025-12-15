import { StreamConfig } from 'motia'
import { z } from 'zod'

/**
 * Real-time stream for todo updates.
 *
 * Clients can subscribe to this stream to receive real-time updates
 * whenever todos are created, updated, or deleted.
 *
 * Stream supports:
 * - Individual todo subscriptions (by todo ID)
 * - User-level subscriptions (all todos for a user)
 * - Ephemeral events (typing indicators, activity notifications)
 */

// Inline schema to avoid module resolution issues with compiled streams
const todoStreamSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'archived']),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
})

export const config: StreamConfig = {
  name: 'todo',
  schema: todoStreamSchema,
  baseConfig: { storageType: 'default' },
}

