import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Analytics Tracker Event Step
 *
 * Background job that tracks all todo-related analytics events.
 * In production, this would send data to analytics services like:
 * - Segment
 * - Mixpanel
 * - Google Analytics
 * - Custom data warehouse
 */

const inputSchema = z.object({
  event: z.string(),
  todoId: z.string(),
  timestamp: z.string(),
  // Additional optional fields
  priority: z.string().optional(),
  previousStatus: z.string().optional(),
  newStatus: z.string().optional(),
  status: z.string().optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'AnalyticsTracker',
  description: 'Tracks analytics events for todos',
  subscribes: ['track-analytics'],
  flows: ['todo-app'],
  input: inputSchema,
  emits: [],
}

export const handler: Handlers['AnalyticsTracker'] = async (input, { logger, state }) => {
  const { event, todoId, timestamp, ...metadata } = input

  logger.info('Tracking analytics event', { event, todoId, timestamp })

  // Build analytics payload
  const analyticsPayload = {
    event,
    todoId,
    timestamp,
    metadata,
    trackedAt: new Date().toISOString(),
    source: 'motia-todo-app',
  }

  // Store in state for demo purposes (in production, send to analytics service)
  const analyticsKey = `${todoId}-${event}-${Date.now()}`
  await state.set('analytics-events', analyticsKey, analyticsPayload)

  // Update aggregated metrics
  const metricsKey = 'daily-metrics'
  const todayKey = new Date().toISOString().split('T')[0]

  const existingMetrics = await state.get<Record<string, number>>('analytics-aggregates', `${metricsKey}-${todayKey}`)

  const metrics = existingMetrics ?? {
    todo_created: 0,
    todo_updated: 0,
    todo_completed: 0,
    todo_deleted: 0,
  }

  // Increment the counter for this event type
  if (event in metrics) {
    metrics[event] = (metrics[event] ?? 0) + 1
  } else {
    metrics[event] = 1
  }

  await state.set('analytics-aggregates', `${metricsKey}-${todayKey}`, metrics)

  logger.info('Analytics event tracked', {
    event,
    todoId,
    dailyMetrics: metrics,
  })
}

