import { ApiRouteConfig, StepHandler } from 'motia'
import { z } from 'zod'
import fs from 'fs'

const bodySchema = z.object({})

export const config: ApiRouteConfig = {
    type: 'api',
    name: 'evaluate image generation flow results',
    description: 'initialize the evaluation agent, generate a new evaluation report from a dataset of image generation reports (created by the generate-image flow)',
    path: '/evaluate-image-generation-dataset',
    method: 'POST',
    emits: ['eval-image-generation-dataset'],
    bodySchema: bodySchema,
    flows: ['eval-agent'],
}

export const handler: StepHandler<typeof config> = async (req, { logger, emit }) => {
    logger.info('evaluate agent results')

    // Check for minimum number of report files
    const reportFiles = fs.readdirSync('tmp')
        .filter(file => file.endsWith('_report.txt'))

    if (reportFiles.length < 10) {
        return {
            status: 400,
            body: {message:`Insufficient number of report files. Found ${reportFiles.length}, but need at least 10 reports for an evaluation. Please run the generate-image flow first.`}
        }
    }

    await emit({
        type: 'eval-image-generation-dataset',
        data: {},
    })

    return {
        status: 200,
        body: { message: `evaluate image generation flow results` },
    }
}