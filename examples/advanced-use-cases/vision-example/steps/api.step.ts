import { api, Handlers, StepConfig } from 'motia'
import { z } from 'zod'

const bodySchema = z.object({
    prompt: z.string(),
})

export const config = {
    name: 'generate image api trigger',
    description: 'generate an ai image given a prompt',
    triggers: [
        api('POST', '/generate-image', {
            bodySchema: bodySchema,
        }),
    ],
    enqueues: ['enhance-image-prompt'],
    flows: ['generate-image'],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async (req, { logger, enqueue }) => {
    logger.info('initialized generate image flow')

    await enqueue({
        topic: 'enhance-image-prompt',
        data: {
            prompt: req.body.prompt,
        },
    })

    return {
        status: 200,
        body: { message: `generate image flow initialized` },
    }
}