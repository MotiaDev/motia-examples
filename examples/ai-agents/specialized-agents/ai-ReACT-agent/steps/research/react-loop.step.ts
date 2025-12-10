/**
 * ReAct Loop Controller - Orchestrates the Reason + Act pattern
 * 
 * This event step implements the main ReAct loop:
 * 1. Receives a research query
 * 2. Calls the LLM for reasoning
 * 3. Routes to appropriate tool execution or final answer
 * 4. Manages iteration limits and loop detection
 */

import { EventConfig, Handlers } from 'motia'
import type { 
  ResearchQuery, 
  ResearchContext, 
  ReActIteration, 
  LLMMessage,
  ReActLLMOutput 
} from '../../src/services/types'
import { STATE_GROUPS } from '../../src/services/types'
import { callLLM, parseReActOutput, getLLMConfig } from '../../src/services/llm-service'

const inputSchema = {
  type: 'object',
  properties: {
    queryId: { type: 'string' },
    question: { type: 'string' },
    context: {
      type: 'object',
      properties: {
        industry: { type: 'string' },
        timeframe: { type: 'string' },
        preferredSources: { type: 'array', items: { type: 'string' } },
        maxIterations: { type: 'number' },
        budget: {
          type: 'object',
          properties: {
            maxTokens: { type: 'number' },
            maxToolCalls: { type: 'number' },
          },
        },
      },
    },
  },
  required: ['queryId', 'question'],
}

export const config: EventConfig = {
  type: 'event',
  name: 'ReactLoopController',
  description: 'Main ReAct loop controller - orchestrates reasoning and action cycles',
  subscribes: ['research.query.requested', 'research.observation.ready'],
  emits: [
    'research.tool.execute',
    'research.synthesis.ready',
    { topic: 'research.query.failed', conditional: true },
    { topic: 'research.max.iterations', conditional: true },
  ],
  input: inputSchema,
  flows: ['research-assistant'],
}

const MAX_ITERATIONS = 10

export const handler: Handlers['ReactLoopController'] = async (input, { emit, logger, state, streams }) => {
  const { queryId, question, context } = input as {
    queryId: string
    question: string
    context?: ResearchContext
  }
  
  logger.info('ReAct loop started', { queryId, question: question.slice(0, 100) })
  
  try {
    // Get current query state
    const query = await state.get<ResearchQuery>(STATE_GROUPS.QUERIES, queryId)
    if (!query) {
      throw new Error(`Query not found: ${queryId}`)
    }
    
    // Get current iterations
    const iterations = await state.get<ReActIteration[]>(STATE_GROUPS.ITERATIONS, queryId) || []
    const iterationNumber = iterations.length + 1
    
    // Check iteration limits
    const maxIterations = context?.maxIterations || MAX_ITERATIONS
    if (iterationNumber > maxIterations) {
      logger.warn('Max iterations reached', { queryId, iterations: iterationNumber })
      
      await updateQueryStatus(state, queryId, 'max_iterations_reached')
      
      await emit({
        topic: 'research.max.iterations',
        data: { queryId, iterations: iterationNumber },
      })
      
      // Force synthesis with current information
      await emit({
        topic: 'research.synthesis.ready',
        data: { queryId, forced: true },
      })
      return
    }
    
    // Update status to reasoning
    await updateQueryStatus(state, queryId, 'reasoning')
    
    // Stream progress update
    try {
      await streams.researchProgress?.set(queryId, `iteration-${iterationNumber}`, {
        id: `iteration-${iterationNumber}`,
        queryId,
        status: 'reasoning',
        iteration: iterationNumber,
        timestamp: new Date().toISOString(),
      })
    } catch (streamError) {
      logger.warn('Stream update failed', { streamError })
    }
    
    // Build conversation history
    const messages = buildConversationHistory(question, iterations)
    
    // Call LLM for reasoning
    const llmConfig = getLLMConfig()
    logger.info('Calling LLM for reasoning', { 
      queryId, 
      iteration: iterationNumber,
      model: llmConfig.model,
    })
    
    const llmResponse = await callLLM(messages, llmConfig, context)
    
    logger.info('LLM response received', { 
      queryId,
      tokens: llmResponse.tokenUsage.total,
    })
    
    // Parse the ReAct output
    let reactOutput: ReActLLMOutput
    try {
      reactOutput = parseReActOutput(llmResponse.content)
    } catch (parseError) {
      logger.error('Failed to parse LLM output', { 
        queryId, 
        error: parseError,
        content: llmResponse.content.slice(0, 500),
      })
      
      // Retry with explicit instruction
      const retryMessages: LLMMessage[] = [
        ...messages,
        { role: 'assistant', content: llmResponse.content },
        { 
          role: 'user', 
          content: 'Your previous response was not in valid JSON format. Please respond with valid JSON following the specified format.',
        },
      ]
      
      const retryResponse = await callLLM(retryMessages, llmConfig, context)
      reactOutput = parseReActOutput(retryResponse.content)
    }
    
    // Create iteration record
    const iteration: ReActIteration = {
      iterationNumber,
      thought: reactOutput.thought,
      action: reactOutput.action ? {
        tool: reactOutput.action.tool,
        input: reactOutput.action.input,
        reasoning: reactOutput.thought,
      } : undefined,
      timestamp: new Date().toISOString(),
    }
    
    // Store iteration
    iterations.push(iteration)
    await state.set(STATE_GROUPS.ITERATIONS, queryId, iterations)
    
    logger.info('Iteration recorded', { 
      queryId, 
      iteration: iterationNumber,
      type: reactOutput.type,
      tool: reactOutput.action?.tool,
    })
    
    // Route based on output type
    if (reactOutput.type === 'final_answer') {
      logger.info('Final answer ready', { queryId })
      
      await updateQueryStatus(state, queryId, 'synthesizing')
      
      // Store the final answer for synthesis
      await state.set(STATE_GROUPS.TOOL_CALLS, `${queryId}:final_answer`, {
        answer: reactOutput.finalAnswer?.answer,
        confidence: reactOutput.finalAnswer?.confidence,
        citations: reactOutput.finalAnswer?.citations,
      })
      
      await emit({
        topic: 'research.synthesis.ready',
        data: { queryId, forced: false },
      })
    } else if (reactOutput.action) {
      logger.info('Tool execution requested', { 
        queryId, 
        tool: reactOutput.action.tool,
      })
      
      await updateQueryStatus(state, queryId, 'acting')
      
      await emit({
        topic: 'research.tool.execute',
        data: {
          queryId,
          question,
          context,
          tool: reactOutput.action.tool,
          input: reactOutput.action.input,
          iterationNumber,
        },
      })
    } else {
      // No action specified, treat as needing more reasoning
      logger.warn('No action in output, continuing loop', { queryId })
      
      await emit({
        topic: 'research.observation.ready',
        data: {
          queryId,
          question,
          context,
          observation: 'No specific action was taken. Please decide on a tool to use or provide a final answer.',
        },
      })
    }
  } catch (error) {
    logger.error('ReAct loop failed', { queryId, error })
    
    await updateQueryStatus(state, queryId, 'failed')
    
    await emit({
      topic: 'research.query.failed',
      data: {
        queryId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

function buildConversationHistory(question: string, iterations: ReActIteration[]): LLMMessage[] {
  const messages: LLMMessage[] = [
    {
      role: 'user',
      content: `Research Question: ${question}\n\nPlease analyze this question and begin your research process.`,
    },
  ]
  
  for (const iteration of iterations) {
    // Add the assistant's thought/action
    if (iteration.action) {
      messages.push({
        role: 'assistant',
        content: JSON.stringify({
          type: 'thought_action',
          thought: iteration.thought,
          action: {
            tool: iteration.action.tool,
            input: iteration.action.input,
          },
        }),
      })
    }
    
    // Add the observation if available
    if (iteration.observation) {
      messages.push({
        role: 'user',
        content: `Observation from ${iteration.action?.tool || 'previous step'}:\n\n${iteration.observation}\n\nBased on this observation, continue your research or provide your final answer if you have sufficient information.`,
      })
    }
  }
  
  return messages
}

async function updateQueryStatus(
  state: { set: <T>(group: string, key: string, value: T) => Promise<T>; get: <T>(group: string, key: string) => Promise<T | null> },
  queryId: string,
  status: string
): Promise<void> {
  const query = await state.get<ResearchQuery>(STATE_GROUPS.QUERIES, queryId)
  if (query) {
    query.status = status as ResearchQuery['status']
    query.updatedAt = new Date().toISOString()
    await state.set(STATE_GROUPS.QUERIES, queryId, query)
  }
}
