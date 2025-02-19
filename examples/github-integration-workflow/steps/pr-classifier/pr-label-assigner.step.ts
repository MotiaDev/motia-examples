import { EventConfig, StepHandler } from '@motiadev/core';
import { z } from 'zod';
import { GithubClient } from '../../services/github/GithubClient';
import { GithubPREvent } from '../../types/github-events';

const classifiedPRSchema = z.object({
  prNumber: z.number(),
  title: z.string(),
  body: z.string().optional(),
  owner: z.string(),
  repo: z.string(),
  author: z.string(),
  classification: z.object({
    type: z.enum(['bug-fix', 'feature', 'documentation', 'refactor']),
    impact: z.enum(['low', 'medium', 'high']),
    areas: z.array(z.string()),
  }),
});

export const config: EventConfig<typeof classifiedPRSchema> = {
  type: 'event',
  name: 'PR Label Assigner',
  description: 'Assigns labels to PRs based on LLM classification',
  subscribes: [GithubPREvent.Classified],
  emits: [{
    type: GithubPREvent.Labeled,
    label: 'Labels applied to PR'
  }],
  input: classifiedPRSchema,
  flows: ['github-pr-management'],
};

export const handler: StepHandler<typeof config> = async (input, { emit, logger }) => {
  const github = new GithubClient();
  
  logger.info('[PR Label Assigner] Assigning labels', {
    prNumber: input.prNumber,
    classification: input.classification,
  });

  try {
    const labels = [
      `type:${input.classification.type}`,
      `impact:${input.classification.impact}`,
      ...input.classification.areas.map(area => `area:${area}`),
    ];

    await github.addLabels(
      input.owner,
      input.repo,
      input.prNumber,
      labels
    );

    await github.createComment(
      input.owner,
      input.repo,
      input.prNumber,
      `🏷️ Based on the PR analysis, I've added the following labels:\n${labels.map(l => `- \`${l}\``).join('\n')}`
    );

    await emit({
      type: GithubPREvent.Labeled,
      data: {
        ...input,
        labels,
      },
    });
  } catch (error) {
    logger.error('[PR Label Assigner] Failed to assign labels', {
      error,
      prNumber: input.prNumber,
    });
  }
};