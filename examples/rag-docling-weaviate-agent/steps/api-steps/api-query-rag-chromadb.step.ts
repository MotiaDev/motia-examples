import { ApiRouteConfig, Handlers } from 'motia';
import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import { RAGResponse } from '../../types/index';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'api-query-rag-chromadb',
  path: '/api/rag/query-chromadb',
  method: 'POST',
  emits: ['rag.query.completed'],
  flows: ['rag-workflow'],
  bodySchema: z.object({
    query: z.string(),
    limit: z.number().optional().default(5),
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

const getQueryEmbedding = async (query: string) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  return response.data[0].embedding;
};

const generateAnswer = async (query: string, context: string) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'Answer the following question using only the provided context. If the context does not contain enough information to answer the question, say so.',
      },
      {
        role: 'user',
        content: `Context: ${context}\n\nQuestion: ${query}`,
      },
    ],
    max_tokens: 4096,
  });

  return response.choices[0]?.message?.content || 'No answer generated';
};

export const handler: Handlers['api-query-rag-chromadb'] = async (req, { logger, emit }) => {
  const { query, limit } = req.body;

  logger.info('Processing RAG query with ChromaDB', { query, limit });

  // Initialize ChromaDB client
  const client = getChromaClient();

  try {
    // Get collection
    const collection = await client.getCollection({ name: COLLECTION_NAME });

    // Get query embedding
    const queryEmbedding = await getQueryEmbedding(query);

    // Query ChromaDB for similar documents
    const result = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      include: ['documents', 'metadatas', 'distances'],
    });

    // Extract results
    const documents = result.documents?.[0] || [];
    const metadatas = result.metadatas?.[0] || [];
    const distances = result.distances?.[0] || [];

    // Format chunks
    const chunks = documents.map((doc, index) => ({
      text: doc || '',
      title: (metadatas[index] as any)?.title || 'Unknown',
      metadata: {
        source: (metadatas[index] as any)?.source || 'unknown',
        page: parseInt((metadatas[index] as any)?.page || '1', 10),
      },
    }));

    // Generate answer using retrieved context
    const context = chunks.map(chunk => chunk.text).join('\n\n');
    const answer = await generateAnswer(query, context);

    const response = RAGResponse.parse({ query, answer, chunks });

    await emit({
      // cast to any since generated types for this example do not declare this topic contract
      topic: 'rag.query.completed' as any,
      data: response as any,
    });

    return {
      status: 200,
      body: response,
    };
  } catch (error) {
    logger.error('Error querying ChromaDB', {
      error,
      host: process.env.CHROMADB_HOST,
      port: process.env.CHROMADB_PORT,
      collection: COLLECTION_NAME,
      hint: 'Ensure the books collection exists and data is loaded via /api/rag/process-pdfs before querying.'
    });
    return {
      status: 500,
      body: {
        error: 'Failed to process RAG query',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
};
