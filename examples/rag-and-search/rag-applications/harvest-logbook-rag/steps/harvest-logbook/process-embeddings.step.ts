/**
 * Process Embeddings Event Step
 * Splits text, generates embeddings, and stores in Pinecone vector database
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { HarvestLogbookService } from '../../src/services/harvest-logbook';

const inputSchema = z.object({
  entryId: z.string(),
  content: z.string(),
  metadata: z.record(z.any()).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessEmbeddings',
  description: 'Splits text into chunks, generates embeddings, and stores in vector database',
  subscribes: ['process-embeddings'],
  emits: [],
  input: inputSchema,
  flows: ['harvest-logbook']
};

export const handler: Handlers['ProcessEmbeddings'] = async (input, { logger, state }) => {
  try {
    const { entryId, content, metadata } = input;

    logger.info('Processing embeddings', {
      entryId,
      contentLength: content.length
    });

    // Store the entry using the service
    const vectorIds = await HarvestLogbookService.storeEntry({
      id: entryId,
      content,
      metadata,
      timestamp: new Date().toISOString()
    });

    // Update state with vector IDs
    await state.set('harvest-vectors', entryId, {
      vectorIds,
      processedAt: new Date().toISOString(),
      chunkCount: vectorIds.length
    });

    logger.info('Successfully processed and stored embeddings', {
      entryId,
      vectorCount: vectorIds.length
    });
  } catch (error) {
    logger.error('Failed to process embeddings', {
      entryId: input.entryId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error; // Re-throw to trigger retry mechanism
  }
};
