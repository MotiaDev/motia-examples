import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  requestId: z.string(),
  chunk: z.string(),
  embedding: z.array(z.number()),
  chunkIndex: z.number(),
  totalChunks: z.number(),
  metadata: z.record(z.any()).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'WeaviateInsert',
  description: 'Inserts embeddings into Weaviate vector database',
  subscribes: ['weaviate.insert'],
  emits: [],
  input: inputSchema,
  flows: ['currency-rate-monitor']
};

export const handler: Handlers['WeaviateInsert'] = async (input, { logger }) => {
  const { requestId, chunk, embedding, chunkIndex, totalChunks, metadata } = input;
  
  logger.info('Inserting into Weaviate', { 
    requestId, 
    chunkIndex, 
    totalChunks 
  });

  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'http://localhost:8080';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (weaviateApiKey) {
      headers['Authorization'] = `Bearer ${weaviateApiKey}`;
    }

    // Insert object into Weaviate
    const response = await fetch(`${weaviateUrl}/v1/objects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        class: 'CurrencyRateMonitor',
        properties: {
          content: chunk,
          requestId,
          chunkIndex,
          totalChunks,
          metadata: JSON.stringify(metadata || {}),
          timestamp: new Date().toISOString()
        },
        vector: embedding
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Weaviate API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    logger.info('Successfully inserted into Weaviate', { 
      requestId, 
      chunkIndex,
      objectId: result.id 
    });
  } catch (error) {
    logger.error('Weaviate insertion failed', { 
      requestId, 
      chunkIndex,
      error: (error as Error).message 
    });
    throw error;
  }
};

