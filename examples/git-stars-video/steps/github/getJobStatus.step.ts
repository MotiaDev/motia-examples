import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const responseSchema = {
  200: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    data: z.any().optional(),
    error: z.string().optional(),
  }),
  404: z.object({ 
    error: z.string() 
  }),
};

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetJobStatus',
  description: 'Gets the status of a GitHub star fetch job',
  path: '/api/github/jobs/:jobId',
  method: 'GET',
  emits: [],
  flows: ['github-stars-video'],
  responseSchema,
};

export const handler: Handlers['GetJobStatus'] = async (req, { logger, state }) => {
  try {
    const { jobId } = req.pathParams;
    
    logger.info('Fetching job status', { jobId });

    const job = await state.get('job', jobId);

    if (!job) {
      return {
        status: 404,
        body: { error: 'Job not found' },
      };
    }

    return {
      status: 200,
      body: job,
    };
  } catch (error: any) {
    logger.error('Failed to get job status', { error: error.message });

    return {
      status: 404,
      body: { error: 'Job not found' },
    };
  }
};

