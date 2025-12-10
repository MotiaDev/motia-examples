import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Input schema for GitHub feedback delivery
 */
const inputSchema = z.object({
  reviewId: z.string(),
  repository: z.string(),
  repositoryOwner: z.string(),
  pullRequestNumber: z.number().nullable(),
  commitSha: z.string(),
  overallScore: z.number(),
  recommendation: z.enum(['approve', 'request_changes', 'comment']),
  findingsCount: z.number()
})

export const config: EventConfig = {
  type: 'event',
  name: 'PostGitHubFeedback',
  description: 'Delivers review findings to GitHub as PR comments, inline suggestions, and commit status',
  subscribes: ['review.completed'],
  emits: [{ topic: 'review.notification', label: 'Trigger Notifications' }],
  virtualEmits: ['review.github_posted'],
  flows: ['code-review-pipeline'],
  input: inputSchema
}

export const handler: Handlers['PostGitHubFeedback'] = async (input, { emit, logger, state, streams }) => {
  const { reviewId, repository, repositoryOwner, pullRequestNumber, commitSha, overallScore, recommendation } = input
  const startTime = Date.now()

  logger.info('Posting feedback to GitHub', { reviewId, repository, pullRequestNumber })

  try {
    // Update progress stream
    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'posting_to_github',
      message: 'Posting review comments and inline suggestions to GitHub...',
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        pullRequest: pullRequestNumber || undefined,
        progress: 90,
        currentAgent: 'GitHub Delivery'
      }
    })

    // Fetch refined review from state
    const refinedReview = await state.get<any>('refined', reviewId)
    const reviewContext = await state.get<any>('reviews', reviewId)

    if (!refinedReview || !reviewContext) {
      throw new Error(`Review artifacts not found for ${reviewId}`)
    }

    const githubToken = process.env.GITHUB_TOKEN

    if (!githubToken) {
      logger.warn('GITHUB_TOKEN not configured, skipping GitHub posting')
    } else if (pullRequestNumber) {
      // Post PR review with inline comments
      await postPullRequestReview(
        repositoryOwner,
        repository.split('/')[1],
        pullRequestNumber,
        commitSha,
        refinedReview,
        githubToken,
        logger
      )

      // Set commit status
      await setCommitStatus(
        repositoryOwner,
        repository.split('/')[1],
        commitSha,
        overallScore,
        reviewId,
        githubToken,
        logger
      )
    }

    // Update review state
    await state.set('reviews', reviewId, {
      ...reviewContext,
      status: 'github_posted',
      stages: {
        ...reviewContext.stages,
        github_posted: { timestamp: new Date().toISOString() }
      }
    })

    // Store delivery record
    await state.set('deliveries', reviewId, {
      reviewId,
      deliveredAt: new Date().toISOString(),
      platform: 'github',
      pullRequestNumber,
      commitSha,
      success: true,
      processingTimeMs: Date.now() - startTime
    })

    logger.info('GitHub feedback posted successfully', {
      reviewId,
      pullRequestNumber,
      processingTimeMs: Date.now() - startTime
    })

    // Emit notification event
    await emit({
      topic: 'review.notification',
      data: {
        reviewId,
        repository,
        repositoryOwner,
        pullRequestNumber,
        commitSha,
        overallScore,
        recommendation,
        findingsCount: refinedReview.findings.length,
        author: reviewContext.author
      }
    })

  } catch (error) {
    logger.error('Failed to post GitHub feedback', { reviewId, error: String(error) })

    // Store failure record
    await state.set('deliveries', reviewId, {
      reviewId,
      deliveredAt: new Date().toISOString(),
      platform: 'github',
      pullRequestNumber,
      commitSha,
      success: false,
      error: String(error)
    })

    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'failed',
      message: `GitHub delivery error: ${String(error)}`,
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        currentAgent: 'GitHub Delivery'
      }
    })

    // Don't throw - continue to notification
    await emit({
      topic: 'review.notification',
      data: {
        reviewId,
        repository,
        repositoryOwner,
        pullRequestNumber,
        commitSha,
        overallScore: input.overallScore,
        recommendation: input.recommendation,
        findingsCount: input.findingsCount,
        deliveryFailed: true
      }
    })
  }
}

/**
 * Post a PR review with inline comments
 */
async function postPullRequestReview(
  owner: string,
  repo: string,
  prNumber: number,
  commitSha: string,
  review: any,
  token: string,
  logger: any
): Promise<void> {
  const comments = review.findings
    .filter((f: any) => f.file && f.lineStart)
    .slice(0, 50) // GitHub limits to 50 comments per review
    .map((finding: any) => ({
      path: finding.file,
      line: finding.lineStart,
      side: 'RIGHT',
      body: formatInlineComment(finding)
    }))

  const reviewEvent = review.recommendation === 'approve' ? 'APPROVE' :
                      review.recommendation === 'request_changes' ? 'REQUEST_CHANGES' :
                      'COMMENT'

  const body = formatReviewBody(review)

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Motia-Code-Review-Bot'
        },
        body: JSON.stringify({
          commit_id: commitSha,
          body,
          event: reviewEvent,
          comments
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('GitHub API error posting review', { status: response.status, error: errorText })
      throw new Error(`GitHub API error: ${response.status}`)
    }

    logger.info('PR review posted', { owner, repo, prNumber, commentsCount: comments.length })
  } catch (error) {
    logger.error('Failed to post PR review', { error: String(error) })
    throw error
  }
}

/**
 * Set commit status check
 */
async function setCommitStatus(
  owner: string,
  repo: string,
  sha: string,
  score: number,
  reviewId: string,
  token: string,
  logger: any
): Promise<void> {
  const scoreThreshold = parseInt(process.env.REVIEW_SCORE_THRESHOLD || '70', 10)
  const state = score >= scoreThreshold ? 'success' : 'failure'

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Motia-Code-Review-Bot'
        },
        body: JSON.stringify({
          state,
          target_url: `${process.env.APP_URL || 'http://localhost:3000'}/reviews/${reviewId}`,
          description: `Code Review Score: ${score}/100`,
          context: 'Motia Code Review'
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('GitHub API error setting status', { status: response.status, error: errorText })
    } else {
      logger.info('Commit status set', { owner, repo, sha, state, score })
    }
  } catch (error) {
    logger.error('Failed to set commit status', { error: String(error) })
    // Don't throw - status is optional
  }
}

/**
 * Format inline comment for GitHub
 */
function formatInlineComment(finding: any): string {
  const severityEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
    info: 'ℹ️'
  }

  const emoji = severityEmoji[finding.severity as keyof typeof severityEmoji] || '📝'
  
  let comment = `${emoji} **${finding.severity.toUpperCase()}**: ${finding.title}\n\n`
  comment += `${finding.description}\n\n`
  
  if (finding.suggestedFix) {
    comment += `**Suggested Fix:**\n\`\`\`suggestion\n${finding.suggestedFix}\n\`\`\`\n\n`
  }
  
  if (finding.explanation) {
    comment += `**Why this matters:** ${finding.explanation}\n`
  }

  return comment
}

/**
 * Format the main review body
 */
function formatReviewBody(review: any): string {
  const scoreEmoji = review.overallScore >= 80 ? '🟢' :
                     review.overallScore >= 60 ? '🟡' : '🔴'

  let body = `# 🤖 AI Code Review\n\n`
  body += `## ${scoreEmoji} Overall Score: ${review.overallScore}/100\n\n`
  body += `${review.executiveSummary}\n\n`
  
  body += `### 📊 Summary\n`
  body += `| Severity | Count |\n|---|---|\n`
  body += `| 🔴 Critical | ${review.highlights.critical} |\n`
  body += `| 🟠 High | ${review.highlights.high} |\n`
  body += `| 🟡 Medium | ${review.highlights.medium} |\n`
  body += `| 🔵 Low | ${review.highlights.low} |\n`
  body += `| ℹ️ Info | ${review.highlights.info} |\n\n`

  if (review.positiveAspects?.length > 0) {
    body += `### ✅ What's Good\n`
    review.positiveAspects.forEach((aspect: string) => {
      body += `- ${aspect}\n`
    })
    body += '\n'
  }

  if (review.areasForImprovement?.length > 0) {
    body += `### 📈 Areas for Improvement\n`
    review.areasForImprovement.forEach((area: string) => {
      body += `- ${area}\n`
    })
    body += '\n'
  }

  body += `---\n*Powered by Motia AI Code Review Pipeline*`

  return body
}

