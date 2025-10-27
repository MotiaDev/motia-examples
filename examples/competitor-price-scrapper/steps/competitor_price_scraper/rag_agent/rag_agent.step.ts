import { z } from 'zod'
import { EventConfig, Handlers } from 'motia'

// Input schema
const inputSchema = z.object({
  type: z.literal('VECTOR_STORE_READY'),
  payload: z.object({
    documentsStored: z.number(),
    indexName: z.string()
  })
})

export const config: EventConfig = {
  type: 'event',
  name: 'RagAgent',
  description: 'AI agent that analyzes competitor prices using RAG',
  subscribes: ['rag-agent'],
  emits: ['sheets-logger', 'slack-alert'],
  input: inputSchema,
  flows: ['competitor-price-scraper']
}

export const handler: Handlers['RagAgent'] = async (input, { emit, logger, state }) => {
  try {
    // Import helpers
    const { generateEmbeddings } = await import('../../../lib/openai')
    const { queryVectors } = await import('../../../lib/supabase')
    const { analyzeWithClaude } = await import('../../../lib/anthropic')
    const { getMemory, updateMemory } = await import('../../../lib/memory')

    // Get the original data from state
    const textChunks = (await state.get('competitor-scraper', 'textChunks') as any[]) || []
    const latestDocuments = (await state.get('competitor-scraper', 'latestVectorDocuments') as any[]) || []

    // Build context from recent data
    let immediateContext = ''
    if (latestDocuments.length > 0) {
      immediateContext = latestDocuments
        .slice(0, 5) // Take first 5 chunks
        .map((doc: any) => doc.content)
        .join('\n\n')
    }

    // Generate query for historical context
    const query = "competitor pricing analysis recent trends"
    const queryEmbedding = await generateEmbeddings([query])

    // Query vector store for relevant historical context
    const relevantDocs = await queryVectors(
      input.payload.indexName,
      queryEmbedding[0],
      10 // Top 10 relevant documents
    )

    // Get conversation memory
    const memory = getMemory()
    const memoryContext = memory.getRecentConversations(5)

    // Build full context
    const fullContext = {
      immediate: immediateContext,
      historical: relevantDocs.map((doc: any) => doc.content).join('\n\n'),
      memory: memoryContext
    }

    logger.info('Analyzing with RAG agent', {
      immediateDocsCount: latestDocuments.length,
      historicalDocsCount: relevantDocs.length,
      hasMemory: memoryContext.length > 0
    })

    // Analyze with Claude
    const systemPrompt = `You are an assistant for Competitor Price Scraper. 
Analyze competitor pricing data and provide insights, comparisons, and recommendations.
Focus on price changes, trends, and competitive positioning.`

    const userPrompt = `Please analyze the following competitor pricing data:

RECENT DATA:
${fullContext.immediate}

HISTORICAL CONTEXT:
${fullContext.historical}

${memoryContext.length > 0 ? `PREVIOUS CONVERSATIONS:
${memoryContext}` : ''}

Provide:
1. A summary of the current pricing situation
2. Price comparisons if multiple products are mentioned
3. Key insights and trends
4. Recommendations for competitive response`

    const analysis = await analyzeWithClaude(systemPrompt, userPrompt)

    // Update memory with this analysis
    updateMemory({
      role: 'assistant',
      content: analysis.summary,
      timestamp: new Date().toISOString()
    })

    const result = {
      ...analysis,
      timestamp: new Date().toISOString()
    }

    logger.info('RAG analysis completed')

    // Emit event for Google Sheets logging
    await emit({
      topic: 'sheets-logger',
      data: {
        type: 'ANALYSIS_COMPLETE',
        payload: result
      }
    })
  } catch (error) {
    logger.error('RAG agent failed', { error })
    
    // Emit error event
    await emit({
      topic: 'slack-alert',
      data: {
        type: 'WORKFLOW_ERROR',
        payload: {
          step: 'rag-agent',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }
    })

    throw error
  }
}