import { z } from 'zod'
import { GithubClient } from '../../services/github/GithubClient'
import { GithubPREvent } from '../../types/github-events'
import type { EventConfig, Handlers } from 'motia'

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
})

export const config: EventConfig = {
  type: 'event',
  name: 'PR Label Assigner',
  description: 'Assigns labels to PRs based on LLM classification',
  subscribes: [GithubPREvent.Classified],
  emits: [
    {
      topic: GithubPREvent.Labeled,
      label: 'Labels applied to PR',
    },
  ],
  input: classifiedPRSchema,
  flows: ['github-pr-management'],
}

export const handler: Handlers['PR Label Assigner'] = async (input, { emit, logger }) => {
  const github = new GithubClient()

  logger.info('[PR Label Assigner] Assigning labels', {
    prNumber: input.prNumber,
    classification: input.classification,
  })

  try {
    const labels = [
      `type:${input.classification.type}`,
      `impact:${input.classification.impact}`,
      ...input.classification.areas.map((area: string) => `area:${area}`),
    ]

    await github.addLabels(input.owner, input.repo, input.prNumber, labels)

    await github.createComment(
      input.owner,
      input.repo,
      input.prNumber,
      `🏷️ Based on the PR analysis, I've added the following labels:\n${labels.map(l => `- \`${l}\``).join('\n')}`
    )

    await emit({
      topic: GithubPREvent.Labeled,
      data: {
        ...input,
        labels,
      },
    })
  } catch (error) {
    logger.error('[PR Label Assigner] Failed to assign labels', {
      error,
      prNumber: input.prNumber,
    })
  }
}
