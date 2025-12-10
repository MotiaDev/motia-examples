import { z } from 'zod'
import { OpenAIClient } from '../../services/openai/OpenAIClient'
import { GithubPREvent } from '../../types/github-events'
import type { EventConfig, Handlers } from 'motia'

const prSchema = z.object({
  prNumber: z.number(),
  title: z.string(),
  body: z.string().optional(),
  owner: z.string(),
  repo: z.string(),
  author: z.string(),
  baseBranch: z.string(),
  headBranch: z.string(),
  commitSha: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'PR Classifier',
  description: 'Uses LLM to classify PRs by type and impact',
  subscribes: [GithubPREvent.Opened],
  emits: [
    {
      topic: GithubPREvent.Classified,
      label: 'PR classification complete',
    },
  ],
  input: prSchema,
  flows: ['github-pr-management'],
}

export const handler: Handlers['PR Classifier'] = async (input, { emit, logger }) => {
  const openai = new OpenAIClient()

  logger.info('[PR Classifier] Analyzing PR', {
    prNumber: input.prNumber,
  })

  try {
    const classification = await openai.classifyPR(input.title, input.body || '')

    logger.info('[PR Classifier] Classification complete', {
      prNumber: input.prNumber,
      classification,
    })

    await emit({
      topic: GithubPREvent.Classified,
      data: {
        ...input,
        classification,
      },
    })
  } catch (error) {
    logger.error('[PR Classifier] Classification failed', {
      error,
      prNumber: input.prNumber,
    })
  }
}
