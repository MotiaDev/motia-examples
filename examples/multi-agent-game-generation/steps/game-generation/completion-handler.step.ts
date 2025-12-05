/**
 * Game Completion Handler Step
 * Subscribes to: game_generation.completed
 * 
 * Finalizes the game generation flow, prepares deliverables
 */
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { GameGenerationState, addLog, updateStatus } from '../../src/utils/flow-helpers'

const inputSchema = z.object({
  flowId: z.string(),
  spec: z.any(),
  design: z.any(),
  code: z.any(),
  qaReport: z.any(),
  finalValidation: z.any(),
  note: z.string().optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'CompletionHandler',
  description: 'Finalizes game generation and prepares deliverables',
  subscribes: ['game_generation.completed'],
  emits: [],
  input: inputSchema,
  flows: ['game-generation'],
}

export const handler: Handlers['CompletionHandler'] = async (input, { logger, state, traceId }) => {
  const { flowId, spec, design, code, qaReport, finalValidation, note } = input
  
  logger.info('🎮 Completing game generation', {
    flowId,
    gameTitle: spec.title,
    traceId,
  })

  // Get current state
  let flowState = await state.get<GameGenerationState>('game-flows', flowId)
  if (!flowState) {
    logger.error('Flow state not found', { flowId, traceId })
    return
  }

  // Calculate generation statistics
  const totalFiles = code.files?.length || 0
  const totalLines = code.files?.reduce((sum: number, f: any) => 
    sum + (f.content?.split('\n').length || 0), 0
  ) || 0
  const totalClasses = design.classHierarchy?.length || 0
  const totalAlgorithms = design.coreAlgorithms?.length || 0
  const qaScore = qaReport.overallScore
  const qualityGrade = finalValidation.qualityGrade
  const revisionCount = flowState.metadata.revisionCount

  // Update final state
  flowState = updateStatus(flowState, 'completed', 'completion-handler')
  
  // Add comprehensive completion log
  const completionMessage = [
    `🎉 Game "${spec.title}" generation completed!`,
    `📊 Statistics:`,
    `   - Files generated: ${totalFiles}`,
    `   - Lines of code: ~${totalLines}`,
    `   - Classes designed: ${totalClasses}`,
    `   - Algorithms implemented: ${totalAlgorithms}`,
    `   - QA Score: ${qaScore}/100`,
    `   - Quality Grade: ${qualityGrade}`,
    `   - Revision cycles: ${revisionCount}`,
    note ? `   ⚠️ Note: ${note}` : '',
    `🚀 Ready for download at /games/${flowId}/download`,
  ].filter(Boolean).join('\n')

  flowState = addLog(flowState, 'completion-handler', completionMessage)
  
  // Store final summary
  flowState = {
    ...flowState,
    metadata: {
      ...flowState.metadata,
      completedAt: new Date().toISOString(),
    },
  }
  
  await state.set('game-flows', flowId, flowState)

  logger.info('✅ Game generation completed and ready for download', {
    flowId,
    gameTitle: spec.title,
    totalFiles,
    totalLines,
    qaScore,
    qualityGrade,
    revisionCount,
    completedAt: flowState.metadata.completedAt,
    traceId,
  })
}

