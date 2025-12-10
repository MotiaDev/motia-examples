/**
 * Senior Game Architect Agent Step
 * Subscribes to: game_generation.requested
 * Emits: game_design.completed
 * 
 * Reviews the game spec and designs the complete game architecture
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
})

export const config: EventConfig = {
  type: 'event',
  name: 'ArchitectAgent',
  description: 'Senior Game Architect Agent - Designs game structure and architecture',
  subscribes: ['game_generation.requested'],
  emits: [
    { topic: 'game_design.completed', label: 'Design approved, triggers engineer' },
  ],
  input: inputSchema,
  flows: ['game-generation'],
}

export const handler: Handlers['ArchitectAgent'] = async (input, { emit, logger, state, traceId }) => {
  const { flowId, spec } = input
  
  logger.info('🏗️ Senior Game Architect starting design phase', {
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

  try {
    // Update status to designing
    flowState = updateStatus(flowState, 'designing', 'architect-agent')
    flowState = addLog(flowState, 'architect-agent', 'Senior Game Architect analyzing game specification...')
    await state.set('game-flows', flowId, flowState)

    logger.info('Calling Gemini API for architecture design', { flowId, traceId })

    // Call the architect agent via Gemini
    const design = await geminiService.generateArchitectureDesign(spec)

    // Update state with design
    flowState = {
      ...flowState,
      design,
    }
    flowState = addLog(
      flowState, 
      'architect-agent', 
      `Architecture design completed: ${design.fileStructure.length} files, ${design.classHierarchy.length} classes designed`
    )
    await state.set('game-flows', flowId, flowState)

    logger.info('✅ Architecture design completed', {
      flowId,
      filesPlanned: design.fileStructure.length,
      classesDesigned: design.classHierarchy.length,
      algorithms: design.coreAlgorithms.length,
      traceId,
    })

    // Emit event to trigger engineer agent
    await emit({
      topic: 'game_design.completed',
      data: {
        flowId,
        spec,
        design,
      },
    })

    logger.info('📤 Design handed off to Senior Software Engineer', { flowId, traceId })

  } catch (error: any) {
    logger.error('❌ Architect agent failed', {
      flowId,
      error: error.message,
      traceId,
    })

    // Update state with error
    flowState = setError(flowState, `Architect agent failed: ${error.message}`)
    flowState = addLog(flowState, 'architect-agent', `Error: ${error.message}`, 'error')
    await state.set('game-flows', flowId, flowState)
  }
}

