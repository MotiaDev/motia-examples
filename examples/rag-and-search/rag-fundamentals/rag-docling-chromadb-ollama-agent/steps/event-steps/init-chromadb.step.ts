import { ChromaClient } from 'chromadb';
import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

export const config: EventConfig = {
  type: 'event',
  name: 'init-chromadb',
  subscribes: ['rag.read.pdfs.chromadb'],
  emits: [],
  flows: ['rag-workflow'],
  // Must match the schema of other subscribers to 'rag.read.pdfs.chromadb'
  input: z.object({
    folderPath: z.string(),
  }),
};

const COLLECTION_NAME = 'books';

const getChromaClient = () => {
  const host = process.env.CHROMADB_HOST || 'localhost';
  const port = process.env.CHROMADB_PORT || '8000';
  
  return new ChromaClient({
    path: `http://${host}:${port}`,
  });
};

const collectionExists = async (client: ChromaClient, name: string) => {
  try {
    await client.getCollection({ name });
    return true;
  } catch (error) {
    return false;
  }
};

const createCollection = async (client: ChromaClient, name: string) => {
  await client.createCollection({
    name,
    metadata: {
      description: 'Books collection for RAG system',
    },
  });
};

export const handler: Handlers['init-chromadb'] = async (
  _input,
  { logger }
) => {
  logger.info('Initializing ChromaDB client');

  // Initialize ChromaDB client
  const client = getChromaClient();

  try {
    const exists = await collectionExists(client, COLLECTION_NAME);
    if (exists) {
      logger.info(`Collection "${COLLECTION_NAME}" already exists – keeping as-is.`);
    } else {
      logger.info(`Creating collection "${COLLECTION_NAME}"...`);
      await createCollection(client, COLLECTION_NAME);
      logger.info('Collection created');
    }
  } catch (error) {
    logger.error('Error in init-chromadb step', { error });
    throw error;
  }
};
