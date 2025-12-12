/**
 * Analysis Failed Handler (Event Step)
 * 
 * Handles analysis failure events for cleanup and notification.
 * Logs failures, updates state, and can trigger notifications.
 */

import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { StoredContract } from '../types/contract'

const inputSchema = z.object({
  contractId: z.string(),
  step: z.string(),
  error: z.string(),
})

export const config: EventConfig = {
  name: 'AnalysisFailedHandler',
  type: 'event',
  description: 'Handle analysis failures and cleanup',
  subscribes: ['analysis.failed'],
  emits: [],
  input: inputSchema,
  flows: ['contract-analysis'],
}

export const handler: Handlers['AnalysisFailedHandler'] = async (input, { emit, logger, state }) => {
  const { contractId, step, error } = input

  logger.error('Analysis failed', {
    contractId,
    step,
    error,
    timestamp: new Date().toISOString(),
  })

  // Update contract state to ensure it's marked as failed
  const contract = await state.get<StoredContract>('contracts', contractId)
  
  if (contract && contract.status !== 'failed') {
    await state.set('contracts', contractId, {
      ...contract,
      status: 'failed',
      error: `Failed at ${step}: ${error}`,
    })
  }

  // Log for observability
  logger.info('Failure recorded', {
    contractId,
    failedStep: step,
    previousStatus: contract?.status,
  })
}

