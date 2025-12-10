import { z } from 'zod'
import { EventConfig, Handlers } from 'motia'

// Input schema
const inputSchema = z.object({
  type: z.enum(['EMBEDDINGS_READY', 'QUERY_VECTOR_STORE']),
  payload: z.union([
    // For storing embeddings
    z.object({
      embeddings: z.array(z.object({
        text: z.string(),
        embedding: z.array(z.number()),
        metadata: z.object({
          competitorName: z.string().optional(),
          chunkIndex: z.number(),
          totalChunks: z.number(),
          sourceType: z.enum(['raw', 'product']),
          timestamp: z.string()
        })
      })),
      model: z.string(),
      totalEmbeddings: z.number()
    }),
    // For querying
    z.object({
      query: z.string(),
      queryEmbedding: z.array(z.number()),
      topK: z.number().default(5)
    })
  ])
})

export const config: EventConfig = {
  type: 'event',
  name: 'VectorStore',
  description: 'Stores and retrieves embeddings from Supabase vector database',
  subscribes: ['vector-store'],
  emits: ['rag-agent', 'slack-alert'],
  input: inputSchema,
  flows: ['competitor-price-scraper']
}

export const handler: Handlers['VectorStore'] = async (input, { emit, logger, state }) => {
  try {
    // Import Supabase helper
    const { upsertVectors, queryVectors } = await import('../../../lib/supabase')

    if (input.type === 'EMBEDDINGS_READY') {
      // Store embeddings in Supabase
      const payload = input.payload as { embeddings: any[]; model: string; totalEmbeddings: number }
      const { embeddings } = payload
      const documents = embeddings.map((emb: any) => ({
        id: `${emb.metadata.timestamp}_${emb.metadata.chunkIndex}`,
        content: emb.text,
        embedding: emb.embedding,
        metadata: {
          competitorName: emb.metadata.competitorName,
          chunkIndex: emb.metadata.chunkIndex,
          sourceType: emb.metadata.sourceType,
          timestamp: emb.metadata.timestamp
        }
      }))

      logger.info('Storing embeddings in vector database', {
        documentCount: documents.length
      })

      await upsertVectors('competitor_price_scraper', documents)

      logger.info('Embeddings stored successfully')

      // Store latest embeddings in state for RAG agent
      await state.set('competitor-scraper', 'latestVectorDocuments', documents)

      // Emit event for RAG agent
      await emit({
        topic: 'rag-agent',
        data: {
          type: 'VECTOR_STORE_READY',
          payload: {
            documentsStored: documents.length,
            indexName: 'competitor_price_scraper'
          }
        }
      })
    }
  } catch (error) {
    logger.error('Vector store operation failed', { error })
    
    // Emit error event
    await emit({
      topic: 'slack-alert',
      data: {
        type: 'WORKFLOW_ERROR',
        payload: {
          step: 'vector-store',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }
    })

    throw error
  }
}