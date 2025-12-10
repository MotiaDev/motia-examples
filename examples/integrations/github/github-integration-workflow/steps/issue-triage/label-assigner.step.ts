import { z } from 'zod'
import { GithubClient } from '../../services/github/GithubClient'
import { GithubIssueEvent } from '../../types/github-events'
import type { EventConfig, Handlers } from 'motia'

const classifiedIssueSchema = z.object({
  issueNumber: z.number(),
  owner: z.string(),
  repo: z.string(),
  classification: z.object({
    type: z.enum(['bug', 'feature', 'question', 'documentation']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    complexity: z.enum(['simple', 'moderate', 'complex']),
  }),
})

export const config: EventConfig = {
  type: 'event',
  name: 'Label Assigner',
  description: 'Assigns labels based on issue classification',
  subscribes: [GithubIssueEvent.Classified],
  emits: [
    {
      topic: GithubIssueEvent.Labeled,
      label: 'Labels applied to issue',
    },
  ],
  input: classifiedIssueSchema,
  flows: ['github-issue-management'],
}

export const handler: Handlers['Label Assigner'] = async (input, { emit, logger }) => {
  const github = new GithubClient()

  logger.info('[Label Assigner] Assigning labels', {
    issueNumber: input.issueNumber,
    classification: input.classification,
  })

  try {
    const labels = [
      `type:${input.classification.type}`,
      `priority:${input.classification.priority}`,
      `complexity:${input.classification.complexity}`,
    ]

    await github.addLabels(input.owner, input.repo, input.issueNumber, labels)

    await emit({
      topic: GithubIssueEvent.Labeled,
      data: {
        ...input,
        labels,
      },
    })
  } catch (error) {
    logger.error('[Label Assigner] Failed to assign labels', {
      error,
      issueNumber: input.issueNumber,
    })
  }
}
