import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  requestId: z.string(),
  chunk: z.string(),
  chunkIndex: z.number(),
  totalChunks: z.number(),
  metadata: z.record(z.any()).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'EmbeddingsGenerator',
  description: 'Generates embeddings using OpenAI text-embedding-3-small',
  subscribes: ['embeddings.generate'],
  emits: ['weaviate.insert'],
  input: inputSchema,
  flows: ['currency-rate-monitor']
};

export const handler: Handlers['EmbeddingsGenerator'] = async (input, { emit, logger }) => {
  const { requestId, chunk, chunkIndex, totalChunks, metadata } = input;
  
  logger.info('Generating embeddings', { 
    requestId, 
    chunkIndex, 
    totalChunks,
    chunkLength: chunk.length 
  });

  try {
    // Call OpenAI Embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: chunk
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    logger.info('Embeddings generated successfully', { 
      requestId, 
      chunkIndex,
      embeddingDimensions: embedding.length 
    });

    // Emit to Weaviate for storage
    await emit({
      topic: 'weaviate.insert',
      data: {
        requestId,
        chunk,
        embedding,
        chunkIndex,
        totalChunks,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      }
    });

    logger.info('Embedding sent to Weaviate', { requestId, chunkIndex });
  } catch (error) {
    logger.error('Embedding generation failed', { 
      requestId, 
      chunkIndex,
      error: (error as Error).message 
    });
    throw error;
  }
};

