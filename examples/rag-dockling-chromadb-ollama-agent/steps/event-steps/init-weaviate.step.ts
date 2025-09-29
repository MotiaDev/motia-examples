import { WeaviateClient, vectorizer, generative } from 'weaviate-client';
import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { createWeaviateClient } from '../../utils/weaviate-client';

export const config: EventConfig = {
  type: 'event',
  name: 'init-weaviate',
  subscribes: ['rag.read.pdfs'],
  emits: [],
  flows: ['rag-workflow'],
  // Must match the schema of other subscribers to 'rag.read.pdfs'
  input: z.object({
    folderPath: z.string(),
  }),

};

const getWeaviateSchema = () => {
  const embeddingProvider = process.env.EMBEDDING_PROVIDER || 'openai';
  
  let vectorizerConfig;
  if (embeddingProvider === 'openai') {
    vectorizerConfig = vectorizer.text2VecOpenAI({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      sourceProperties: ['text'],
    });
  } else {
    // For Ollama or other providers, we'll use a custom vectorizer
    // Note: Weaviate doesn't have built-in support for Ollama, so we'll use a generic approach
    // This would require custom implementation or using a different vectorizer
    vectorizerConfig = vectorizer.text2VecOpenAI({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      sourceProperties: ['text'],
    });
  }

  return {
    name: 'Books',
    description: 'Books',
    vectorizers: vectorizerConfig,
    generative: generative.openAI({
      model: 'gpt-4o',
      maxTokens: 4096,
    }),
    properties: [
      {
        name: 'text',
        dataType: 'text' as const,
      },
      {
        name: 'title',
        dataType: 'text' as const,
      },
      {
        name: 'source',
        dataType: 'text' as const,
      },
      {
        name: 'page',
        dataType: 'number' as const,
      },
    ],
  };
};

const collectionExists = async (client: WeaviateClient) => client.collections.get('Books').exists();
const createCollection = async (client: WeaviateClient) => {
  const schema = getWeaviateSchema();
  return client.collections.create(schema);
};

export const handler: Handlers['init-weaviate'] = async (
  _input,
  { logger }
) => {
  logger.info('Initializing Weaviate client');

  // Initialize Weaviate client (automatically detects local vs cloud)
  const client = await createWeaviateClient();

  try {
    const exists = await collectionExists(client);
    if (exists) {
      const schema = getWeaviateSchema();
      logger.info(`Collection "${schema.name}" already exists – keeping as-is.`);
    } else {
      const schema = getWeaviateSchema();
      logger.info(`Creating collection "${schema.name}"...`);
      await createCollection(client);
      logger.info('Collection created');
    }
  } catch (error) {
    logger.error('Error in init-weaviate step', { error });
    throw error;
  } finally {
    await client.close();
  }
};
