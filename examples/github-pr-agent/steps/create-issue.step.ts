import { ApiRouteConfig, StepHandler } from 'motia';
import { z } from 'zod';
import axios from 'axios';

const inputSchema = z.object({
  title: z.string(),
  body: z.string().optional(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Create Issue',
  description: 'Creates a new issue in the configured GitHub repo',
  path: '/create-issue',
  method: 'POST',
  bodySchema: inputSchema,
  flows: ['default'],
  emits: [],
  virtualSubscribes: ['/create-issue'],
};

export const handler: StepHandler<typeof config> = async (input, { logger }) => {
  try {
    let title: string | undefined;
    let body: string | undefined;
    let labels: string[] | undefined;
    let assignees: string[] | undefined;
    if (typeof input === 'object' && input !== null) {
      if (typeof (input as any).title === 'string') {
        title = (input as any).title;
      } else if (input.body && typeof input.body.title === 'string') {
        title = input.body.title;
      }
      if (typeof (input as any).body === 'string') {
        body = (input as any).body;
      } else if (input.body && typeof input.body.body === 'string') {
        body = input.body.body;
      }
      if (Array.isArray((input as any).labels)) {
        labels = (input as any).labels;
      } else if (input.body && Array.isArray(input.body.labels)) {
        labels = input.body.labels;
      }
      if (Array.isArray((input as any).assignees)) {
        assignees = (input as any).assignees;
      } else if (input.body && Array.isArray(input.body.assignees)) {
        assignees = input.body.assignees;
      }
    }
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    if (!repo || !token) {
      throw new Error('GITHUB_REPO or GITHUB_TOKEN not set in environment');
    }
    if (!title) {
      throw new Error('Issue title is required');
    }
    const url = `https://api.github.com/repos/${repo}/issues`;
    const response = await axios.post(
      url,
      { title, body, labels: labels || undefined, assignees: assignees || undefined },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    logger.info(`Created issue #${response.data.number}: ${response.data.title}`);
    return {
      status: 201,
      body: response.data,
    };
  } catch (error: any) {
    logger.error('Error creating issue:', error?.response?.data || error.message || error);
    return {
      status: 500,
      body: { error: error?.response?.data || error.message || 'Internal server error' },
    };
  }
}; 