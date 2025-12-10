import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Response schema for review list
 */
const reviewListItemSchema = z.object({
  reviewId: z.string(),
  repository: z.string(),
  pullRequestNumber: z.number().nullable(),
  branch: z.string(),
  author: z.string(),
  status: z.string(),
  finalScore: z.number().optional(),
  recommendation: z.string().optional(),
  requestedAt: z.string(),
  completedAt: z.string().optional()
})

const reviewListResponseSchema = z.object({
  reviews: z.array(reviewListItemSchema),
  total: z.number()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListReviews',
  description: 'Lists all code reviews with optional filtering',
  path: '/reviews',
  method: 'GET',
  emits: [],
  flows: ['code-review-pipeline'],
  queryParams: [
    { name: 'repository', description: 'Filter by repository name' },
    { name: 'status', description: 'Filter by review status' },
    { name: 'limit', description: 'Maximum number of reviews to return' }
  ],
  responseSchema: {
    200: reviewListResponseSchema
  }
}

export const handler: Handlers['ListReviews'] = async (req, { logger, state }) => {
  const { repository, status, limit } = req.queryParams

  logger.info('Listing reviews', { repository, status, limit })

  try {
    // Get all reviews from state
    const allReviews = await state.getGroup<any>('reviews')

    // Filter reviews
    let filteredReviews = allReviews

    if (repository && typeof repository === 'string') {
      filteredReviews = filteredReviews.filter(r => 
        r.repository?.toLowerCase().includes(repository.toLowerCase())
      )
    }

    if (status && typeof status === 'string') {
      filteredReviews = filteredReviews.filter(r => r.status === status)
    }

    // Sort by requestedAt (newest first)
    filteredReviews.sort((a, b) => 
      new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime()
    )

    // Apply limit
    const maxLimit = limit ? Math.min(parseInt(limit as string, 10), 100) : 50
    const limitedReviews = filteredReviews.slice(0, maxLimit)

    // Map to response format
    const reviews = limitedReviews.map(r => ({
      reviewId: r.reviewId,
      repository: r.repository,
      pullRequestNumber: r.pullRequestNumber,
      branch: r.branch,
      author: r.author,
      status: r.status,
      finalScore: r.finalScore,
      recommendation: r.recommendation,
      requestedAt: r.requestedAt,
      completedAt: r.completedAt
    }))

    return {
      status: 200,
      body: {
        reviews,
        total: filteredReviews.length
      }
    }
  } catch (error) {
    logger.error('Failed to list reviews', { error: String(error) })
    return {
      status: 200,
      body: {
        reviews: [],
        total: 0
      }
    }
  }
}

