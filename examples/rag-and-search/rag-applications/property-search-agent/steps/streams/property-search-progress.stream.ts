import { StreamConfig } from 'motia'
import { z } from 'zod'

/**
 * Schema for property search progress updates
 * This stream tracks the real-time progress of property search and analysis
 */
export const propertySearchProgressSchema = z.object({
  searchId: z.string().describe('Unique identifier for the search session'),
  stage: z.enum([
    'initializing',
    'searching_properties',
    'properties_found',
    'analyzing_market',
    'market_analysis_complete',
    'evaluating_properties',
    'valuation_complete',
    'completed',
    'error'
  ]).describe('Current stage of the analysis'),
  progress: z.number().min(0).max(1).describe('Progress percentage (0-1)'),
  message: z.string().describe('Human-readable status message'),
  timestamp: z.string().describe('ISO timestamp of the update'),
  metadata: z.record(z.any()).optional().describe('Additional metadata')
})

export type PropertySearchProgress = z.infer<typeof propertySearchProgressSchema>

export const config: StreamConfig = {
  name: 'propertySearchProgress',
  schema: propertySearchProgressSchema,
  baseConfig: { storageType: 'default' }
}

