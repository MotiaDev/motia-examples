import { EventConfig, StepHandler } from 'motia'
import { GithubService } from '../services/github.service'
import { z } from 'zod'
import { GithubEventTopic } from '../types/github-events'

// type check
type Input = typeof inputSchema

// schema for event data
const inputSchema = z.object({
    body: z.string(),
    prNumber: z.number(),
    owner: z.string(),
    repo: z.string(),
    isSpam: z.boolean(),
    installationId: z.number(),
    recommendedAction: z.string()
})

// event config for closing pr
export const config: EventConfig<Input> = {
    type: 'event',
    name: 'PR close',
    description: 'Closes a spammy PR',
    subscribes: [GithubEventTopic.PR_COMMENTED],
    emits: [],
    input: inputSchema,
    flows: ['github-pr-agent'],
}

// handler to close spammy pr
export const handler: StepHandler<typeof config> = async (input, { logger }) => {

    logger.info(`received ${GithubEventTopic.PR_COMMENTED}event`, input)
    if (input.isSpam && input.recommendedAction === 'close') {
        const githubService = new GithubService()
        await githubService.closePullRequest(input.owner, input.repo, input.prNumber, input.installationId)
    }
    logger.info('Completed the PR closer step')
}
