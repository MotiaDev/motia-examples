import { ApiRouteConfig, StepHandler } from 'motia';
import { z } from 'zod';
import axios from 'axios'; // @ts-ignore: If using TS strict mode, install @types/axios

const inputSchema = z.object({});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'List PRs',
  description: 'Lists open PRs from the configured GitHub repo',
  path: '/list-prs',
  method: 'GET',
  bodySchema: inputSchema,
  flows: ['default'],
  emits: [],
  virtualSubscribes: ['/triage-pr'],
};

export const handler: StepHandler<typeof config> = async (_input, { logger }) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    if (!repo || !token) {
      throw new Error('GITHUB_REPO or GITHUB_TOKEN not set in environment');
    }
    const url = `https://api.github.com/repos/${repo}/pulls`;
    const response = await axios.get(url, {
      headers: { Authorization: `token ${token}` },
    });
    const prs = response.data;
    logger.info(`Found ${prs.length} open PRs:`);
    prs.forEach((pr: any) => logger.info(`- #${pr.number}: ${pr.title}`));
    return {
      status: 200,
      body: { count: prs.length, prs: prs.map((pr: any) => ({ number: pr.number, title: pr.title })) },
    };
  } catch (error: any) {
    logger.error('Error listing PRs:', error?.response?.data || error.message || error);
    return {
      status: 500,
      body: { error: error?.response?.data || error.message || 'Internal server error' },
    };
  }
};
