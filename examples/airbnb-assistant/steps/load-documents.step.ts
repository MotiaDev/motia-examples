import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { pineconeService } from '../src/services/pinecone'

const bodySchema = z.object({
  content: z.string().min(1, 'Content is required'),
  metadata: z.object({
    source: z.string().optional(),
    title: z.string().optional(),
    category: z.string().optional()
  }).optional(),
  chunkSize: z.number().optional().default(500),
  chunkOverlap: z.number().optional().default(50)
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'LoadDocuments',
  description: 'Load and process documents into vector database',
  path: '/load-documents',
  method: 'POST',
  bodySchema,
  emits: [],
  flows: ['guest-assistant'],
  responseSchema: {
    200: z.object({
      chunksProcessed: z.number(),
      success: z.boolean()
    }),
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  }
}

function splitTextIntoChunks(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const chunks: string[] = []
  let start = 0
  
  while (start < text.length) {
    const end = start + chunkSize
    const chunk = text.slice(start, end)
    chunks.push(chunk)
    
    start = end - overlap
    
    if (end >= text.length) break
  }
  
  return chunks
}

export const handler: Handlers['LoadDocuments'] = async (req, { logger }) => {
  try {
    const { content, metadata, chunkSize, chunkOverlap } = bodySchema.parse(req.body)
    
    logger.info('Processing document', { 
      contentLength: content.length, 
      chunkSize,
      chunkOverlap 
    })
    
    // Split content into chunks
    const chunks = splitTextIntoChunks(content, chunkSize, chunkOverlap)
    
    // Prepare metadata for each chunk
    const chunkMetadata = chunks.map((chunk, index) => ({
      ...metadata,
      chunkIndex: index,
      totalChunks: chunks.length
    }))
    
    // Insert chunks into vector database
    await pineconeService.insertVectors(chunks, chunkMetadata)
    
    logger.info('Document processed successfully', { chunksProcessed: chunks.length })
    
    return {
      status: 200,
      body: {
        chunksProcessed: chunks.length,
        success: true
      }
    }
  } catch (error) {
    logger.error('Document processing failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    
    return {
      status: 500,
      body: { error: 'Failed to process document' }
    }
  }
}
