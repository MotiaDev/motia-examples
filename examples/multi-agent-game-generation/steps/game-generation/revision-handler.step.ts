/**
 * Revision Handler Step
 * Subscribes to: game_revision.required
 * Emits: game_generation.requested, game_design.completed, game_code.completed
 * 
 * Routes revisions back to the appropriate agent based on Chief QA's instructions
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
  revisionTarget: z.enum(['architect', 'engineer', 'qa']),
  revisionInstructions: z.string(),
  revisionCount: z.number(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'RevisionHandler',
  description: 'Routes revision requests back to the appropriate agent',
  subscribes: ['game_revision.required'],
  emits: [
    { topic: 'game_generation.requested', label: 'Back to Architect', conditional: true },
    { topic: 'game_design.completed', label: 'Back to Engineer', conditional: true },
    { topic: 'game_code.completed', label: 'Back to QA', conditional: true },
  ],
  input: inputSchema,
  flows: ['game-generation'],
}

export const handler: Handlers['RevisionHandler'] = async (input, { emit, logger, state, traceId }) => {
  const { flowId, spec, design, code, qaReport, revisionTarget, revisionInstructions, revisionCount } = input
  
  logger.info('🔄 Revision handler processing', {
    flowId,
    revisionTarget,
    revisionCount,
    traceId,
  })

  // Get current state
  let flowState = await state.get<GameGenerationState>('game-flows', flowId)
  if (!flowState) {
    logger.error('Flow state not found', { flowId, traceId })
    return
  }

  // Update status to revision
  flowState = updateStatus(flowState, 'revision', 'revision-handler')
  flowState = addLog(
    flowState, 
    'revision-handler', 
    `Routing revision #${revisionCount} to ${revisionTarget} agent: ${revisionInstructions}`
  )
  await state.set('game-flows', flowId, flowState)

  // Augment the spec with revision instructions
  const augmentedSpec = {
    ...spec,
    additionalRequirements: `${spec.additionalRequirements || ''}\n\nREVISION INSTRUCTIONS (Revision #${revisionCount}): ${revisionInstructions}`.trim(),
  }

  switch (revisionTarget) {
    case 'architect':
      // Route back to architect for redesign
      logger.info('🏗️ Routing to Architect for redesign', { flowId, traceId })
      await emit({
        topic: 'game_generation.requested',
        data: {
          flowId,
          spec: augmentedSpec,
        },
      })
      break

    case 'engineer':
      // Route back to engineer with existing design
      logger.info('👨‍💻 Routing to Engineer for reimplementation', { flowId, traceId })
      await emit({
        topic: 'game_design.completed',
        data: {
          flowId,
          spec: augmentedSpec,
          design: {
            ...design,
            architectNotes: `${design.architectNotes}\n\nREVISION REQUIRED: ${revisionInstructions}`,
          },
        },
      })
      break

    case 'qa':
      // Route back to QA for re-review
      logger.info('🔍 Routing to QA for re-review', { flowId, traceId })
      await emit({
        topic: 'game_code.completed',
        data: {
          flowId,
          spec: augmentedSpec,
          design,
          code,
        },
      })
      break

    default:
      logger.warn('Unknown revision target, defaulting to engineer', {
        flowId,
        revisionTarget,
        traceId,
      })
      await emit({
        topic: 'game_design.completed',
        data: {
          flowId,
          spec: augmentedSpec,
          design,
        },
      })
  }

  logger.info('✅ Revision routed successfully', {
    flowId,
    revisionTarget,
    traceId,
  })
}

