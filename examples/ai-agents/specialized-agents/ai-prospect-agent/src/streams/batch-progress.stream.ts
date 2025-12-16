/**
 * Batch Progress Stream
 * Real-time streaming of batch upload progress
 */
import { StreamConfig } from 'motia'

export const batchProgressSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' as const },
    batch_id: { type: 'string' as const },
    total_prospects: { type: 'number' as const },
    processed_count: { type: 'number' as const },
    completed_count: { type: 'number' as const },
    failed_count: { type: 'number' as const },
    status: { type: 'string' as const, enum: ['uploading', 'processing', 'completed', 'failed'] as string[] },
    progress_percent: { type: 'number' as const },
    average_score: { type: 'number' as const },
    high_score_count: { type: 'number' as const },
    updated_at: { type: 'string' as const },
  },
  required: ['id', 'batch_id', 'total_prospects', 'processed_count', 'status', 'progress_percent', 'updated_at'] as string[],
}

export interface BatchProgress {
  id: string
  batch_id: string
  total_prospects: number
  processed_count: number
  completed_count: number
  failed_count: number
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  progress_percent: number
  average_score?: number
  high_score_count: number
  updated_at: string
}

export const config: StreamConfig = {
  name: 'batchProgress',
  schema: batchProgressSchema,
  baseConfig: { storageType: 'default' },
  canAccess: () => true,
}

