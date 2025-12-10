/**
 * Tool Execution Step - Executes tools requested by the ReAct agent
 * 
 * This event step handles tool execution:
 * - Receives tool execution requests from the ReAct loop
 * - Executes the appropriate tool (web search, financial data, etc.)
 * - Returns observations back to the ReAct loop
 */

import { EventConfig, Handlers } from 'motia'
import type { 
  ResearchContext, 
  ToolName, 
  ReActIteration 
} from '../../src/services/types'
import { STATE_GROUPS } from '../../src/services/types'
import { executeTool, formatToolResultForContext } from '../../src/services/tool-service'

const inputSchema = {
  type: 'object',
  properties: {
    queryId: { type: 'string' },
    question: { type: 'string' },
    context: { type: 'object' },
    tool: { type: 'string' },
    input: { type: 'object' },
    iterationNumber: { type: 'number' },
  },
  required: ['queryId', 'question', 'tool', 'input', 'iterationNumber'],
}

export const config: EventConfig = {
  type: 'event',
  name: 'ExecuteTool',
  description: 'Executes tools requested by the ReAct agent',
  subscribes: ['research.tool.execute'],
  emits: [
    'research.observation.ready',
    { topic: 'research.query.failed', conditional: true },
  ],
  input: inputSchema,
  flows: ['research-assistant'],
}

export const handler: Handlers['ExecuteTool'] = async (input, { emit, logger, state, streams }) => {
  const { queryId, question, context, tool, input: toolInput, iterationNumber } = input as {
    queryId: string
    question: string
    context?: ResearchContext
    tool: string
    input: Record<string, unknown>
    iterationNumber: number
  }
  
  logger.info('Tool execution started', { 
    queryId, 
    tool, 
    iteration: iterationNumber,
  })
  
  try {
    // Stream progress update
    try {
      await streams.researchProgress?.set(queryId, `tool-${iterationNumber}`, {
        id: `tool-${iterationNumber}`,
        queryId,
        status: 'executing_tool',
        tool,
        iteration: iterationNumber,
        timestamp: new Date().toISOString(),
      })
    } catch (streamError) {
      logger.warn('Stream update failed', { streamError })
    }
    
    // Execute the tool
    const startTime = Date.now()
    const result = await executeTool(tool as ToolName, toolInput)
    const executionTime = Date.now() - startTime
    
    logger.info('Tool execution completed', {
      queryId,
      tool,
      success: result.success,
      executionTimeMs: executionTime,
    })
    
    // Store tool result in state for audit trail
    await state.set(
      STATE_GROUPS.TOOL_CALLS, 
      `${queryId}:${iterationNumber}:${tool}`, 
      {
        ...result,
        iterationNumber,
        timestamp: new Date().toISOString(),
      }
    )
    
    // Format the result as observation
    const observation = formatToolResultForContext(result)
    
    // Update the iteration with the observation
    const iterations = await state.get<ReActIteration[]>(STATE_GROUPS.ITERATIONS, queryId) || []
    const currentIteration = iterations.find(i => i.iterationNumber === iterationNumber)
    if (currentIteration) {
      currentIteration.observation = observation
      await state.set(STATE_GROUPS.ITERATIONS, queryId, iterations)
    }
    
    // Stream observation update
    try {
      await streams.researchProgress?.set(queryId, `observation-${iterationNumber}`, {
        id: `observation-${iterationNumber}`,
        queryId,
        status: 'observation_received',
        tool,
        success: result.success,
        iteration: iterationNumber,
        observationPreview: observation.slice(0, 200),
        timestamp: new Date().toISOString(),
      })
    } catch (streamError) {
      logger.warn('Stream update failed', { streamError })
    }
    
    // Emit observation to continue the ReAct loop
    await emit({
      topic: 'research.observation.ready',
      data: {
        queryId,
        question,
        context,
        observation,
        tool,
        success: result.success,
      },
    })
    
    logger.info('Observation emitted', { queryId, iteration: iterationNumber })
    
  } catch (error) {
    logger.error('Tool execution failed', { 
      queryId, 
      tool, 
      error: error instanceof Error ? error.message : String(error),
    })
    
    // Emit observation with error info to let the agent recover
    await emit({
      topic: 'research.observation.ready',
      data: {
        queryId,
        question,
        context,
        observation: `Tool "${tool}" failed with error: ${error instanceof Error ? error.message : String(error)}. Please try a different approach or tool.`,
        tool,
        success: false,
      },
    })
  }
}
