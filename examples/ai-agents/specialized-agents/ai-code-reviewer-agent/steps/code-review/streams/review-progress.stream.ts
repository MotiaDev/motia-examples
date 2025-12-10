import { StreamConfig } from 'motia'
import { z } from 'zod'

/**
 * Real-time streaming for code review progress updates.
 * Clients can subscribe to receive live updates as reviews progress through
 * the multi-agent reflection pipeline.
 */
export const reviewProgressSchema = z.object({
  id: z.string(),
  reviewId: z.string(),
  stage: z.enum([
    'submitted',
    'generating_draft',
    'draft_generated',
    'critiquing',
    'critique_completed',
    'refining',
    'review_completed',
    'posting_to_github',
    'completed',
    'failed'
  ]),
  message: z.string(),
  timestamp: z.string(),
  metadata: z.object({
    repository: z.string().optional(),
    pullRequest: z.number().optional(),
    branch: z.string().optional(),
    progress: z.number().optional(),
    currentAgent: z.string().optional(),
    findings: z.number().optional(),
    score: z.number().optional()
  }).optional()
})

export type ReviewProgress = z.infer<typeof reviewProgressSchema>

export const config: StreamConfig = {
  name: 'reviewProgress',
  schema: reviewProgressSchema,
  baseConfig: { storageType: 'default' }
}

