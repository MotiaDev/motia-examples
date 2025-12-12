/**
 * Get Contract Analysis API Step
 * 
 * GET /contracts/:id/analysis
 * 
 * Returns the current status and results of a contract analysis.
 * If completed, returns the full refined analysis.
 * If in progress, returns current status and progress.
 */

import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { errorHandlerMiddleware, NotFoundError } from '../../middlewares/error-handler.middleware'
import {
  StoredContract,
  RefinedAnalysis,
  DraftAnalysis,
  Critique,
  AnalysisStatus,
} from '../types/contract'

const responseSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  contractName: z.string().optional(),
  progress: z.object({
    currentStep: z.string(),
    completedSteps: z.array(z.string()),
    percentComplete: z.number(),
  }),
  result: z.any().optional(),
  intermediateResults: z.object({
    draftAnalysis: z.any().optional(),
    critique: z.any().optional(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    step: z.string().optional(),
  }).optional(),
})

const errorSchema = z.object({
  error: z.string(),
  code: z.string(),
})

export const config: ApiRouteConfig = {
  name: 'GetContractAnalysis',
  type: 'api',
  path: '/contracts/:id/analysis',
  method: 'GET',
  description: 'Get the status and results of a contract analysis',
  emits: [],
  virtualSubscribes: ['analysis.completed'],
  flows: ['contract-analysis'],
  middleware: [errorHandlerMiddleware],
  queryParams: [
    { name: 'includeIntermediate', description: 'Include draft and critique results (true/false)' },
  ],
  responseSchema: {
    200: responseSchema,
    404: errorSchema,
  },
}

// Map status to progress info
const STATUS_PROGRESS: Record<AnalysisStatus, { step: string; percent: number; completedSteps: string[] }> = {
  pending: { step: 'Queue', percent: 5, completedSteps: [] },
  extracting_text: { step: 'Document Processing', percent: 10, completedSteps: [] },
  generator_running: { step: 'Generator', percent: 30, completedSteps: ['Document Processing'] },
  generator_completed: { step: 'Waiting for Critic', percent: 40, completedSteps: ['Document Processing', 'Generator'] },
  critic_running: { step: 'Critic', percent: 60, completedSteps: ['Document Processing', 'Generator'] },
  critic_completed: { step: 'Waiting for Refiner', percent: 70, completedSteps: ['Document Processing', 'Generator', 'Critic'] },
  refiner_running: { step: 'Refiner', percent: 85, completedSteps: ['Document Processing', 'Generator', 'Critic'] },
  completed: { step: 'Complete', percent: 100, completedSteps: ['Document Processing', 'Generator', 'Critic', 'Refiner'] },
  failed: { step: 'Failed', percent: 0, completedSteps: [] },
}

export const handler: Handlers['GetContractAnalysis'] = async (req, { logger, state }) => {
  const { id } = req.pathParams
  const includeIntermediate = req.queryParams.includeIntermediate === 'true'

  logger.info('Getting contract analysis', { contractId: id, includeIntermediate })

  // Retrieve contract from state
  const contract = await state.get<StoredContract>('contracts', id)
  
  if (!contract) {
    throw NotFoundError('Contract', id)
  }

  const progress = STATUS_PROGRESS[contract.status] || STATUS_PROGRESS.pending

  // Build response based on status
  const response: any = {
    id: contract.id,
    status: contract.status,
    createdAt: contract.createdAt,
    updatedAt: new Date().toISOString(),
    contractName: contract.fileName,
    progress: {
      currentStep: progress.step,
      completedSteps: progress.completedSteps,
      percentComplete: progress.percent,
    },
  }

  // Add context if available
  if (contract.context) {
    response.context = contract.context
  }

  // If completed, include the refined analysis
  if (contract.status === 'completed' && contract.refinedAnalysisId) {
    const refinedAnalysis = await state.get<RefinedAnalysis>('refined-analyses', contract.refinedAnalysisId)
    if (refinedAnalysis) {
      response.result = refinedAnalysis
    }
  }

  // If failed, include error info
  if (contract.status === 'failed' && contract.error) {
    response.error = {
      code: 'ANALYSIS_FAILED',
      message: contract.error,
    }
  }

  // Include intermediate results if requested
  if (includeIntermediate) {
    response.intermediateResults = {}

    if (contract.draftAnalysisId) {
      const draftAnalysis = await state.get<DraftAnalysis>('draft-analyses', contract.draftAnalysisId)
      if (draftAnalysis) {
        response.intermediateResults.draftAnalysis = draftAnalysis
      }
    }

    if (contract.critiqueId) {
      const critique = await state.get<Critique>('critiques', contract.critiqueId)
      if (critique) {
        response.intermediateResults.critique = critique
      }
    }
  }

  logger.info('Returning contract analysis', {
    contractId: id,
    status: contract.status,
    hasResult: !!response.result,
  })

  return {
    status: 200,
    body: response,
  }
}


