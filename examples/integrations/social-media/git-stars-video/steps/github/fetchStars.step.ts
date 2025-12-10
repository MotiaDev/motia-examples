import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  owner: z.string().min(1, "Repository owner cannot be empty"),
  repo: z.string().min(1, "Repository name cannot be empty"),
  theme: z.enum(['dark', 'light']).optional().default('dark'),
});

const responseSchema = {
  200: z.object({
    success: z.boolean(),
    message: z.string(),
    jobId: z.string(),
  }),
  400: z.object({ 
    error: z.string() 
  }),
  500: z.object({ 
    error: z.string() 
  }),
};

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'FetchGitHubStars',
  description: 'Fetches GitHub star history for a given repository',
  path: '/api/github/stars',
  method: 'POST',
  emits: ['process-github-stars'],
  flows: ['github-stars-video'],
  bodySchema,
  responseSchema,
};

export const handler: Handlers['FetchGitHubStars'] = async (req, { emit, logger, state }) => {
  try {
    const { owner, repo, theme } = bodySchema.parse(req.body);
    
    logger.info('Fetching GitHub stars', { owner, repo, theme });

    // Generate a unique job ID for this request
    const jobId = `${owner}-${repo}-${Date.now()}`;
    
    // Store initial job status
    await state.set('job', jobId, {
      status: 'pending',
      owner,
      repo,
      createdAt: new Date().toISOString(),
    });

    // Emit event to process the star data in background
    await emit({
      topic: 'process-github-stars',
      data: {
        owner,
        repo,
        jobId,
        theme,
      },
    });

    logger.info('Star fetch job initiated', { jobId });

    return {
      status: 200,
      body: {
        success: true,
        message: 'Star fetch job initiated successfully',
        jobId,
      },
    };
  } catch (error: any) {
    logger.error('Failed to initiate star fetch', { error: error.message });
    
    if (error.name === 'ZodError') {
      return {
        status: 400,
        body: { error: 'Invalid request body' },
      };
    }

    return {
      status: 500,
      body: { error: 'Internal server error' },
    };
  }
};

