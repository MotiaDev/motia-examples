import weaviate from 'weaviate-client';
import { DocumentChunkType } from '../../types/index';
import { z } from 'zod';
import { EventConfig, Handlers } from 'motia';

const InputSchema = z.object({
  stateKey: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'load-weaviate',
  subscribes: ['rag.chunks.ready'],
  emits: [{ topic: 'rag.chunks.loaded', label: 'Chunks loaded in Weaviate' }],
  flows: ['rag-workflow'],
  input: InputSchema,
};

export const handler: Handlers['load-weaviate'] = async (
  input,
  { emit, logger, state }
) => {
  // Get chunks from state
  const chunks = await state.get<DocumentChunkType[]>('rag-workflow', input.stateKey);
  if (!chunks) {
    throw new Error('No chunks found in state');
  }

  logger.info('Retrieved chunks from state', { count: chunks.length });

  // Initialize Weaviate client
  logger.info('Initializing Weaviate client');
  const client = await weaviate.connectToWeaviateCloud(process.env.WEAVIATE_URL!, {
    authCredentials: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY!),
    headers: {
      'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY!,
      //"X-OpenAI-Organization": process.env.OPENAI_ORGANIZATION!,
    },
  });

  try {
    // Process chunks in batches
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize).map((chunk: DocumentChunkType) => ({
        properties: {
          text: chunk.text,
          title: chunk.title,
          source: chunk.metadata.source,
          page: chunk.metadata.page,
        },
      }));

      // Insert batch
      const collection = client.collections.get('Books');
      await collection.data.insertMany(batch);
      logger.info(`Inserted batch ${i / batchSize + 1}`, { count: batch.length });
    }

    await emit({ topic: 'rag.chunks.loaded', data: { count: chunks.length } });
  } catch (error) {
    logger.error('Error in load-weaviate step', { error });
    throw error;
  } finally {
    await client.close();
  }
};
