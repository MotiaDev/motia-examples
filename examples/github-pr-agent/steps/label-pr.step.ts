import { ApiRouteConfig, StepHandler } from 'motia';
import { z } from 'zod';
import axios from 'axios';

const inputSchema = z.object({
  number: z.number(),
  labels: z.array(z.string()),
  labelColors: z.record(z.string()).optional(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Label PR',
  description: 'Adds labels to a specific PR',
  path: '/label-pr',
  method: 'POST',
  bodySchema: inputSchema,
  flows: ['default'],
  emits: [],
  virtualSubscribes: ['/label-pr'],
};

export const handler: StepHandler<typeof config> = async (input, { logger }) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    let prNumber: number | undefined;
    let labels: string[] | undefined;
    let labelColors: Record<string, string> | undefined;

    if (typeof input === 'object' && input !== null) {
      if (typeof (input as any).number === 'number') {
        prNumber = (input as any).number;
      } else if (input.body && typeof input.body.number === 'number') {
        prNumber = input.body.number;
      }
      if (Array.isArray((input as any).labels)) {
        labels = (input as any).labels;
      } else if (input.body && Array.isArray(input.body.labels)) {
        labels = input.body.labels;
      }
      if (typeof (input as any).labelColors === 'object') {
        labelColors = (input as any).labelColors;
      } else if (input.body && typeof input.body.labelColors === 'object') {
        labelColors = input.body.labelColors;
      }
    }

    if (!repo || !token) {
      throw new Error('GITHUB_REPO or GITHUB_TOKEN not set in environment');
    }
    if (!prNumber || !labels || labels.length === 0) {
      throw new Error('PR number and at least one label are required');
    }

    // Create labels with colors if specified
    if (labelColors) {
      for (const [label, color] of Object.entries(labelColors)) {
        try {
          await axios.post(
            `https://api.github.com/repos/${repo}/labels`,
            { name: label, color: color.replace('#', '') },
            {
              headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github+json',
              },
            }
          );
          logger.info(`Created label '${label}' with color ${color}`);
        } catch (error: any) {
          // If label already exists, ignore the error
          if (error?.response?.status !== 422) {
            logger.warn(`Failed to create label '${label}': ${error?.message || 'Unknown error'}`);
          }
        }
      }
    }

    // Apply labels to PR
    const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/labels`;
    const response = await axios.post(url, { labels }, {
      headers: { Authorization: `token ${token}` },
    });
    logger.info(`Added labels [${labels.join(', ')}] to PR #${prNumber}`);
    return {
      status: 200,
      body: response.data,
    };
  } catch (error: any) {
    logger.error('Error labeling PR:', error?.response?.data || error.message || error);
    return {
      status: 500,
      body: { error: error?.response?.data || error.message || 'Internal server error' },
    };
  }
}; 