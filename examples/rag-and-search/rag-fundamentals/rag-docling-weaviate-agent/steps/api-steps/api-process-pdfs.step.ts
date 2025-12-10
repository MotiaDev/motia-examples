import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'api-process-pdfs',
  path: '/api/rag/process-pdfs',
  method: 'POST',
  emits: [{ topic: 'rag.read.pdfs' }],
  flows: ['rag-workflow'],
  bodySchema: z.object({
    folderPath: z.string(),
  }),
};

export const handler: Handlers['api-process-pdfs'] = async (
  req,
  { emit, logger }
) => {
  const { folderPath } = req.body;

  logger.info('Starting PDF processing workflow', { folderPath });

  await emit({
    topic: 'rag.read.pdfs',
    data: { folderPath },
  });

  return {
    status: 200,
    body: {
      message: 'PDF processing workflow started',
      folderPath,
    },
  };
};
