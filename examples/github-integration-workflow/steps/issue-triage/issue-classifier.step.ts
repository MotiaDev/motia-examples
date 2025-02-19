import { EventConfig, StepHandler } from '@motiadev/core'
import { z } from 'zod'
import { OpenAIClient } from '../../services/openai/OpenAIClient'
import { GithubIssueEvent } from '../../types/github-events'

const issueSchema = z.object({
  issueNumber: z.number(),
  title: z.string(),
  body: z.string().optional(),
  owner: z.string(),
  repo: z.string(),
})

export const config: EventConfig<typeof issueSchema> = {
  type: 'event',
  name: 'Issue Classifier',
  description: 'Uses LLM to classify GitHub issues',
  subscribes: [GithubIssueEvent.Processed],
  emits: [{
    type: GithubIssueEvent.Classified,
    label: 'Classification complete'
  }],
  input: issueSchema,
  flows: ['github-issue-management'],
}

export const handler: StepHandler<typeof config> = async (input, { emit, logger }) => {
  const openai = new OpenAIClient()
  
  logger.info('[Issue Classifier] Analyzing issue', {
    issueNumber: input.issueNumber,
  })

  try {
    const classification = await openai.classifyIssue(
      input.title,
      input.body || ''
    )

    logger.info('[Issue Classifier] Classification complete', {
      issueNumber: input.issueNumber,
      classification,
    })

    await emit({
      type: GithubIssueEvent.Classified,
      data: {
        ...input,
        classification,
      },
    })
  } catch (error) {
    logger.error('[Issue Classifier] Classification failed', {
      error,
      issueNumber: input.issueNumber,
    })
  }
} 