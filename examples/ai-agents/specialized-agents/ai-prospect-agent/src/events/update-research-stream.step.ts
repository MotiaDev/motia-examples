/**
 * Update Research Stream Event Step
 * Updates real-time stream with research progress
 */
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

// Define schema inline per Motia pattern
const inputSchema = z.object({
  batch_id: z.string(),
  prospect_index: z.number(),
  prospect_id: z.string(),
  company_name: z.string(),
  contact_name: z.string(),
  fit_score: z.number(),
  buying_intent_score: z.number(),
  key_insight: z.string(),
  industry: z.string(),
})

export const config: EventConfig = {
  name: 'UpdateResearchStream',
  type: 'event',
  description: 'Updates real-time stream when research completes',
  subscribes: ['prospect.research.completed'],
  emits: [],
  input: inputSchema,
  flows: ['prospect-research', 'streaming'],
}

export const handler: Handlers['UpdateResearchStream'] = async (input, { logger, streams }) => {
  const { batch_id, prospect_id, company_name, fit_score, buying_intent_score } = input

  logger.info('Updating research stream', {
    prospectId: prospect_id,
    company: company_name,
  })

  try {
    // Update prospect research stream
    await streams.prospectResearch.set(batch_id, prospect_id, {
      id: prospect_id,
      prospect_id,
      company_name,
      status: 'completed',
      fit_score,
      buying_intent_score,
      progress_percent: 100,
      current_step: 'Complete',
      updated_at: new Date().toISOString(),
    })

    // Send ephemeral event for real-time notification
    await streams.prospectResearch.send(
      { groupId: batch_id },
      {
        type: 'prospect_completed',
        data: {
          prospect_id,
          company_name,
          fit_score,
        },
      }
    )

    logger.info('Research stream updated', {
      prospectId: prospect_id,
      batchId: batch_id,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.warn('Failed to update research stream', {
      prospectId: prospect_id,
      error: errorMessage,
    })
  }
}
