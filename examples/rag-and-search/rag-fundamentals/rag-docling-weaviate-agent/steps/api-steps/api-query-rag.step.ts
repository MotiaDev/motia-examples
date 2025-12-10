import { ApiRouteConfig, Handlers } from 'motia';
import weaviate from 'weaviate-client';
import { RAGResponse } from '../../types/index';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'api-query-rag',
  path: '/api/rag/query',
  method: 'POST',
  emits: ['rag.query.completed'],
  flows: ['rag-workflow'],
  bodySchema: z.object({
    query: z.string(),
    limit: z.number().optional().default(5),
  }),
};

export const handler: Handlers['api-query-rag'] = async (req, { logger, emit }) => {
  const { query, limit } = req.body;

  logger.info('Processing RAG query', { query, limit });

  // Initialize Weaviate client
  const client = await weaviate.connectToWeaviateCloud(process.env.WEAVIATE_URL!, {
    authCredentials: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY!),
    headers: {
      'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY!,
      //"X-OpenAI-Organization": process.env.OPENAI_ORGANIZATION!,
    },
  });

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
        fields: ['text', 'title', 'source', 'page'],
        // metadata: ['distance'],
      });
    } catch {
      // fallback to stable API
      result = await (documentCollection as any).generate.nearText(
        query,
        { singlePrompt: `Answer the following question using only the provided context: ${query}` },
        { limit, returnProperties: ['text', 'title', 'source', 'page'], returnMetadata: ['distance'] }
      );
    }

    const objects = (result?.objects ?? result?.data ?? result ?? []);
    const chunks = objects.map((doc: any) => ({
      text: (doc.properties?.text ?? doc.text ?? '') as string,
      title: (doc.properties?.title ?? doc.title ?? 'Unknown') as string,
      metadata: {
        source: (doc.properties?.source ?? doc.source ?? 'unknown') as string,
        page: Number(doc.properties?.page ?? doc.page ?? 1),
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
      hint: 'Ensure the Books collection exists and data is loaded via /api/rag/process-pdfs before querying.'
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
