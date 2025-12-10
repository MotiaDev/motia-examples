import { ApiRouteConfig, StepHandler } from 'motia'
import { z } from 'zod'

const bodySchema = z.object({
    prompt: z.string(),
})

export const config: ApiRouteConfig = {
    type: 'api',
    name: 'generate image api trigger',
    description: 'generate an ai image given a prompt',
    path: '/generate-image',
    method: 'POST',
    emits: ['enhance-image-prompt'],
    bodySchema: bodySchema,
    flows: ['generate-image'],
}

export const handler: StepHandler<typeof config> = async (req, { logger, emit }) => {
    logger.info('initialized generate image flow')

    await emit({
        type: 'enhance-image-prompt',
        data: {
            prompt: req.body.prompt,
        },
    })

    return {
        status: 200,
        body: { message: `generate image flow initialized` },
    }
}