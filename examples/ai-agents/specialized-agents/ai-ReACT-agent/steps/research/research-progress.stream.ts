/**
 * Research Progress Stream
 * 
 * Real-time streaming for research progress updates.
 * Clients can subscribe to watch the agent's reasoning unfold live.
 */

import { StreamConfig } from 'motia'

// Using JSON Schema format to avoid Zod v4 compatibility issues
export const config: StreamConfig = {
  name: 'researchProgress',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      queryId: { type: 'string' },
      status: { 
        type: 'string',
        enum: [
          'pending',
          'reasoning',
          'executing_tool',
          'observation_received',
          'synthesizing',
          'completed',
          'failed',
        ],
      },
      iteration: { type: 'number' },
      tool: { type: 'string' },
      success: { type: 'boolean' },
      observationPreview: { type: 'string' },
      error: { type: 'string' },
      timestamp: { type: 'string' },
    },
    required: ['id', 'queryId', 'status', 'timestamp'],
  },
  baseConfig: { storageType: 'default' },
}

export interface ResearchProgress {
  id: string
  queryId: string
  status: 'pending' | 'reasoning' | 'executing_tool' | 'observation_received' | 'synthesizing' | 'completed' | 'failed'
  iteration?: number
  tool?: string
  success?: boolean
  observationPreview?: string
  error?: string
  timestamp: string
}
