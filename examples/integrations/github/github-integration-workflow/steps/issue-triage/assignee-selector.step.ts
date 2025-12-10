import { z } from 'zod'
import { GithubClient } from '../../services/github/GithubClient'
import { OpenAIClient } from '../../services/openai/OpenAIClient'
import { GithubIssueEvent } from '../../types/github-events'
import type { EventConfig, Handlers } from 'motia'

const TEAM_MEMBERS = [
  {
    login: 'frontend-team',
    expertise: ['javascript', 'react', 'ui', 'frontend'],
  },
  {
    login: 'backend-team',
    expertise: ['python', 'api', 'database', 'backend'],
  },
  {
    login: 'documentation-team',
    expertise: ['documentation', 'technical-writing'],
  },
]

const labeledIssueSchema = z.object({
  issueNumber: z.number(),
  title: z.string(),
  body: z.string().optional(),
  owner: z.string(),
  repo: z.string(),
  classification: z.object({
    type: z.enum(['bug', 'feature', 'question', 'documentation']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    complexity: z.enum(['simple', 'moderate', 'complex']),
  }),
  labels: z.array(z.string()),
})

export const config: EventConfig = {
  type: 'event',
  name: 'Assignee Selector',
  description: 'Uses LLM to select appropriate assignees for issues',
  subscribes: [GithubIssueEvent.Labeled],
  emits: [
    {
      topic: GithubIssueEvent.Assigned,
      label: 'Team members assigned',
    },
  ],
  input: labeledIssueSchema,
  flows: ['github-issue-management'],
}

export const handler: Handlers['Assignee Selector'] = async (input, { emit, logger }) => {
  const github = new GithubClient()
  const openai = new OpenAIClient()

  logger.info('[Assignee Selector] Finding suitable assignees', {
    issueNumber: input.issueNumber,
  })

  try {
    const suggestedAssignees = await openai.suggestAssignees(
      input.title,
      input.body || '',
      TEAM_MEMBERS
    )

    await github.updateIssue(input.owner, input.repo, input.issueNumber, {
      assignees: suggestedAssignees,
    })

    await github.createComment(
      input.owner,
      input.repo,
      input.issueNumber,
      `🤖 Based on the issue content and team expertise, I've assigned: ${suggestedAssignees.map(a => `@${a}`).join(', ')}`
    )

    await emit({
      topic: GithubIssueEvent.Assigned,
      data: {
        ...input,
        assignees: suggestedAssignees,
      },
    })
  } catch (error) {
    logger.error('[Assignee Selector] Failed to assign users', {
      error,
      issueNumber: input.issueNumber,
    })
  }
}
