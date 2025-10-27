import { z } from 'zod'
import { EventConfig, Handlers } from 'motia'

// Input schema
const inputSchema = z.object({
  type: z.literal('TEXT_CHUNKS_READY'),
  payload: z.object({
    chunks: z.array(z.object({
      text: z.string(),
      metadata: z.object({
        competitorName: z.string().optional(),
        chunkIndex: z.number(),
        totalChunks: z.number(),
        sourceType: z.enum(['raw', 'product']),
        timestamp: z.string()
      })
    })),
    totalChunks: z.number()
  })
})

export const config: EventConfig = {
  type: 'event',
  name: 'EmbeddingsGenerator',
  description: 'Generates embeddings for text chunks using OpenAI',
  subscribes: ['embeddings-generator'],
  emits: ['vector-store', 'slack-alert'],
  input: inputSchema,
  flows: ['competitor-price-scraper']
}

export const handler: Handlers['EmbeddingsGenerator'] = async (input, { emit, logger, state }) => {
  const { chunks } = input.payload

  try {
    // Import OpenAI helper
    const { generateEmbeddings } = await import('../../../lib/openai')

    // Process chunks in batches for efficiency
    const BATCH_SIZE = 20
    const batches = []
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      batches.push(chunks.slice(i, i + BATCH_SIZE))
    }

    logger.info('Generating embeddings', {
      totalChunks: chunks.length,
      batchCount: batches.length
    })

    const embeddings: any[] = []

    // Process each batch
    for (const batch of batches) {
      const texts = batch.map(chunk => chunk.text)
      const batchEmbeddings = await generateEmbeddings(texts)

      // Combine embeddings with metadata
      batch.forEach((chunk, index) => {
        embeddings.push({
          text: chunk.text,
          embedding: batchEmbeddings[index],
          metadata: chunk.metadata
        })
      })
    }

    logger.info('Embeddings generated successfully', {
      totalEmbeddings: embeddings.length
    })

    // Store embeddings in state
    await state.set('competitor-scraper', 'embeddings', embeddings)

    // Emit event for vector storage
    await emit({
      topic: 'vector-store',
      data: {
        type: 'EMBEDDINGS_READY',
        payload: {
          embeddings,
          model: 'text-embedding-3-small',
          totalEmbeddings: embeddings.length
        }
      }
    })
  } catch (error) {
    logger.error('Failed to generate embeddings', { error })
    
    // Emit error event for Slack notification
    await emit({
      topic: 'slack-alert',
      data: {
        type: 'WORKFLOW_ERROR',
        payload: {
          step: 'embeddings-generator',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }
    })

    throw error
  }
}