import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'api-process-documents',
  path: '/api/rag/process-documents',
  method: 'POST',
  emits: [{ topic: 'rag.read.documents' }],
  flows: ['rag-workflow'],
  bodySchema: z.object({
    folderPath: z.string(),
  }),
};

export const handler: Handlers['api-process-documents'] = async (
  req,
  { emit, logger }
) => {
  const { folderPath } = req.body;

  logger.info('Starting document processing workflow', { folderPath });

  await emit({
    topic: 'rag.read.documents',
    data: { folderPath },
  });

  return {
    status: 200,
    body: {
      message: 'Document processing workflow started',
      folderPath,
      supportedFormats: ['PDF', 'Markdown (.md)', 'HTML (.html, .htm)', 'Text (.txt)'],
    },
  };
};
