import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'api-process-documents-chromadb',
  path: '/api/rag/process-documents-chromadb',
  method: 'POST',
  emits: [{ topic: 'rag.read.documents.chromadb' }],
  flows: ['rag-workflow'],
  bodySchema: z.object({
    folderPath: z.string(),
  }),
};

export const handler: Handlers['api-process-documents-chromadb'] = async (
  req,
  { emit, logger }
) => {
  const { folderPath } = req.body;

  logger.info('Starting document processing workflow for ChromaDB', { folderPath });

  await emit({
    topic: 'rag.read.documents.chromadb',
    data: { folderPath },
  });

  return {
    status: 200,
    body: {
      message: 'Document processing workflow started for ChromaDB',
      folderPath,
      supportedFormats: ['PDF', 'Markdown (.md)', 'HTML (.html, .htm)', 'Text (.txt)'],
    },
  };
};
