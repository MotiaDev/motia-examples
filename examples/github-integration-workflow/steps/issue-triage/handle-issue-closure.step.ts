import { EventConfig, StepHandler } from '@motiadev/core'
import { z } from 'zod'
import { GithubClient } from '../../services/github/GithubClient'
import { GithubIssueEvent } from '../../types/github-events'

const closureSchema = z.object({
  issueNumber: z.number(),
  owner: z.string(),
  repo: z.string(),
})

export const config: EventConfig<typeof closureSchema> = {
  type: 'event',
  name: 'Issue Closure Handler',
  description: 'Processes closed issues by adding closure labels and thank you comment',
  subscribes: [GithubIssueEvent.Closed],
  emits: [{
    type: GithubIssueEvent.Archived,
    label: 'Issue archived'
  }],
  input: closureSchema,
  flows: ['github-issue-management'],
}

export const handler: StepHandler<typeof config> = async (input, { emit, logger }) => {
  const github = new GithubClient()
  
  logger.info('[Issue Closure Handler] Processing issue closure', {
    issueNumber: input.issueNumber,
  })

  try {
    // Add closure comment
    await github.createComment(
      input.owner,
      input.repo,
      input.issueNumber,
      '🔒 This issue has been closed. Thank you for your contribution!'
    )

    // Add closed label
    await github.addLabels(
      input.owner,
      input.repo,
      input.issueNumber,
      ['closed']
    )

    await emit({
      type: GithubIssueEvent.Archived,
      data: {
        issueNumber: input.issueNumber,
        status: 'closed',
      },
    })
  } catch (error) {
    logger.error('[Issue Closure Handler] Error processing closure', {
      error,
      issueNumber: input.issueNumber,
    })
  }
} 