import { z } from 'zod'
import { GithubClient } from '../../services/github/GithubClient'
import { GithubIssueEvent } from '../../types/github-events'
import type { EventConfig, Handlers } from 'motia'

const issueSchema = z.object({
  issueNumber: z.number(),
  title: z.string(),
  body: z.string().optional(),
  owner: z.string(),
  repo: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'New Issue Handler',
  description: 'Processes newly created issues by adding initial labels and welcome comment',
  subscribes: [GithubIssueEvent.Opened],
  emits: [
    {
      topic: GithubIssueEvent.Processed,
      label: 'Initial processing complete',
    },
  ],
  input: issueSchema,
  flows: ['github-issue-management'],
}

export const handler: Handlers['New Issue Handler'] = async (input, { emit, logger }) => {
  const github = new GithubClient()

  logger.info('[New Issue Handler] Processing new issue', {
    issueNumber: input.issueNumber,
  })

  try {
    await github.addLabels(input.owner, input.repo, input.issueNumber, ['triage-needed'])

    await github.createComment(
      input.owner,
      input.repo,
      input.issueNumber,
      '👋 Thanks for opening this issue! Our team will review it shortly.'
    )

    await emit({
      topic: GithubIssueEvent.Processed,
      data: {
        ...input,
        status: 'triaged',
      },
    })
  } catch (error) {
    logger.error('[New Issue Handler] Error processing issue', {
      error,
      issueNumber: input.issueNumber,
    })
  }
}
