/**
 * Analysis Completed Handler (Event Step)
 * 
 * Handles successful completion of contract analysis.
 * Can trigger webhooks, notifications, or integrations.
 */

import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { StoredContract, RefinedAnalysis } from '../types/contract'

const inputSchema = z.object({
  contractId: z.string(),
  refinedAnalysisId: z.string(),
  overallScore: z.number(),
  recommendedAction: z.string(),
  riskCount: z.number(),
})

export const config: EventConfig = {
  name: 'AnalysisCompletedHandler',
  type: 'event',
  description: 'Handle successful analysis completion',
  subscribes: ['analysis.completed'],
  emits: [],
  input: inputSchema,
  flows: ['contract-analysis'],
}

export const handler: Handlers['AnalysisCompletedHandler'] = async (input, { emit, logger, state }) => {
  const { contractId, refinedAnalysisId, overallScore, recommendedAction, riskCount } = input

  logger.info('Analysis completed successfully', {
    contractId,
    refinedAnalysisId,
    overallScore,
    recommendedAction,
    riskCount,
    timestamp: new Date().toISOString(),
  })

  // Retrieve contract for additional context
  const contract = await state.get<StoredContract>('contracts', contractId)
  const analysis = await state.get<RefinedAnalysis>('refined-analyses', refinedAnalysisId)

  if (!contract || !analysis) {
    logger.warn('Contract or analysis not found for completion handling', {
      contractId,
      refinedAnalysisId,
    })
    return
  }

  // Calculate metrics for observability
  const pipelineMetrics = {
    contractId,
    fileName: contract.fileName,
    customerName: contract.context?.customerName,
    contractType: contract.context?.contractType,
    overallScore,
    recommendedAction,
    totalRisks: riskCount,
    criticalRisks: analysis.risksBySeverity.critical,
    highRisks: analysis.risksBySeverity.high,
    mediumRisks: analysis.risksBySeverity.medium,
    lowRisks: analysis.risksBySeverity.low,
    pipelineTimeMs: analysis.totalPipelineTimeMs,
    pipelineTimeSeconds: Math.round(analysis.totalPipelineTimeMs / 1000),
    completedAt: new Date().toISOString(),
  }

  logger.info('Pipeline metrics', pipelineMetrics)

  // Log summary for dashboards
  logger.info('Analysis Summary', {
    ...pipelineMetrics,
    executiveSummary: analysis.executiveSummary.slice(0, 200) + '...',
    topNegotiationPoints: analysis.keyNegotiationPoints.slice(0, 3).map(p => p.point),
    actionItemsCount: analysis.actionItems.length,
  })
}

