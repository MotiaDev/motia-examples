import { z } from 'zod'
import { EventConfig, Handlers } from 'motia'

// Input schema for the event
const inputSchema = z.object({
  type: z.literal('COMPETITOR_DATA_RECEIVED'),
  payload: z.object({
    data: z.object({
      competitorName: z.string().optional(),
      products: z.array(z.object({
        name: z.string(),
        price: z.number(),
        currency: z.string(),
        url: z.string().optional(),
        lastUpdated: z.string().optional()
      })).optional(),
      rawData: z.string().optional(),
      timestamp: z.string()
    }),
    processedAt: z.string()
  })
})

// Schema for processed text chunks
const chunkSchema = z.object({
  text: z.string(),
  metadata: z.object({
    competitorName: z.string().optional(),
    chunkIndex: z.number(),
    totalChunks: z.number(),
    sourceType: z.enum(['raw', 'product']),
    timestamp: z.string()
  })
})

export const config: EventConfig = {
  type: 'event',
  name: 'TextProcessor',
  description: 'Splits competitor data into manageable chunks for embedding',
  subscribes: ['text-processor'],
  emits: ['embeddings-generator'],
  input: inputSchema,
  flows: ['competitor-price-scraper']
}

export const handler: Handlers['TextProcessor'] = async (input, { emit, logger, state }) => {
  const { data } = input.payload
  const chunks: z.infer<typeof chunkSchema>[] = []
  
  // Configuration
  const CHUNK_SIZE = 400
  const CHUNK_OVERLAP = 40

  // Process raw data if available
  if (data.rawData) {
    const textChunks = splitTextIntoChunks(data.rawData, CHUNK_SIZE, CHUNK_OVERLAP)
    
    textChunks.forEach((chunk, index) => {
      chunks.push({
        text: chunk,
        metadata: {
          competitorName: data.competitorName,
          chunkIndex: index,
          totalChunks: textChunks.length,
          sourceType: 'raw',
          timestamp: data.timestamp
        }
      })
    })
  }

  // Process structured product data
  if (data.products && data.products.length > 0) {
    const productText = data.products.map(product => 
      `Product: ${product.name}\nPrice: ${product.currency} ${product.price}\nURL: ${product.url || 'N/A'}\nLast Updated: ${product.lastUpdated || data.timestamp}`
    ).join('\n\n')

    const productChunks = splitTextIntoChunks(productText, CHUNK_SIZE, CHUNK_OVERLAP)
    
    productChunks.forEach((chunk, index) => {
      chunks.push({
        text: chunk,
        metadata: {
          competitorName: data.competitorName,
          chunkIndex: chunks.length + index,
          totalChunks: productChunks.length,
          sourceType: 'product',
          timestamp: data.timestamp
        }
      })
    })
  }

  logger.info('Text processing completed', {
    totalChunks: chunks.length,
    hasRawData: !!data.rawData,
    productCount: data.products?.length || 0
  })

  // Store in state for the next step
  await state.set('competitor-scraper', 'textChunks', chunks)

  // Emit event for embeddings generation
  await emit({
    topic: 'embeddings-generator',
    data: {
      type: 'TEXT_CHUNKS_READY',
      payload: {
        chunks,
        totalChunks: chunks.length
      }
    }
  })
}

// Helper function to split text into chunks with overlap
function splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    
    if (end === text.length) break
    
    start = end - overlap
  }

  return chunks
}