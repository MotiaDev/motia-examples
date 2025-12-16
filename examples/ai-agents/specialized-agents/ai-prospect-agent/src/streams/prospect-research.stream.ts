/**
 * Prospect Research Stream
 * Real-time streaming of research progress and results
 */
import { StreamConfig } from 'motia'
import { z } from 'zod'

export const prospectResearchSchema = z.object({
  id: z.string(),
  prospect_id: z.string(),
  company_name: z.string(),
  status: z.enum(['queued', 'collecting_signals', 'analyzing', 'generating_email', 'completed', 'failed']),
  fit_score: z.number().optional(),
  buying_intent_score: z.number().optional(),
  progress_percent: z.number(),
  current_step: z.string(),
  error_message: z.string().optional(),
  updated_at: z.string(),
})

export type ProspectResearch = z.infer<typeof prospectResearchSchema>

export const config: StreamConfig = {
  name: 'prospectResearch',
  schema: prospectResearchSchema,
  baseConfig: { storageType: 'default' },
  canAccess: (subscription, authContext) => {
    // Allow all authenticated users to access
    // In production, you'd check user permissions here
    return true
  },
}

