import { ApiRouteConfig, StepHandler } from 'motia';
import { z } from 'zod';
import axios from 'axios';

const inputSchema = z.object({
  number: z.number(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Get PR Details',
  description: 'Fetches details for a specific PR',
  path: '/get-pr-details',
  method: 'GET',
  bodySchema: inputSchema,
  flows: ['default'],
  emits: [],
};

export const handler: StepHandler<typeof config> = async (input, context) => {
  try {
    context.logger.info('Get PR Details input:', JSON.stringify(input));
    context.logger.info('Get PR Details context:', JSON.stringify(context));
    context.logger.info('Get PR Details context.query:', JSON.stringify((context as any).query));
    context.logger.info('Get PR Details context.body:', JSON.stringify((context as any).body));
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    if (!repo || !token) {
      throw new Error('GITHUB_REPO or GITHUB_TOKEN not set in environment');
    }
    // Try to extract number from various possible locations
    let prNumber: number | undefined;
    if (typeof input === 'object' && input !== null) {
      if (typeof (input as any).number === 'string') {
        prNumber = parseInt((input as any).number, 10);
      } else if (typeof (input as any).number === 'number') {
        prNumber = (input as any).number;
      } else if (
        input.queryParams &&
        typeof input.queryParams.number === 'string'
      ) {
        prNumber = parseInt(input.queryParams.number, 10);
      } else if (
        input.queryParams &&
        typeof input.queryParams.number === 'number'
      ) {
        prNumber = input.queryParams.number;
      }
    }
    // Try extracting from context.query if available
    if (!prNumber && context && typeof (context as any).query === 'object') {
      const q = (context as any).query;
      if (typeof q.number === 'string') {
        prNumber = parseInt(q.number, 10);
      } else if (typeof q.number === 'number') {
        prNumber = q.number;
      }
    }
    if (!prNumber || isNaN(prNumber)) {
      throw new Error('PR number is required and must be a valid number');
    }
    const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}`;
    const response = await axios.get(url, {
      headers: { Authorization: `token ${token}` },
    });
    context.logger.info(`Fetched PR #${prNumber}: ${response.data.title}`);
    return {
      status: 200,
      body: response.data,
    };
  } catch (error: any) {
    context.logger.error('Error fetching PR details:', error?.response?.data || error.message || error);
    return {
      status: 500,
      body: { error: error?.response?.data || error.message || 'Internal server error' },
    };
  }
}; 