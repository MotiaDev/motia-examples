import weaviate, { WeaviateClient, vectorizer, generative } from 'weaviate-client';
import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

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

const WEAVIATE_SCHEMA = {
  name: 'Books',
  description: 'Books',
  vectorizers: vectorizer.text2VecOpenAI({
    model: 'text-embedding-3-small',
    sourceProperties: ['text'],
  }),
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

const collectionExists = async (client: WeaviateClient) => client.collections.get('Books').exists();
const createCollection = async (client: WeaviateClient) => client.collections.create(WEAVIATE_SCHEMA);

export const handler: Handlers['init-weaviate'] = async (
  _input,
  { logger }
) => {
  logger.info('Initializing Weaviate client');

  // Initialize Weaviate client
  const client = await weaviate.connectToWeaviateCloud(process.env.WEAVIATE_URL!, {
    authCredentials: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY!),
    headers: {
      'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY!,
      //"X-OpenAI-Organization": process.env.OPENAI_ORGANIZATION!,
    },
  });

  try {
    const exists = await collectionExists(client);
    if (exists) {
      logger.info(`Collection "${WEAVIATE_SCHEMA.name}" already exists – keeping as-is.`);
    } else {
      logger.info(`Creating collection "${WEAVIATE_SCHEMA.name}"...`);
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
