/**
 * Download App as ZIP API Step
 * 
 * Endpoint to download the generated application files as a ZIP archive.
 * Creates a downloadable zip file containing all generated code.
 * 
 * GET /apps/:flowId/download/zip
 */

import type { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { coreMiddleware } from '../../middlewares/core.middleware';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'DownloadAppZipAPI',
  description: 'Download all generated application files as a ZIP archive',
  path: '/apps/:flowId/download/zip',
  method: 'GET',
  middleware: [coreMiddleware],
  emits: [],
  virtualSubscribes: ['app_generation.completed'],
  flows: ['app-generator'],
  responseSchema: {
    200: z.any(), // Binary response
    404: z.object({ error: z.string() }),
    400: z.object({ error: z.string(), status: z.string() }),
  },
};

export const handler: Handlers['DownloadAppZipAPI'] = async (req, { logger, state }) => {
  const { flowId } = req.pathParams;
  
  logger.info('ZIP download request received', { flowId });

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

  // Create ZIP archive
  const appName = workflowState.appSpec.title.toLowerCase().replace(/\s+/g, '-');
  
  try {
    const zipBuffer = await createZipArchive(finalOutput.files, appName);
    
    logger.info('ZIP archive created', { 
      flowId, 
      fileCount: finalOutput.files.length,
      zipSize: zipBuffer.length,
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${appName}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
      body: zipBuffer,
    };
  } catch (error: any) {
    logger.error('Failed to create ZIP archive', { flowId, error: error.message });
    return {
      status: 500,
      body: {
        error: 'Failed to create ZIP archive',
      },
    };
  }
};

async function createZipArchive(files: any[], appName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const passThrough = new PassThrough();
    
    passThrough.on('data', (chunk) => chunks.push(chunk));
    passThrough.on('end', () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', reject);

    archive.pipe(passThrough);

    archive.on('error', (err) => reject(err));

    // Add each file to the archive under the app directory
    for (const file of files) {
      const filePath = `${appName}/${file.path}`;
      archive.append(file.content, { name: filePath });
    }

    archive.finalize();
  });
}

