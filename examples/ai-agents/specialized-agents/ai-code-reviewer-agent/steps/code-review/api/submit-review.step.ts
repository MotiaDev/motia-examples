import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import crypto from 'crypto'

/**
 * Schema for GitHub webhook payload (simplified for PR events)
 */
const githubWebhookSchema = z.object({
  action: z.string().optional(),
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    head: z.object({
      ref: z.string(),
      sha: z.string()
    }),
    base: z.object({
      ref: z.string()
    }),
    user: z.object({
      login: z.string()
    }),
    diff_url: z.string(),
    html_url: z.string()
  }).optional(),
  repository: z.object({
    full_name: z.string(),
    name: z.string(),
    owner: z.object({
      login: z.string()
    }),
    private: z.boolean()
  }),
  sender: z.object({
    login: z.string()
  }),
  // For direct API submissions
  diff: z.string().optional(),
  commit_sha: z.string().optional(),
  branch: z.string().optional()
})

const responseSchema = z.object({
  reviewId: z.string(),
  status: z.string(),
  message: z.string(),
  streamUrl: z.string()
})

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'SubmitReview',
  description: 'Receives GitHub webhook or direct API call to trigger code review',
  path: '/reviews/submit',
  method: 'POST',
  emits: ['code_review.requested'],
  virtualEmits: [{ topic: 'review.pipeline.start', label: 'Starts Review Pipeline' }],
  flows: ['code-review-pipeline'],
  bodySchema: githubWebhookSchema,
  responseSchema: {
    202: responseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema
  }
}

export const handler: Handlers['SubmitReview'] = async (req, { emit, logger, state, streams }) => {
  const startTime = Date.now()
  
  try {
    // Validate GitHub webhook signature if present
    const signature = req.headers['x-hub-signature-256']
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
    
    if (signature && webhookSecret) {
      const payload = JSON.stringify(req.body)
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex')}`
      
      if (signature !== expectedSignature) {
        logger.warn('Invalid webhook signature', { signature })
        return {
          status: 401,
          body: { error: 'Invalid webhook signature', code: 'INVALID_SIGNATURE' }
        }
      }
    }

    const body = req.body
    const reviewId = crypto.randomUUID()
    
    // Extract review context
    let reviewContext: {
      reviewId: string
      repository: string
      repositoryOwner: string
      pullRequestNumber: number | null
      title: string
      branch: string
      baseBranch: string
      commitSha: string
      diffUrl: string | null
      diff: string | null
      author: string
      htmlUrl: string
      description: string | null
      requestedAt: string
    }

    if (body.pull_request) {
      // GitHub webhook format
      reviewContext = {
        reviewId,
        repository: body.repository.full_name,
        repositoryOwner: body.repository.owner.login,
        pullRequestNumber: body.pull_request.number,
        title: body.pull_request.title,
        branch: body.pull_request.head.ref,
        baseBranch: body.pull_request.base.ref,
        commitSha: body.pull_request.head.sha,
        diffUrl: body.pull_request.diff_url,
        diff: null,
        author: body.pull_request.user.login,
        htmlUrl: body.pull_request.html_url,
        description: body.pull_request.body,
        requestedAt: new Date().toISOString()
      }
    } else if (body.diff) {
      // Direct API submission format
      reviewContext = {
        reviewId,
        repository: body.repository.full_name,
        repositoryOwner: body.repository.owner.login,
        pullRequestNumber: null,
        title: `Review for ${body.branch || 'commit'}`,
        branch: body.branch || 'unknown',
        baseBranch: 'main',
        commitSha: body.commit_sha || 'unknown',
        diffUrl: null,
        diff: body.diff,
        author: body.sender.login,
        htmlUrl: `https://github.com/${body.repository.full_name}`,
        description: null,
        requestedAt: new Date().toISOString()
      }
    } else {
      return {
        status: 400,
        body: { error: 'Missing pull_request or diff in payload', code: 'INVALID_PAYLOAD' }
      }
    }

    logger.info('Code review requested', {
      reviewId,
      repository: reviewContext.repository,
      pullRequest: reviewContext.pullRequestNumber,
      author: reviewContext.author
    })

    // Store review context in state
    await state.set('reviews', reviewId, {
      ...reviewContext,
      status: 'submitted',
      stages: {
        submitted: { timestamp: new Date().toISOString() }
      }
    })

    // Initialize real-time progress stream
    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'submitted',
      message: 'Code review request received. Starting multi-agent analysis pipeline...',
      timestamp: new Date().toISOString(),
      metadata: {
        repository: reviewContext.repository,
        pullRequest: reviewContext.pullRequestNumber || undefined,
        branch: reviewContext.branch,
        progress: 5,
        currentAgent: 'Orchestrator'
      }
    })

    // Emit event to start the review pipeline
    await emit({
      topic: 'code_review.requested',
      data: {
        reviewId,
        repository: reviewContext.repository,
        repositoryOwner: reviewContext.repositoryOwner,
        pullRequestNumber: reviewContext.pullRequestNumber,
        commitSha: reviewContext.commitSha,
        branch: reviewContext.branch
      }
    })

    const processingTime = Date.now() - startTime
    logger.info('Review submission processed', { reviewId, processingTime })

    return {
      status: 202,
      body: {
        reviewId,
        status: 'submitted',
        message: 'Code review initiated. Subscribe to stream for real-time updates.',
        streamUrl: `/streams/reviewProgress/${reviewId}`
      }
    }
  } catch (error) {
    logger.error('Failed to process review submission', { error: String(error) })
    return {
      status: 400,
      body: { error: 'Failed to process review request', code: 'PROCESSING_ERROR' }
    }
  }
}

