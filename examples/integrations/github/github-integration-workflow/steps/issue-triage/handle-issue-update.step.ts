import { z } from 'zod'
import { GithubClient } from '../../services/github/GithubClient'
import { GithubIssueEvent } from '../../types/github-events'
import type { EventConfig, Handlers } from 'motia'

const updateSchema = z.object({
  issueNumber: z.number(),
  title: z.string(),
  body: z.string().optional(),
  owner: z.string(),
  repo: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'Issue Update Handler',
  description: 'Handles issue updates by notifying reviewers of changes',
  subscribes: [GithubIssueEvent.Edited],
  emits: [
    {
      topic: GithubIssueEvent.Updated,
      label: 'Update processed',
    },
  ],
  input: updateSchema,
  flows: ['github-issue-management'],
}

export const handler: Handlers['Issue Update Handler'] = async (input, { emit, logger }) => {
  const github = new GithubClient()

  logger.info('[Issue Update Handler] Processing issue update', {
    issueNumber: input.issueNumber,
  })

  try {
    await github.createComment(
      input.owner,
      input.repo,
      input.issueNumber,
      '📝 This issue has been updated. Our team will review the changes.'
    )

    await emit({
      topic: GithubIssueEvent.Updated,
      data: {
        issueNumber: input.issueNumber,
        status: 'updated',
      },
    })
  } catch (error) {
    logger.error('[Issue Update Handler] Error processing update', {
      error,
      issueNumber: input.issueNumber,
    })
  }
}
