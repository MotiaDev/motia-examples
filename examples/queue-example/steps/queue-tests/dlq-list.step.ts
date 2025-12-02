import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * 🔥 DLQ MANAGEMENT API - List Dead Letter Queue entries
 * 
 * Production feature: View all failed messages waiting for intervention
 */

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListDeadLetterQueue',
  description: '☠️ List all messages in the Dead Letter Queue',
  flows: ['queue-tests'],
  method: 'GET',
  path: '/queue-tests/dlq',
  queryParams: [
    { name: 'status', description: 'Filter by status (pending-review, retrying, resolved, discarded)' },
    { name: 'topic', description: 'Filter by original topic' },
  ],
  responseSchema: {
    200: z.object({
      entries: z.array(z.object({
        id: z.string(),
        originalTopic: z.string(),
        traceId: z.string(),
        failureReason: z.string(),
        attemptCount: z.number(),
        status: z.string(),
        arrivedInDlqAt: z.string(),
        canRetry: z.boolean(),
      })),
      stats: z.object({
        totalCount: z.number(),
        byTopic: z.record(z.string(), z.number()),
        byStatus: z.record(z.string(), z.number()),
      }),
    }),
  },
  emits: [],
}

export const handler: Handlers['ListDeadLetterQueue'] = async (req, { logger, state }) => {
  const { status, topic } = req.queryParams as { status?: string; topic?: string }

  logger.info('📋 Listing Dead Letter Queue entries', { status, topic })

  // Get all DLQ entries
  const allEntries = await state.getGroup<{
    id: string
    originalTopic: string
    traceId: string
    failureReason: string
    attemptCount: number
    status: string
    arrivedInDlqAt: string
    canRetry: boolean
    originalData: any
  }>('queue-test-dlq')

  // Apply filters
  let filteredEntries = allEntries

  if (status) {
    filteredEntries = filteredEntries.filter(e => e.status === status)
  }

  if (topic) {
    filteredEntries = filteredEntries.filter(e => e.originalTopic === topic)
  }

  // Sort by arrival time (most recent first)
  filteredEntries.sort((a, b) => 
    new Date(b.arrivedInDlqAt).getTime() - new Date(a.arrivedInDlqAt).getTime()
  )

  // Calculate stats
  const byStatus: Record<string, number> = {}
  const byTopic: Record<string, number> = {}

  allEntries.forEach(entry => {
    byStatus[entry.status] = (byStatus[entry.status] || 0) + 1
    byTopic[entry.originalTopic] = (byTopic[entry.originalTopic] || 0) + 1
  })

  logger.info('📊 DLQ summary', {
    totalEntries: allEntries.length,
    filteredCount: filteredEntries.length,
    byStatus,
    byTopic,
  })

  return {
    status: 200,
    body: {
      entries: filteredEntries.map(e => ({
        id: e.id,
        originalTopic: e.originalTopic,
        traceId: e.traceId,
        failureReason: e.failureReason,
        attemptCount: e.attemptCount,
        status: e.status,
        arrivedInDlqAt: e.arrivedInDlqAt,
        canRetry: e.canRetry,
      })),
      stats: {
        totalCount: allEntries.length,
        byTopic,
        byStatus,
      },
    },
  }
}

