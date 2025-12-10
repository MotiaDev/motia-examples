/**
 * Chief QA Engineer Agent Step
 * Subscribes to: game_qa.completed
 * Emits: game_generation.completed, game_revision.required
 * 
 * Final validation pass - approves or requests revisions
 */
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { geminiService } from '../../src/services/gemini'
import { GameGenerationState, addLog, updateStatus, setError } from '../../src/utils/flow-helpers'

const inputSchema = z.object({
  flowId: z.string(),
  spec: z.object({
    title: z.string(),
    genre: z.string(),
    mechanics: z.array(z.string()),
    theme: z.string(),
    targetAudience: z.string(),
    complexity: z.enum(['simple', 'medium', 'complex']),
    additionalRequirements: z.string().optional(),
  }),
  design: z.any(),
  code: z.any(),
  qaReport: z.any(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'ChiefQaAgent',
  description: 'Chief QA Engineer Agent - Final validation and approval authority',
  subscribes: ['game_qa.completed'],
  emits: [
    { topic: 'game_generation.completed', label: 'Approved - game ready for delivery' },
    { topic: 'game_revision.required', label: 'Needs revision', conditional: true },
  ],
  input: inputSchema,
  flows: ['game-generation'],
}

export const handler: Handlers['ChiefQaAgent'] = async (input, { emit, logger, state, traceId }) => {
  const { flowId, spec, design, code, qaReport } = input
  
  logger.info('👔 Chief QA Engineer starting final validation', {
    flowId,
    gameTitle: spec.title,
    qaScore: qaReport.overallScore,
    traceId,
  })

  // Get current state
  let flowState = await state.get<GameGenerationState>('game-flows', flowId)
  if (!flowState) {
    logger.error('Flow state not found', { flowId, traceId })
    return
  }

  try {
    // Update status to final review
    flowState = updateStatus(flowState, 'final_review', 'chief-qa-agent')
    flowState = addLog(flowState, 'chief-qa-agent', 'Chief QA Engineer performing final executive review...')
    await state.set('game-flows', flowId, flowState)

    logger.info('Calling Gemini API for final validation', { flowId, traceId })

    // Call the Chief QA agent via Gemini
    const finalValidation = await geminiService.finalValidation(spec, design, code, qaReport)

    // Update state with final validation
    flowState = {
      ...flowState,
      finalValidation,
    }
    
    flowState = addLog(
      flowState, 
      'chief-qa-agent', 
      `Final validation: ${finalValidation.approvalStatus.toUpperCase()} - Grade: ${finalValidation.qualityGrade}`
    )
    await state.set('game-flows', flowId, flowState)

    logger.info('✅ Final validation completed', {
      flowId,
      approved: finalValidation.approved,
      approvalStatus: finalValidation.approvalStatus,
      qualityGrade: finalValidation.qualityGrade,
      traceId,
    })

    if (finalValidation.approved) {
      // Game is approved - emit completion event
      await emit({
        topic: 'game_generation.completed',
        data: {
          flowId,
          spec,
          design,
          code,
          qaReport,
          finalValidation,
        },
      })

      logger.info('🎉 Game APPROVED and ready for delivery', { flowId, traceId })
    } else {
      // Game needs revision - check if we can retry
      const currentRevisions = flowState.metadata.revisionCount
      const maxRevisions = flowState.metadata.maxRevisions

      if (currentRevisions >= maxRevisions) {
        // Max revisions reached - complete with current state
        logger.warn('⚠️ Max revisions reached, delivering current version', {
          flowId,
          revisionCount: currentRevisions,
          maxRevisions,
          traceId,
        })

        flowState = addLog(
          flowState, 
          'chief-qa-agent', 
          `Max revisions (${maxRevisions}) reached. Delivering best available version.`,
          'warn'
        )
        await state.set('game-flows', flowId, flowState)

        await emit({
          topic: 'game_generation.completed',
          data: {
            flowId,
            spec,
            design,
            code,
            qaReport,
            finalValidation,
            note: 'Delivered after max revisions - some issues may remain',
          },
        })
      } else {
        // Request revision
        flowState = {
          ...flowState,
          metadata: {
            ...flowState.metadata,
            revisionCount: currentRevisions + 1,
          },
        }
        flowState = addLog(
          flowState, 
          'chief-qa-agent', 
          `Revision requested (${currentRevisions + 1}/${maxRevisions}): ${finalValidation.revisionInstructions}`,
          'warn'
        )
        await state.set('game-flows', flowId, flowState)

        await emit({
          topic: 'game_revision.required',
          data: {
            flowId,
            spec,
            design,
            code,
            qaReport,
            finalValidation,
            revisionTarget: finalValidation.revisionTarget,
            revisionInstructions: finalValidation.revisionInstructions,
            revisionCount: currentRevisions + 1,
          },
        })

        logger.info('🔄 Revision requested', {
          flowId,
          revisionTarget: finalValidation.revisionTarget,
          revisionCount: currentRevisions + 1,
          maxRevisions,
          traceId,
        })
      }
    }

  } catch (error: any) {
    logger.error('❌ Chief QA agent failed', {
      flowId,
      error: error.message,
      traceId,
    })

    // Update state with error
    flowState = setError(flowState, `Chief QA agent failed: ${error.message}`)
    flowState = addLog(flowState, 'chief-qa-agent', `Error: ${error.message}`, 'error')
    await state.set('game-flows', flowId, flowState)
  }
}

