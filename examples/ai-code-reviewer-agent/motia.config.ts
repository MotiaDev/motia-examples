import path from 'node:path'
import { config, type MotiaPlugin, type MotiaPluginContext } from '@motiadev/core'

const statesPlugin = require('@motiadev/plugin-states/plugin')
const endpointPlugin = require('@motiadev/plugin-endpoint/plugin')
const logsPlugin = require('@motiadev/plugin-logs/plugin')
const observabilityPlugin = require('@motiadev/plugin-observability/plugin')
const bullmqPlugin = require('@motiadev/plugin-bullmq/plugin')

/**
 * Code Review Dashboard Plugin
 * 
 * A beautiful GitHub-themed dashboard for monitoring AI-powered code reviews
 * in the Motia Workbench. Features real-time progress tracking, review metrics,
 * and detailed findings visualization.
 */
function codeReviewDashboardPlugin(motia: MotiaPluginContext): MotiaPlugin {
  // Register API endpoint for getting review statistics
  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/code-review/stats',
    },
    async (_req, ctx) => {
      try {
        const allReviews = await ctx.state.getGroup<any>('reviews')
        
        const stats = {
          total: allReviews.length,
          completed: allReviews.filter((r: any) => r.status === 'completed').length,
          inProgress: allReviews.filter((r: any) => !['completed', 'failed'].includes(r.status)).length,
          failed: allReviews.filter((r: any) => r.status === 'failed').length,
          avgScore: calculateAvgScore(allReviews),
          byRepository: groupByRepository(allReviews),
          recentActivity: allReviews
            .sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
            .slice(0, 10)
            .map((r: any) => ({
              reviewId: r.reviewId,
              repository: r.repository,
              status: r.status,
              score: r.finalScore,
              timestamp: r.requestedAt
            }))
        }

        return {
          status: 200,
          body: stats,
        }
      } catch (error) {
        return {
          status: 500,
          body: { error: 'Failed to fetch stats' },
        }
      }
    },
  )

  // Register API endpoint for triggering manual reviews
  motia.registerApi(
    {
      method: 'POST',
      path: '/__motia/code-review/trigger',
    },
    async (req, ctx) => {
      const { repository, diff, branch } = req.body as any

      if (!repository || !diff) {
        return {
          status: 400,
          body: { error: 'Repository and diff are required' },
        }
      }

      const crypto = await import('crypto')
      const reviewId = crypto.randomUUID()

      // Use type assertion for emit since plugin context has different types
      await (ctx.emit as any)({
        topic: 'code_review.requested',
        data: {
          reviewId,
          repository,
          repositoryOwner: repository.split('/')[0],
          pullRequestNumber: null,
          commitSha: 'manual-' + reviewId.slice(0, 8),
          branch: branch || 'main'
        }
      })

      return {
        status: 202,
        body: { 
          reviewId, 
          message: 'Review initiated',
          streamUrl: `/streams/reviewProgress/${reviewId}`
        },
      }
    },
  )

  return {
    dirname: path.join(__dirname, 'plugins'),
    workbench: [
      {
        componentName: 'CodeReviewDashboard',
        packageName: '~/plugins/components/code-review-dashboard',
        label: 'Code Reviews',
        position: 'top',
        labelIcon: 'git-pull-request',
        props: {
          refreshInterval: 5000
        }
      },
    ],
  }
}

/**
 * Calculate average score from reviews
 */
function calculateAvgScore(reviews: any[]): number {
  const completedWithScore = reviews.filter(r => r.finalScore !== undefined)
  if (completedWithScore.length === 0) return 0
  const sum = completedWithScore.reduce((acc, r) => acc + r.finalScore, 0)
  return Math.round(sum / completedWithScore.length)
}

/**
 * Group reviews by repository
 */
function groupByRepository(reviews: any[]): Record<string, number> {
  return reviews.reduce((acc, r) => {
    const repo = r.repository || 'unknown'
    acc[repo] = (acc[repo] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

export default config({
  plugins: [
    observabilityPlugin, 
    statesPlugin, 
    endpointPlugin, 
    logsPlugin, 
    bullmqPlugin,
    codeReviewDashboardPlugin
  ],
})
