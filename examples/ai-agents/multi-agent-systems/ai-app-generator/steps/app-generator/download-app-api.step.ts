/**
 * Download App API Step
 * 
 * Endpoint to download the generated application files.
 * Returns all generated files as a JSON structure that can be
 * used to recreate the file system.
 * 
 * GET /apps/:flowId/download
 */

import type { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { coreMiddleware } from '../../middlewares/core.middleware';

const fileSchema = z.object({
  path: z.string(),
  content: z.string(),
  language: z.string(),
  moduleType: z.string(),
});

const responseSchema = z.object({
  flowId: z.string(),
  appTitle: z.string(),
  totalFiles: z.number(),
  totalLines: z.number(),
  files: z.array(fileSchema),
  generatedAt: z.string(),
  downloadInstructions: z.string(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'DownloadAppAPI',
  description: 'Download all generated application files',
  path: '/apps/:flowId/download',
  method: 'GET',
  middleware: [coreMiddleware],
  emits: [],
  virtualSubscribes: ['app_generation.completed'],
  flows: ['app-generator'],
  responseSchema: {
    200: responseSchema,
    404: z.object({ error: z.string() }),
    400: z.object({ error: z.string(), status: z.string() }),
  },
};

export const handler: Handlers['DownloadAppAPI'] = async (req, { logger, state }) => {
  const { flowId } = req.pathParams;
  
  logger.info('Download request received', { flowId });

  // Check workflow status
  const workflowState = await state.get<any>('workflows', flowId);
  
  if (!workflowState) {
    return {
      status: 404,
      body: {
        error: `Workflow not found: ${flowId}`,
      },
    };
  }

  if (workflowState.status !== 'completed') {
    return {
      status: 400,
      body: {
        error: 'App generation is not yet complete',
        status: workflowState.status,
      },
    };
  }

  // Get final output
  const finalOutput = await state.get<any>('outputs', flowId);
  
  if (!finalOutput) {
    return {
      status: 404,
      body: {
        error: 'Generated files not found. The workflow may have completed with errors.',
      },
    };
  }

  // Format files for download
  const files = finalOutput.files.map((f: any) => ({
    path: f.path,
    content: f.content,
    language: f.language,
    moduleType: f.moduleType,
  }));

  const downloadInstructions = `
To recreate this project:

1. Create a new directory:
   mkdir ${workflowState.appSpec.title.toLowerCase().replace(/\s+/g, '-')}
   cd ${workflowState.appSpec.title.toLowerCase().replace(/\s+/g, '-')}

2. Create each file in the files array at its specified path

3. Install dependencies:
   npm install

4. Start development server:
   npm run dev

Or use the Motia CLI (if available):
   motia app download ${flowId}
`.trim();

  logger.info('Download prepared', { 
    flowId, 
    fileCount: files.length,
    totalLines: finalOutput.totalLines,
  });

  return {
    status: 200,
    body: {
      flowId,
      appTitle: workflowState.appSpec.title,
      totalFiles: finalOutput.totalFiles,
      totalLines: finalOutput.totalLines,
      files,
      generatedAt: finalOutput.generatedAt,
      downloadInstructions,
    },
  };
};

