import { EventConfig, StepHandler } from '@motiadev/core'
import { z } from 'zod'
import { GithubClient } from '../../services/github/GithubClient'
import { OpenAIClient } from '../../services/openai/OpenAIClient'
import { GithubPREvent } from '../../types/github-events'

const TEAM_MEMBERS = [
  { login: 'frontend-dev', expertise: ['javascript', 'react', 'ui', 'frontend'] },
  { login: 'backend-dev', expertise: ['python', 'api', 'database', 'backend'] },
  { login: 'devops-eng', expertise: ['infrastructure', 'ci-cd', 'deployment'] },
]

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

export const config: EventConfig<typeof classifiedPRSchema> = {
  type: 'event',
  name: 'PR Reviewer Assigner',
  description: 'Assigns appropriate reviewers based on PR content and team expertise',
  subscribes: [GithubPREvent.Classified],
  emits: [{
    type: GithubPREvent.ReviewersAssigned,
    label: 'Reviewers assigned to PR'
  }],
  input: classifiedPRSchema,
  flows: ['github-pr-management'],
}

export const handler: StepHandler<typeof config> = async (input, { emit, logger }) => {
  const github = new GithubClient()
  const openai = new OpenAIClient()
  
  logger.info('[PR Reviewer Assigner] Finding reviewers', {
    prNumber: input.prNumber,
  })

  try {
    const suggestedReviewers = await openai.suggestReviewers(
      input.title,
      input.body || '',
      TEAM_MEMBERS,
      input.classification
    )

    // Request reviews
    await github.requestReviews(
      input.owner,
      input.repo,
      input.prNumber,
      suggestedReviewers
    )

    // Add comment explaining reviewer selection
    await github.createComment(
      input.owner,
      input.repo,
      input.prNumber,
      `🔍 Based on the PR content and team expertise, I've requested reviews from: ${suggestedReviewers.map((r: any) => `@${r}`).join(', ')}`
    )

    await emit({
      type: GithubPREvent.ReviewersAssigned,
      data: {
        ...input,
        reviewers: suggestedReviewers,
      },
    })
  } catch (error) {
    logger.error('[PR Reviewer Assigner] Failed to assign reviewers', {
      error,
      prNumber: input.prNumber,
    })
  }
} 