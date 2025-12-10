import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Response schema for review details
 */
const reviewResponseSchema = z.object({
  reviewId: z.string(),
  repository: z.string(),
  pullRequestNumber: z.number().nullable(),
  branch: z.string(),
  author: z.string(),
  status: z.string(),
  finalScore: z.number().optional(),
  recommendation: z.string().optional(),
  requestedAt: z.string(),
  completedAt: z.string().optional(),
  stages: z.record(z.string(), z.object({
    timestamp: z.string()
  })),
  draft: z.any().optional(),
  critique: z.any().optional(),
  refined: z.any().optional()
})

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetReview',
  description: 'Retrieves detailed review information including all stages of the reflection pipeline',
  path: '/reviews/:reviewId',
  method: 'GET',
  emits: [],
  virtualSubscribes: ['review.pipeline.start'],
  flows: ['code-review-pipeline'],
  queryParams: [
    { name: 'includeArtifacts', description: 'Include draft, critique, and refined review artifacts' }
  ],
  responseSchema: {
    200: reviewResponseSchema,
    404: errorResponseSchema
  }
}

export const handler: Handlers['GetReview'] = async (req, { logger, state }) => {
  const { reviewId } = req.pathParams
  const includeArtifacts = req.queryParams.includeArtifacts === 'true'

  logger.info('Fetching review', { reviewId, includeArtifacts })

  try {
    const review = await state.get<any>('reviews', reviewId)

    if (!review) {
      return {
        status: 404,
        body: { error: 'Review not found', code: 'NOT_FOUND' }
      }
    }

    const response: any = {
      reviewId: review.reviewId,
      repository: review.repository,
      pullRequestNumber: review.pullRequestNumber,
      branch: review.branch,
      author: review.author,
      status: review.status,
      finalScore: review.finalScore,
      recommendation: review.recommendation,
      requestedAt: review.requestedAt,
      completedAt: review.completedAt,
      stages: review.stages
    }

    if (includeArtifacts) {
      response.draft = await state.get('drafts', reviewId)
      response.critique = await state.get('critiques', reviewId)
      response.refined = await state.get('refined', reviewId)
    }

    return {
      status: 200,
      body: response
    }
  } catch (error) {
    logger.error('Failed to fetch review', { reviewId, error: String(error) })
    return {
      status: 404,
      body: { error: 'Failed to fetch review', code: 'FETCH_ERROR' }
    }
  }
}

