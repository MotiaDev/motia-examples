import { ApiRouteConfig, StepHandler } from 'motia';
import { z } from 'zod';
import axios from 'axios';

const inputSchema = z.object({
  number: z.number(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Triage PR',
  description: 'Performs smart triage: fetches PR details, auto-labels, assigns reviewers, and posts a triage comment',
  path: '/triage-pr',
  method: 'POST',
  bodySchema: inputSchema,
  flows: ['default'],
  emits: [],
  virtualSubscribes: ['/triage-pr'],
  virtualEmits: [
    { topic: '/label-pr', label: 'Label PR' },
    { topic: '/auto-assign-reviewers', label: 'Auto Assign Reviewers' },
    { topic: '/comment-pr', label: 'Comment PR' },
  ],
};

export const handler: StepHandler<typeof config> = async (input, { logger, emit }) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    let prNumber: number | undefined;
    if (typeof input === 'object' && input !== null) {
      if (typeof (input as any).number === 'number') {
        prNumber = (input as any).number;
      } else if (input.body && typeof input.body.number === 'number') {
        prNumber = input.body.number;
      }
    }
    if (!repo || !token) throw new Error('GITHUB_REPO or GITHUB_TOKEN not set in environment');
    if (!prNumber) throw new Error('PR number is required');

    // 1. Fetch PR details
    const prDetailsResp = await axios.get(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, {
      headers: { Authorization: `token ${token}` },
    });
    const pr = prDetailsResp.data;

    // 2. Analyze PR content (simple demo: label as 'bug' if title/body contains 'fix', else 'feature')
    const labels = [];
    const title = pr.title?.toLowerCase() || '';
    const body = pr.body?.toLowerCase() || '';
    if (title.includes('fix') || body.includes('fix')) {
      labels.push('bug');
    } else if (title.includes('feature') || body.includes('feature')) {
      labels.push('feature');
    } else {
      labels.push('needs-review');
    }
    // Always add 'code-changes' for demo
    labels.push('code-changes');

    // 3. Auto-label the PR
    await axios.post(`http://localhost:3000/label-pr`, {
      number: prNumber,
      labels,
      labelColors: {
        'needs-review': '#00ff00',
        'code-changes': '#0000ff',
        'bug': '#d73a4a',
        'feature': '#a2eeef',
      },
    });

    // 4. Auto-assign reviewers
    await axios.post(`http://localhost:3000/auto-assign-reviewers`, {
      number: prNumber,
    });

    // 5. Post a triage comment
    const commentBody = `🤖 PR triaged!\n\n**Labels:** ${labels.join(', ')}\n**Auto-assigned reviewers.**`;
    await axios.post(`https://api.github.com/repos/${repo}/issues/${prNumber}/comments`, {
      body: commentBody,
    }, {
      headers: { Authorization: `token ${token}` },
    });

    logger.info(`Triage complete for PR #${prNumber}`);
    // Emit pr_labeled event
    await emit({
      topic: 'pr_labeled',
      data: { number: prNumber, labels },
    });
    return {
      status: 200,
      body: { message: 'Triage complete', labels },
    };
  } catch (error: any) {
    logger.error('Error in triage-pr:', error?.response?.data || error.message || error);
    return {
      status: 500,
      body: { error: error?.response?.data || error.message || 'Internal server error' },
    };
  }
}; 