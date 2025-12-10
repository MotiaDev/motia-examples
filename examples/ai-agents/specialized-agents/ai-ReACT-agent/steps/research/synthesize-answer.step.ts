/**
 * Synthesize Answer Step - Compiles final research result
 * 
 * This event step synthesizes the final answer:
 * - Compiles all observations and reasoning into a final result
 * - Creates citations from tool results
 * - Stores the complete research result in state
 */

import { EventConfig, Handlers } from 'motia'
import type { 
  ResearchQuery, 
  ResearchResult, 
  ReActIteration,
  Citation,
  ToolResult 
} from '../../src/services/types'
import { STATE_GROUPS } from '../../src/services/types'
import { extractCitationsFromResults } from '../../src/services/tool-service'
import { callLLM, getLLMConfig, parseReActOutput } from '../../src/services/llm-service'

const inputSchema = {
  type: 'object',
  properties: {
    queryId: { type: 'string' },
    forced: { type: 'boolean' },
  },
  required: ['queryId'],
}

export const config: EventConfig = {
  type: 'event',
  name: 'SynthesizeAnswer',
  description: 'Synthesizes the final research answer from all gathered information',
  subscribes: ['research.synthesis.ready'],
  emits: [
    'research.completed',
    { topic: 'research.query.failed', conditional: true },
  ],
  input: inputSchema,
  flows: ['research-assistant'],
}

export const handler: Handlers['SynthesizeAnswer'] = async (input, { emit, logger, state, streams }) => {
  const { queryId, forced } = input as { queryId: string; forced?: boolean }
  
  logger.info('Synthesis started', { queryId, forced })
  
  try {
    // Get the original query
    const query = await state.get<ResearchQuery>(STATE_GROUPS.QUERIES, queryId)
    if (!query) {
      throw new Error(`Query not found: ${queryId}`)
    }
    
    // Get all iterations
    const iterations = await state.get<ReActIteration[]>(STATE_GROUPS.ITERATIONS, queryId) || []
    
    // Get the final answer if stored
    const storedFinalAnswer = await state.get<{
      answer: string
      confidence: number
      citations: Citation[]
    }>(STATE_GROUPS.TOOL_CALLS, `${queryId}:final_answer`)
    
    let finalAnswer: string
    let citations: Citation[] = []
    let confidence = 0.8
    
    if (storedFinalAnswer && storedFinalAnswer.answer) {
      // Use the LLM-generated final answer
      finalAnswer = storedFinalAnswer.answer
      citations = storedFinalAnswer.citations || []
      confidence = storedFinalAnswer.confidence || 0.8
    } else if (forced) {
      // Generate a synthesis from available information
      logger.info('Generating forced synthesis', { queryId })
      
      finalAnswer = await generateForcedSynthesis(query.question, iterations)
      confidence = 0.6 // Lower confidence for forced synthesis
    } else {
      throw new Error('No final answer available')
    }
    
    // Collect all tool results for citations
    const toolCalls = await state.getGroup<ToolResult & { iterationNumber: number }>(STATE_GROUPS.TOOL_CALLS)
    const queryToolCalls = toolCalls.filter(tc => 
      String(tc).includes(queryId) || (tc as Record<string, unknown>).queryId === queryId
    )
    
    // Extract additional citations from tool results
    const toolCitations = extractCitationsFromResults(queryToolCalls)
    const allCitations = [...citations, ...toolCitations].slice(0, 20) // Limit citations
    
    // Calculate metadata
    const totalTokens = iterations.length * 2000 // Estimate
    const executionTimeMs = Date.now() - new Date(query.createdAt).getTime()
    
    // Create the final result
    const result: ResearchResult = {
      queryId,
      question: query.question,
      answer: finalAnswer,
      citations: deduplicateCitations(allCitations),
      reasoningTrace: iterations,
      metadata: {
        totalIterations: iterations.length,
        totalToolCalls: queryToolCalls.length,
        totalTokens,
        executionTimeMs,
        model: getLLMConfig().model,
      },
      completedAt: new Date().toISOString(),
    }
    
    // Store the result
    await state.set(STATE_GROUPS.RESULTS, queryId, result)
    
    // Update query status
    query.status = 'completed'
    query.updatedAt = new Date().toISOString()
    await state.set(STATE_GROUPS.QUERIES, queryId, query)
    
    // Stream completion update
    try {
      await streams.researchProgress?.set(queryId, 'completed', {
        id: 'completed',
        queryId,
        status: 'completed',
        iterations: iterations.length,
        executionTimeMs,
        timestamp: new Date().toISOString(),
      })
    } catch (streamError) {
      logger.warn('Stream update failed', { streamError })
    }
    
    logger.info('Research completed', {
      queryId,
      iterations: iterations.length,
      answerLength: finalAnswer.length,
      citations: allCitations.length,
      executionTimeMs,
    })
    
    await emit({
      topic: 'research.completed',
      data: {
        queryId,
        success: true,
      },
    })
    
  } catch (error) {
    logger.error('Synthesis failed', { 
      queryId, 
      error: error instanceof Error ? error.message : String(error),
    })
    
    // Update query status to failed
    const query = await state.get<ResearchQuery>(STATE_GROUPS.QUERIES, queryId)
    if (query) {
      query.status = 'failed'
      query.updatedAt = new Date().toISOString()
      await state.set(STATE_GROUPS.QUERIES, queryId, query)
    }
    
    await emit({
      topic: 'research.query.failed',
      data: {
        queryId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

async function generateForcedSynthesis(
  question: string, 
  iterations: ReActIteration[]
): Promise<string> {
  // Compile all observations
  const observations = iterations
    .filter(i => i.observation)
    .map(i => `[Iteration ${i.iterationNumber}] ${i.action?.tool || 'reasoning'}: ${i.observation}`)
    .join('\n\n')
  
  const llmConfig = getLLMConfig()
  
  const synthesisPrompt = `Based on the following research observations, provide a comprehensive answer to the question.

Question: ${question}

Research Observations:
${observations || 'No observations collected.'}

Please synthesize a comprehensive answer based on the available information. Acknowledge any limitations or gaps in the research. Respond with JSON:
{
  "type": "final_answer",
  "thought": "Your synthesis reasoning",
  "finalAnswer": {
    "answer": "Your comprehensive answer",
    "confidence": 0.6,
    "citations": []
  }
}`

  const response = await callLLM(
    [{ role: 'user', content: synthesisPrompt }],
    llmConfig
  )
  
  try {
    const parsed = parseReActOutput(response.content)
    return parsed.finalAnswer?.answer || 'Unable to synthesize a complete answer from the available information.'
  } catch {
    // If parsing fails, extract any text content
    return response.content.slice(0, 2000)
  }
}

function deduplicateCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>()
  return citations.filter(c => {
    const key = c.url || c.source
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
