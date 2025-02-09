import { ApiRouteConfig, StepHandler } from '@motiadev/core'
import { z } from 'zod'

const bodySchema = z.object({
    prompt: z.string(),
})

export const config: ApiRouteConfig = {
    type: 'api',
    name: 'evaluate agent results',
    description: 'evaluate the results of the agent',
    path: '/evaluate-agent-results',
    method: 'POST',
    emits: ['eval-agent-results'],
    bodySchema: bodySchema,
    flows: ['generate-image'],
}

export const handler: StepHandler<typeof config> = async (req, { logger, emit }) => {
    logger.info('evaluate agent results')

    await emit({
        type: 'eval-agent-results',
        data: {},
    })

    return {
        status: 200,
        body: { message: `evaluate agent results` },
    }
}