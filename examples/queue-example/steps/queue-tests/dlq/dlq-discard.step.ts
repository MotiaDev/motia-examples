import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * 🔥 DLQ DISCARD API - Acknowledge and discard DLQ entries
 * 
 * Production feature: Mark failed messages as resolved/discarded after review
 */

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'DiscardDeadLetterEntry',
  description: '🗑️ Discard/acknowledge a message from the Dead Letter Queue',
  flows: ['queue-tests'],
  method: 'DELETE',
  path: '/queue-tests/dlq/:id',
  bodySchema: z.object({
    reason: z.string().optional().describe('Reason for discarding'),
    keepRecord: z.boolean().optional().default(true).describe('Keep record for audit trail'),
  }),
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      discardedEntry: z.object({
        id: z.string(),
        originalTopic: z.string(),
        status: z.string(),
      }),
    }),
    404: z.object({ error: z.string() }),
  },
  emits: [],
}

export const handler: Handlers['DiscardDeadLetterEntry'] = async (req, { logger, state }) => {
  const { id } = req.pathParams
  const body = req.body || {}
  const { reason = 'Manually discarded', keepRecord = true } = body

  logger.info('🗑️ Discarding DLQ entry', { entryId: id, reason, keepRecord })

  // Find the DLQ entry
  const entry = await state.get<{
    id: string
    originalTopic: string
    originalData: any
    traceId: string
    status: string
  }>('queue-test-dlq', id)

  if (!entry) {
    logger.warn('❌ DLQ entry not found', { entryId: id })
    return {
      status: 404,
      body: { error: `DLQ entry not found: ${id}` },
    }
  }

  if (keepRecord) {
    // Update status to discarded but keep the record
    await state.set('queue-test-dlq', id, {
      ...entry,
      status: 'discarded',
      discardReason: reason,
      discardedAt: new Date().toISOString(),
    })
    
    logger.info('📝 DLQ entry marked as discarded (record kept)', { entryId: id })
  } else {
    // Completely remove the entry
    await state.delete('queue-test-dlq', id)
    logger.info('🗑️ DLQ entry permanently deleted', { entryId: id })
  }

  return {
    status: 200,
    body: {
      success: true,
      message: keepRecord 
        ? 'Entry marked as discarded (record kept for audit)'
        : 'Entry permanently deleted',
      discardedEntry: {
        id: entry.id,
        originalTopic: entry.originalTopic,
        status: 'discarded',
      },
    },
  }
}

