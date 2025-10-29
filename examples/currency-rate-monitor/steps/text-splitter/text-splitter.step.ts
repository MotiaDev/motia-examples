import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  requestId: z.string(),
  text: z.string(),
  metadata: z.record(z.any()).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'TextSplitter',
  description: 'Splits text into chunks for embedding generation',
  subscribes: ['text.split'],
  emits: ['embeddings.generate'],
  input: inputSchema,
  flows: ['currency-rate-monitor']
};

export const handler: Handlers['TextSplitter'] = async (input, { emit, logger }) => {
  const { requestId, text, metadata } = input;
  
  logger.info('Splitting text into chunks', { requestId, textLength: text.length });

  // Split text into chunks (400 chars with 40 char overlap)
  const chunkSize = 400;
  const chunkOverlap = 40;
  const chunks: string[] = [];
  
  for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
    const chunk = text.slice(i, i + chunkSize);
    chunks.push(chunk);
  }

  logger.info('Text split into chunks', { requestId, chunkCount: chunks.length });

  // Emit each chunk for embedding generation
  for (let i = 0; i < chunks.length; i++) {
    await emit({
      topic: 'embeddings.generate',
      data: {
        requestId,
        chunk: chunks[i],
        chunkIndex: i,
        totalChunks: chunks.length,
        metadata
      }
    });
  }

  logger.info('All chunks emitted for embedding', { requestId });
};

