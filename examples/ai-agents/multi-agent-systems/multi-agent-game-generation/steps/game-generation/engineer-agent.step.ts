/**
 * Senior Software Engineer Agent Step
 * Subscribes to: game_design.completed
 * Emits: game_code.completed
 * 
 * Implements the game code based on the architecture design
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
  design: z.any(), // Architecture design from architect agent
})

export const config: EventConfig = {
  type: 'event',
  name: 'EngineerAgent',
  description: 'Senior Software Engineer Agent - Writes complete Python game code',
  subscribes: ['game_design.completed'],
  emits: [
    { topic: 'game_code.completed', label: 'Code written, triggers QA review' },
  ],
  input: inputSchema,
  flows: ['game-generation'],
}

export const handler: Handlers['EngineerAgent'] = async (input, { emit, logger, state, traceId }) => {
  const { flowId, spec, design } = input
  
  logger.info('👨‍💻 Senior Software Engineer starting implementation', {
    flowId,
    gameTitle: spec.title,
    filesToCreate: design.fileStructure?.length || 0,
    traceId,
  })

  // Get current state
  let flowState = await state.get<GameGenerationState>('game-flows', flowId)
  if (!flowState) {
    logger.error('Flow state not found', { flowId, traceId })
    return
  }

  try {
    // Update status to coding
    flowState = updateStatus(flowState, 'coding', 'engineer-agent')
    flowState = addLog(flowState, 'engineer-agent', 'Senior Software Engineer implementing game code...')
    await state.set('game-flows', flowId, flowState)

    logger.info('Calling Gemini API for code generation', { flowId, traceId })

    // Call the engineer agent via Gemini
    const codeOutput = await geminiService.generateGameCode(spec, design)

    // Update state with code
    flowState = {
      ...flowState,
      code: codeOutput,
    }
    
    const totalLines = codeOutput.files.reduce((sum, f) => 
      sum + f.content.split('\n').length, 0
    )
    
    flowState = addLog(
      flowState, 
      'engineer-agent', 
      `Code implementation completed: ${codeOutput.files.length} files, ~${totalLines} lines of code`
    )
    await state.set('game-flows', flowId, flowState)

    logger.info('✅ Code implementation completed', {
      flowId,
      filesCreated: codeOutput.files.length,
      mainEntrypoint: codeOutput.mainEntrypoint,
      totalLines,
      traceId,
    })

    // Emit event to trigger QA agent
    await emit({
      topic: 'game_code.completed',
      data: {
        flowId,
        spec,
        design,
        code: codeOutput,
      },
    })

    logger.info('📤 Code handed off to QA Engineer for review', { flowId, traceId })

  } catch (error: any) {
    logger.error('❌ Engineer agent failed', {
      flowId,
      error: error.message,
      traceId,
    })

    // Update state with error
    flowState = setError(flowState, `Engineer agent failed: ${error.message}`)
    flowState = addLog(flowState, 'engineer-agent', `Error: ${error.message}`, 'error')
    await state.set('game-flows', flowId, flowState)
  }
}

