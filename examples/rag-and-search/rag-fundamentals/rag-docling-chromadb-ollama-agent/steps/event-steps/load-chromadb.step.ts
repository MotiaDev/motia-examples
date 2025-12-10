import { ChromaClient } from 'chromadb';
import { DocumentChunkType } from '../../types/index';
import { z } from 'zod';
import { EventConfig, Handlers } from 'motia';
import { createEmbeddingService } from '../../utils/embedding-service';

const InputSchema = z.object({
  stateKey: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'load-chromadb',
  subscribes: ['rag.chunks.ready.chromadb'],
  emits: [{ topic: 'rag.chunks.loaded.chromadb', label: 'Chunks loaded in ChromaDB' }],
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

const getEmbeddings = async (texts: string[], embeddingService: any) => {
  return await embeddingService.getEmbeddings(texts);
};

const ensureCollectionCompatibility = async (client: any, collectionName: string, expectedDimension: number, logger: any) => {
  try {
    // Check if collection exists
    const collections = await client.listCollections();
    const existingCollection = collections.find((col: any) => col.name === collectionName);
    
    if (existingCollection) {
      // Get collection metadata to check dimensions
      const collection = await client.getCollection({ name: collectionName });
      const metadata = collection.metadata;
      
      const existingDimension = metadata?.embedding_dimension ? parseInt(metadata.embedding_dimension) : null;
      const existingProvider = metadata?.embedding_provider;
      const currentProvider = process.env.EMBEDDING_PROVIDER || 'openai';
      
      // If dimensions or provider don't match, recreate the collection
      if (existingDimension !== expectedDimension || existingProvider !== currentProvider) {
        logger.warn('Collection dimension/provider mismatch detected', {
          existingDimension,
          expectedDimension,
          existingProvider,
          currentProvider
        });
        
        logger.info('Deleting existing collection to recreate with correct dimensions');
        await client.deleteCollection({ name: collectionName });
        
        logger.info('Collection deleted, will be recreated with correct dimensions');
      }
    }
  } catch (error) {
    logger.warn('Error checking collection compatibility', { error: error.message });
    // Continue anyway, collection will be created if it doesn't exist
  }
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

  // Initialize ChromaDB client with retry logic
  logger.info('Initializing ChromaDB client');
  let client;
  let clientRetryCount = 0;
  const maxClientRetries = 3;
  
  while (!client && clientRetryCount < maxClientRetries) {
    try {
      // Check memory before initializing client
      const memUsage = process.memoryUsage();
      const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (memPercent > 90) {
        logger.warn(`High memory usage detected (${memPercent.toFixed(1)}%), forcing garbage collection before client init`);
        if (global.gc) {
          global.gc();
        }
        // Wait a bit for memory cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      client = getChromaClient();
      // Test the connection with timeout
      await Promise.race([
        client.heartbeat(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Heartbeat timeout')), 10000))
      ]);
      logger.info('ChromaDB client initialized successfully');
    } catch (error) {
      clientRetryCount++;
      logger.warn(`Failed to initialize ChromaDB client, attempt ${clientRetryCount}/${maxClientRetries}`, { 
        error: error.message,
        memoryUsage: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
      });
      
      if (clientRetryCount >= maxClientRetries) {
        logger.error(`Failed to initialize ChromaDB client after ${maxClientRetries} attempts`, { error });
        throw error;
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, clientRetryCount) * 1000));
    }
  }

  try {
    // Get embedding service to determine dimensions
    const embeddingService = createEmbeddingService();
    const embeddingDimension = embeddingService.getEmbeddingDimension();
    
    logger.info('Using embedding dimension', { dimension: embeddingDimension });

    // Ensure collection compatibility with current embedding configuration
    await ensureCollectionCompatibility(client, COLLECTION_NAME, embeddingDimension, logger);

    // Get or create collection with proper embedding dimension
    const collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: {
        description: 'Books collection for RAG system',
        embedding_dimension: embeddingDimension.toString(),
        embedding_provider: process.env.EMBEDDING_PROVIDER || 'openai',
      },
    });

    // Process chunks in very small batches to reduce memory usage
    const batchSize = 10; // Further reduced to prevent OOM
    logger.info(`Processing ${chunks.length} chunks in batches of ${batchSize}`);
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Log memory usage before processing batch
      const memUsage = process.memoryUsage();
      const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`, {
        batchSize: batch.length,
        memoryUsage: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          percent: memPercent.toFixed(1) + '%'
        }
      });
      
      // Skip batch if memory usage is too high
      if (memPercent > 95) {
        logger.warn(`Skipping batch due to high memory usage: ${memPercent.toFixed(1)}%`);
        // Force garbage collection and wait
        if (global.gc) {
          global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      // Prepare data for ChromaDB
      const texts = batch.map((chunk: DocumentChunkType) => chunk.text);
      
      // Generate embeddings with memory monitoring
      logger.info(`Generating embeddings for ${texts.length} texts...`);
      const embeddings = await getEmbeddings(texts, embeddingService);
      logger.info(`Generated ${embeddings.length} embeddings`);
      
      const ids = batch.map((_, index) => `chunk_${i + index}`);
      const metadatas = batch.map((chunk: DocumentChunkType) => ({
        title: chunk.title,
        source: chunk.metadata.source,
        page: chunk.metadata.page ? chunk.metadata.page.toString() : '1',
        file_type: chunk.metadata.file_type || 'unknown',
        ...chunk.metadata, // Include all metadata properties
      }));
      const documents = texts;

      // Add to collection with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;
      
      while (!success && retryCount < maxRetries) {
        try {
          await collection.add({
            ids,
            embeddings,
            metadatas,
            documents,
          });
          success = true;
          logger.info(`Inserted batch ${i / batchSize + 1}`, { count: batch.length });
        } catch (error) {
          retryCount++;
          logger.warn(`Failed to insert batch ${i / batchSize + 1}, attempt ${retryCount}/${maxRetries}`, { 
            error: error.message,
            batchSize: batch.length 
          });
          
          if (retryCount >= maxRetries) {
            logger.error(`Failed to insert batch ${i / batchSize + 1} after ${maxRetries} attempts`, { error });
            throw error;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
      
      // Force garbage collection after each batch to free memory
      if (global.gc) {
        global.gc();
        logger.debug('Garbage collection triggered after batch');
      }
      
      // Small delay to allow memory cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await emit({ topic: 'rag.chunks.loaded.chromadb', data: { count: chunks.length } });
  } catch (error) {
    logger.error('Error in load-chromadb step', { error });
    throw error;
  }
};
