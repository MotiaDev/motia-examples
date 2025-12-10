import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { generateEmbeddings } from '../../src/services/openai';
import { storeDocuments } from '../../src/services/couchbase';
import type { MortgageDocument } from '../../src/services/couchbase/types';

const inputSchema = z.object({
  dataId: z.string(),
  chunks: z.array(z.string()),
  query: z.string()
});

export const config: EventConfig = {
  name: 'StoreEmbeddings',
  type: 'event',
  description: 'Generate embeddings and store in Couchbase vector database',
  subscribes: ['store-embeddings'],
  emits: ['query-and-analyze'],
  input: inputSchema,
  flows: ['mortgage-rate-alert']
};

export const handler: Handlers['StoreEmbeddings'] = async (input, { emit, logger, state }) => {
  const { dataId, chunks, query } = input;
  
  logger.info('Generating embeddings', { dataId, chunkCount: chunks.length });
  
  // Store chunks in state for immediate access (bypass FTS indexing lag)
  await state.set('current-chunks', dataId, chunks);
  
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const cbConnectionString = process.env.COUCHBASE_CONNECTION_STRING;
  const cbDataApiUrl = process.env.COUCHBASE_DATA_API_URL;
  const cbUsername = process.env.COUCHBASE_USERNAME;
  const cbPassword = process.env.COUCHBASE_PASSWORD;
  const cbBucket = process.env.COUCHBASE_BUCKET || 'morgage-data';
  const cbScope = process.env.COUCHBASE_SCOPE || '_default';
  const cbCollection = process.env.COUCHBASE_COLLECTION || '_default';
  
  if (!openaiApiKey || !cbConnectionString || !cbDataApiUrl || !cbUsername || !cbPassword) {
    logger.error('Missing required configuration', {
      hasOpenAI: !!openaiApiKey,
      hasCouchbase: !!(cbConnectionString && cbDataApiUrl && cbUsername && cbPassword)
    });
    throw new Error('Missing required environment variables');
  }
  
  const embeddings = await generateEmbeddings(chunks, openaiApiKey);
  
  logger.info('Embeddings generated', { dataId, embeddingCount: embeddings.length });
  
  const documents: MortgageDocument[] = embeddings.map((embedding, index) => ({
    type: 'mortgage-data',
    embedding,
    text: chunks[index],
    metadata: {
      dataId,
      chunkIndex: index,
      timestamp: new Date().toISOString()
    }
  }));
  
  logger.info('Starting Couchbase storage', { 
    dataId, 
    documentCount: documents.length,
    bucket: cbBucket
  });
  
  try {
    await storeDocuments(documents, {
      connectionString: cbConnectionString,
      dataApiUrl: cbDataApiUrl,
      username: cbUsername,
      password: cbPassword,
      bucketName: cbBucket,
      scopeName: cbScope,
      collectionName: cbCollection
    });
    
    logger.info('Vectors stored in Couchbase', { dataId, vectorCount: documents.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to store in Couchbase', { 
      dataId, 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
  
  await emit({
    topic: 'query-and-analyze',
    data: {
      dataId,
      query
    }
  });
};

