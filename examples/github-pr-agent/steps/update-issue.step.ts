import { ApiRouteConfig, StepHandler } from 'motia';
import { z } from 'zod';
import axios from 'axios';

const inputSchema = z.object({
  number: z.number(),
  body: z.string(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Update Issue',
  description: 'Updates the body/details of an issue in the configured GitHub repo',
  path: '/update-issue',
  method: 'POST',
  bodySchema: inputSchema,
  flows: ['default'],
  emits: [],
  virtualSubscribes: ['/update-issue'],
};

export const handler: StepHandler<typeof config> = async (input, { logger }) => {
  try {
    let issueNumber: number | undefined;
    let body: string | undefined;
    if (typeof input === 'object' && input !== null) {
      if (typeof (input as any).number === 'number') {
        issueNumber = (input as any).number;
      } else if (input.body && typeof input.body.number === 'number') {
        issueNumber = input.body.number;
      }
      if (typeof (input as any).body === 'string') {
        body = (input as any).body;
      } else if (input.body && typeof input.body.body === 'string') {
        body = input.body.body;
      }
    }
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    if (!repo || !token) {
      throw new Error('GITHUB_REPO or GITHUB_TOKEN not set in environment');
    }
    if (!issueNumber || !body) {
      throw new Error('Issue number and body are required');
    }
    const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;
    const response = await axios.patch(
      url,
      { body },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    logger.info(`Updated issue #${response.data.number}: ${response.data.title}`);
    return {
      status: 200,
      body: response.data,
    };
  } catch (error: any) {
    logger.error('Error updating issue:', error?.response?.data || error.message || error);
    return {
      status: 500,
      body: { error: error?.response?.data || error.message || 'Internal server error' },
    };
  }
}; 