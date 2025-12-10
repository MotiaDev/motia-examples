import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const responseSchema = {
  200: z.object({
    repository: z.object({
      name: z.string(),
      full_name: z.string(),
      description: z.string().nullable(),
      total_stars: z.number(),
      forks: z.number(),
      created_at: z.string(),
      owner: z.object({
        login: z.string(),
        avatar_url: z.string(),
      }),
    }),
    stars: z.object({
      total: z.number(),
      timeline: z.array(z.object({
        date: z.string(),
        count: z.number(),
        cumulative: z.number(),
      })),
      recent: z.array(z.object({
        user: z.string(),
        avatar_url: z.string(),
        starred_at: z.string(),
      })),
    }),
    generatedAt: z.string(),
  }),
  404: z.object({ 
    error: z.string() 
  }),
};

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetStarsData',
  description: 'Gets the cached star data for a repository',
  path: '/api/github/stars/:owner/:repo',
  method: 'GET',
  emits: [],
  flows: ['github-stars-video'],
  responseSchema,
};

export const handler: Handlers['GetStarsData'] = async (req, { logger, state }) => {
  try {
    const { owner, repo } = req.pathParams;
    
    logger.info('Fetching cached stars data', { owner, repo });

    const data = await state.get('stars', `${owner}:${repo}`);

    if (!data) {
      return {
        status: 404,
        body: { error: 'No data found for this repository' },
      };
    }

    return {
      status: 200,
      body: data,
    };
  } catch (error: any) {
    logger.error('Failed to get stars data', { error: error.message });

    return {
      status: 404,
      body: { error: 'No data found for this repository' },
    };
  }
};

