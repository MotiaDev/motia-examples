import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
    url: z.url('Invalid landing page URL'),
    options: z.object({
        instagram: z.object({
            enabled: z.boolean(),
            count: z.number().min(1).max(10).default(1),
        }).optional(),
        tiktok: z.object({
            enabled: z.boolean(),
            count: z.number().min(1).max(5).default(1),
            mode: z.enum(['text-to-video', 'reference-images', 'interpolation', 'extension']).default('reference-images'),
        }).optional(),
    }),
});

export const config: ApiRouteConfig = {
    type: 'api',
    name: 'GenerateAd',
    description: 'Generate social media ads from landing page URL',
    method: 'POST',
    path: '/api/generate-ad',
    bodySchema,
    responseSchema: {
        200: z.object({
            jobId: z.string(),
            status: z.literal('processing'),
        }),
        400: z.object({ error: z.string() }),
    },
    emits: ['ad.generation.started'],
    flows: ['ad-generation'],
};

export const handler: Handlers['GenerateAd'] = async (req, { emit, logger, traceId }) => {
    try {
        const { url, options } = req.body;

        // Validate at least one option is enabled
        const hasInstagram = options.instagram?.enabled;
        const hasTiktok = options.tiktok?.enabled;

        if (!hasInstagram && !hasTiktok) {
            return {
                status: 400,
                body: { error: 'At least one ad type (Instagram or TikTok) must be enabled' },
            };
        }

        // Generate job ID
        const jobId = crypto.randomUUID();

        logger.info('Ad generation request received', {
            jobId,
            url,
            instagram: hasInstagram ? options.instagram?.count : 0,
            tiktok: hasTiktok ? options.tiktok?.count : 0,
            traceId,
        });

        // Emit event to start generation
        await emit({
            topic: 'ad.generation.started',
            data: {
                jobId,
                url,
                options,
                requestedAt: new Date().toISOString(),
            },
        });

        return {
            status: 200,
            body: {
                jobId,
                status: 'processing',
            },
        };
    } catch (error: any) {
        logger.error('Ad generation request failed', {
            error: error.message,
            traceId,
        });

        return {
            status: 400,
            body: { error: error.message || 'Invalid request' },
        };
    }
};