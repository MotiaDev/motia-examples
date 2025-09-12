import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import { DocumentChunkType } from '../../types/index';
import { z } from 'zod';
import { EventConfig, Handlers } from 'motia';

const InputSchema = z.object({
  stateKey: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'load-chromadb',
  subscribes: ['rag.chunks.ready'],
  emits: [{ topic: 'rag.chunks.loaded', label: 'Chunks loaded in ChromaDB' }],
  flows: ['rag-workflow'],
  input: InputSchema,
};

const COLLECTION_NAME = 'books';

const getChromaClient = () => {
  const host = process.env.CHROMADB_HOST || 'localhost';
  const port = process.env.CHROMADB_PORT || '8000';
  
  return new ChromaClient({
    path: `http://${host}:${port}`,
  });
};

const getEmbeddings = async (texts: string[]) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });

  return response.data.map(item => item.embedding);
};

export const handler: Handlers['load-chromadb'] = async (
  input,
  { emit, logger, state }
) => {
  // Get chunks from state
  const chunks = await state.get<DocumentChunkType[]>('rag-workflow', input.stateKey);
  if (!chunks) {
    throw new Error('No chunks found in state');
  }

  logger.info('Retrieved chunks from state', { count: chunks.length });

  // Initialize ChromaDB client
  logger.info('Initializing ChromaDB client');
  const client = getChromaClient();

  try {
    // Get or create collection
    const collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: {
        description: 'Books collection for RAG system',
      },
    });

    // Process chunks in batches
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Prepare data for ChromaDB
      const texts = batch.map((chunk: DocumentChunkType) => chunk.text);
      const embeddings = await getEmbeddings(texts);
      
      const ids = batch.map((_, index) => `chunk_${i + index}`);
      const metadatas = batch.map((chunk: DocumentChunkType) => ({
        title: chunk.title,
        source: chunk.metadata.source,
        page: chunk.metadata.page.toString(),
      }));
      const documents = texts;

      // Add to collection
      await collection.add({
        ids,
        embeddings,
        metadatas,
        documents,
      });
      
      logger.info(`Inserted batch ${i / batchSize + 1}`, { count: batch.length });
    }

    await emit({ topic: 'rag.chunks.loaded', data: { count: chunks.length } });
  } catch (error) {
    logger.error('Error in load-chromadb step', { error });
    throw error;
  }
};
