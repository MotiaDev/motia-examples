/**
 * QA Engineer Agent Step
 * Subscribes to: game_code.completed
 * Emits: game_qa.completed
 * 
 * Reviews code for syntax errors, logic bugs, and spec adherence
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
})

export const config: EventConfig = {
  type: 'event',
  name: 'QaAgent',
  description: 'QA Engineer Agent - Reviews code for bugs and spec adherence',
  subscribes: ['game_code.completed'],
  emits: [
    { topic: 'game_qa.completed', label: 'QA review done, triggers Chief QA' },
  ],
  input: inputSchema,
  flows: ['game-generation'],
}

export const handler: Handlers['QaAgent'] = async (input, { emit, logger, state, traceId }) => {
  const { flowId, spec, design, code } = input
  
  logger.info('🔍 QA Engineer starting code review', {
    flowId,
    gameTitle: spec.title,
    filesToReview: code.files?.length || 0,
    traceId,
  })

  // Get current state
  let flowState = await state.get<GameGenerationState>('game-flows', flowId)
  if (!flowState) {
    logger.error('Flow state not found', { flowId, traceId })
    return
  }

  try {
    // Update status to QA review
    flowState = updateStatus(flowState, 'qa_review', 'qa-agent')
    flowState = addLog(flowState, 'qa-agent', 'QA Engineer performing comprehensive code review...')
    await state.set('game-flows', flowId, flowState)

    logger.info('Calling Gemini API for QA review', { flowId, traceId })

    // Call the QA agent via Gemini
    const qaReport = await geminiService.reviewCode(spec, code)

    // Update state with QA report
    flowState = {
      ...flowState,
      qaReport,
    }
    
    const criticalIssues = qaReport.issues.filter(i => i.severity === 'critical').length
    const majorIssues = qaReport.issues.filter(i => i.severity === 'major').length
    
    flowState = addLog(
      flowState, 
      'qa-agent', 
      `QA review completed: Score ${qaReport.overallScore}/100, ${qaReport.issues.length} issues found (${criticalIssues} critical, ${majorIssues} major)`
    )
    await state.set('game-flows', flowId, flowState)

    logger.info('✅ QA review completed', {
      flowId,
      overallScore: qaReport.overallScore,
      syntaxValid: qaReport.syntaxValid,
      logicValid: qaReport.logicValid,
      specAdherence: qaReport.specAdherence,
      totalIssues: qaReport.issues.length,
      criticalIssues,
      majorIssues,
      requiresRevision: qaReport.requiresRevision,
      traceId,
    })

    // Emit event to trigger Chief QA
    await emit({
      topic: 'game_qa.completed',
      data: {
        flowId,
        spec,
        design,
        code,
        qaReport,
      },
    })

    logger.info('📤 QA report handed off to Chief QA Engineer', { flowId, traceId })

  } catch (error: any) {
    logger.error('❌ QA agent failed', {
      flowId,
      error: error.message,
      traceId,
    })

    // Update state with error
    flowState = setError(flowState, `QA agent failed: ${error.message}`)
    flowState = addLog(flowState, 'qa-agent', `Error: ${error.message}`, 'error')
    await state.set('game-flows', flowId, flowState)
  }
}

