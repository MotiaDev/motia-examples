import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { ApiRequest, ApiRouteConfig, FlowContext } from 'motia';

import { withValidation } from '../middlewares/withValidation';
import { withApiErrorHandler } from '../middlewares/withApiErrorHandler';
import { withMiddleware } from '../middlewares/withMiddleware';
import { BadRequestError } from '../errors/BadRequestError';

const TriggerWorkflowInputSchema = z.object({
  folderPath: z.string().optional().default('conversations/real-estate-negotiation'),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Conversation Reader Trigger',
  description: 'Triggers the conversation screenshot reading process',
  path: '/conversation-analyzer/start',
  method: 'POST',
  emits: ['conversation-reader-start'],
  // bodySchema: TriggerWorkflowInputSchema, // Explicitly disabling here to prove a concept with api middlewares
  flows: ['default'],
};

export const handler = withMiddleware(
  withApiErrorHandler,
  withValidation(TriggerWorkflowInputSchema),

  async (req: ApiRequest, context: FlowContext) => {
    const { folderPath } = req.body;
    context.logger.info(`Triggering conversation screenshot reader from ${folderPath}`, req);

    // Check if folder exists
    const fullPath = path.resolve(process.cwd(), folderPath);
    if (!fs.existsSync(fullPath)) {
      throw new BadRequestError(`Folder ${folderPath} does not exist`);
    }

    // Emit event to start the background processing
    await context.emit({
      topic: 'conversation-reader-start',
      data: {
        folderPath,
        traceId: context.traceId,
      },
    });

    return {
      status: 200,
      body: {
        message: `Successfully triggered the conversation screenshot processing for folder: ${folderPath}`,
        folderPath,
        traceId: context.traceId,
      },
    };
  }
);
