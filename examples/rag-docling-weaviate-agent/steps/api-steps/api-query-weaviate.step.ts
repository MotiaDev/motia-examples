import { ApiRouteConfig, Handlers } from 'motia';
import { RAGResponse } from '../../types/index';
import { z } from 'zod';
import { createWeaviateClient } from '../../utils/weaviate-client';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'api-query-weaviate',
  path: '/api/rag/query-weaviate',
  method: 'POST',
  emits: ['rag.query.completed'],
  flows: ['rag-workflow'],
  bodySchema: z.object({
    query: z.string(),
    limit: z.number().optional().default(5),
  }),
};

export const handler: Handlers['api-query-weaviate'] = async (req, { logger, emit }) => {
  const { query, limit } = req.body;

  logger.info('Processing RAG query with Weaviate', { query, limit });

  // Initialize Weaviate client (automatically detects local vs cloud)
  const client = await createWeaviateClient();

  try {
    // Get collection reference
    const documentCollection = client.collections.get('Books');

    // Query using v3 syntax
    // Prefer alpha.hosted.withNearText.generate where available, fallback to generate.nearText
    let result: any;
    try {
      // v3 hosted alpha API shape
      result = await (documentCollection as any).alpha.hosted.withNearText.generate({
        query,
        limit: limit,
        singlePrompt: `Answer the following question using only the provided context: ${query}`,
        fields: ['text', 'title', 'source', 'page', 'file_type'],
        // metadata: ['distance'],
      });
    } catch {
      // fallback to stable API
      result = await (documentCollection as any).generate.nearText(
        query,
        { singlePrompt: `Answer the following question using only the provided context: ${query}` },
        { limit, returnProperties: ['text', 'title', 'source', 'page', 'file_type'], returnMetadata: ['distance'] }
      );
    }

    const objects = (result?.objects ?? result?.data ?? result ?? []);
    const chunks = objects.map((doc: any) => ({
      text: (doc.properties?.text ?? doc.text ?? '') as string,
      title: (doc.properties?.title ?? doc.title ?? 'Unknown') as string,
      metadata: {
        source: (doc.properties?.source ?? doc.source ?? 'unknown') as string,
        page: Number(doc.properties?.page ?? doc.page ?? 1),
        file_type: (doc.properties?.file_type ?? doc.file_type ?? 'unknown') as string,
      },
    }));

    const answer = (objects[0]?.generated ?? result?.generated ?? 'No answer generated') as string;

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
    logger.error('Error querying Weaviate', {
      error,
      url: process.env.WEAVIATE_URL,
      collection: 'Books',
      hint: 'Ensure the Books collection exists and documents are loaded via /api/rag/process-pdfs or /api/rag/process-documents before querying with /api/rag/query-weaviate.'
    });
    return {
      status: 500,
      body: {
        error: 'Failed to process RAG query',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  } finally {
    try { await client.close(); } catch {}
  }
};
