import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'api-process-pdfs-chromadb',
  path: '/api/rag/process-pdfs-chromadb',
  method: 'POST',
  emits: [{ topic: 'rag.read.pdfs.chromadb' }],
  flows: ['rag-workflow'],
  bodySchema: z.object({
    folderPath: z.string(),
  }),
};

export const handler: Handlers['api-process-pdfs-chromadb'] = async (
  req,
  { emit, logger }
) => {
  const { folderPath } = req.body;

  logger.info('Starting PDF processing workflow for ChromaDB', { folderPath });

  await emit({
    topic: 'rag.read.pdfs.chromadb',
    data: { folderPath },
  });

  return {
    status: 200,
    body: {
      message: 'PDF processing workflow started for ChromaDB',
      folderPath,
    },
  };
};
