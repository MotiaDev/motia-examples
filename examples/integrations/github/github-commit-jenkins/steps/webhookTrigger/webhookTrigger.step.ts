import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  commit: z.object({
    message: z.string(),
    author: z.string(),
    sha: z.string(),
    url: z.string()
  }).optional(),
  repository: z.object({
    name: z.string(),
    url: z.string()
  }).optional(),
  content: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'WebhookTrigger',
  description: 'GitHub commit webhook endpoint',
  path: '/github-commit-jenkins',
  method: 'POST',
  emits: ['process-commit'],
  flows: ['github-commit-jenkins'],
  bodySchema,
  responseSchema: {
    200: z.object({
      status: z.string(),
      message: z.string()
    }),
    400: z.object({ error: z.string() })
  }
};

export const handler: Handlers['WebhookTrigger'] = async (req, { emit, logger, state }) => {
  try {
    const data = bodySchema.parse(req.body);
    
    logger.info('GitHub webhook received', { 
      repository: data.repository?.name,
      commit: data.commit?.sha 
    });

    // Store the full payload in state for later processing
    const commitId = data.commit?.sha || `commit-${Date.now()}`;
    await state.set('github-commits', commitId, {
      ...data,
      receivedAt: new Date().toISOString()
    });

    // Emit to processing step
    await emit({
      topic: 'process-commit',
      data: {
        commitId,
        content: data.content || JSON.stringify(data),
        metadata: data.metadata || {}
      }
    });

    logger.info('Webhook processed successfully', { commitId });

    return {
      status: 200,
      body: {
        status: 'success',
        message: 'Webhook received and processing started'
      }
    };
  } catch (error) {
    logger.error('Webhook processing failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return {
      status: 400,
      body: { error: 'Invalid webhook payload' }
    };
  }
};

