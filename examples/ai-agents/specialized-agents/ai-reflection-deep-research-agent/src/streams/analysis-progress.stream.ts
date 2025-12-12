/**
 * Analysis Progress Stream
 * 
 * Real-time streaming of contract analysis progress updates.
 * Clients can subscribe to receive live updates as the analysis
 * progresses through Generator → Critic → Refiner stages.
 */

import { StreamConfig } from 'motia'
import { z } from 'zod'

export const analysisProgressSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  status: z.enum([
    'pending',
    'extracting_text',
    'generator_running',
    'generator_completed',
    'critic_running',
    'critic_completed',
    'refiner_running',
    'completed',
    'failed',
  ]),
  step: z.string(),
  message: z.string(),
  timestamp: z.string(),
  progress: z.number().min(0).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type AnalysisProgress = z.infer<typeof analysisProgressSchema>

export const config: StreamConfig = {
  name: 'analysisProgress',
  schema: analysisProgressSchema,
  baseConfig: { storageType: 'default' },
  canAccess: (subscription, authContext) => {
    // Allow access to analysis progress for the contract owner
    // In production, implement proper access control here
    return true
  },
}


