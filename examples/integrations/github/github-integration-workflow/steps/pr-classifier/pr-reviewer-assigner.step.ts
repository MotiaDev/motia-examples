import { z } from 'zod'
import { GithubClient } from '../../services/github/GithubClient'
import { OpenAIClient } from '../../services/openai/OpenAIClient'
import { GithubPREvent } from '../../types/github-events'
import type { EventConfig, Handlers } from 'motia'

const TEAM_MEMBERS = [
  {
    login: 'frontend-dev',
    expertise: ['javascript', 'react', 'ui', 'frontend'],
  },
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

export const config: EventConfig = {
  type: 'event',
  name: 'PR Reviewer Assigner',
  description: 'Assigns appropriate reviewers based on PR content and team expertise',
  subscribes: [GithubPREvent.Classified],
  emits: [
    {
      topic: GithubPREvent.ReviewersAssigned,
      label: 'Reviewers assigned to PR',
    },
  ],
  input: classifiedPRSchema,
  flows: ['github-pr-management'],
}

export const handler: Handlers['PR Reviewer Assigner'] = async (input, { emit, logger }) => {
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

    if (suggestedReviewers.length > 0) {
      await github.requestReviews(input.owner, input.repo, input.prNumber, suggestedReviewers)

      await github.createComment(
        input.owner,
        input.repo,
        input.prNumber,
        `🔍 Based on the PR content and team expertise, I've requested reviews from: ${suggestedReviewers.map(r => `@${r}`).join(', ')}`
      )

      await emit({
        topic: GithubPREvent.ReviewersAssigned,
        data: {
          ...input,
          reviewers: suggestedReviewers,
        },
      })
    } else {
      logger.warn('[PR Reviewer Assigner] No suitable reviewers found', {
        prNumber: input.prNumber,
      })
    }
  } catch (error) {
    logger.error('[PR Reviewer Assigner] Failed to assign reviewers', {
      error,
      prNumber: input.prNumber,
    })
  }
}
