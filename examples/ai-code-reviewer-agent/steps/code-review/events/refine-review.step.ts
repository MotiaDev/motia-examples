import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Input schema for the Refiner node
 */
const inputSchema = z.object({
  reviewId: z.string(),
  repository: z.string(),
  repositoryOwner: z.string(),
  pullRequestNumber: z.number().nullable(),
  commitSha: z.string(),
  qualityScore: z.number()
})

/**
 * Schema for refined findings
 */
const refinedFindingSchema = z.object({
  id: z.string(),
  category: z.enum(['bug', 'security', 'performance', 'style', 'maintainability', 'test-coverage']),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  priority: z.number(),
  title: z.string(),
  description: z.string(),
  file: z.string(),
  lineStart: z.number(),
  lineEnd: z.number().optional(),
  codeSnippet: z.string().optional(),
  suggestedFix: z.string(),
  testAssertion: z.string().optional(),
  explanation: z.string(),
  impact: z.string(),
  effortEstimate: z.enum(['trivial', 'easy', 'moderate', 'complex']),
  relatedFindings: z.array(z.string()).optional()
})

/**
 * Schema for refined review
 */
const refinedReviewSchema = z.object({
  reviewId: z.string(),
  summary: z.string(),
  overallScore: z.number(),
  recommendation: z.enum(['approve', 'request_changes', 'comment']),
  findings: z.array(refinedFindingSchema),
  highlights: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
    info: z.number()
  }),
  categories: z.object({
    bugs: z.number(),
    security: z.number(),
    performance: z.number(),
    style: z.number(),
    maintainability: z.number(),
    testCoverage: z.number()
  }),
  executiveSummary: z.string(),
  positiveAspects: z.array(z.string()),
  areasForImprovement: z.array(z.string())
})

export type RefinedFinding = z.infer<typeof refinedFindingSchema>
export type RefinedReview = z.infer<typeof refinedReviewSchema>

export const config: EventConfig = {
  type: 'event',
  name: 'RefineReview',
  description: 'Refiner Agent: Consolidates draft and critique into final actionable review with prioritized findings',
  subscribes: ['review.critique_completed'],
  emits: ['review.completed'],
  flows: ['code-review-pipeline'],
  input: inputSchema
}

export const handler: Handlers['RefineReview'] = async (input, { emit, logger, state, streams }) => {
  const { reviewId, repository, repositoryOwner, pullRequestNumber, commitSha } = input
  const startTime = Date.now()

  logger.info('Refiner Agent starting consolidation', { reviewId, repository })

  try {
    // Update progress stream
    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'refining',
      message: 'Refiner Agent consolidating findings and generating actionable recommendations...',
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        pullRequest: pullRequestNumber || undefined,
        progress: 75,
        currentAgent: 'Refiner (Claude Opus 4.5)'
      }
    })

    // Fetch all review artifacts from state
    const reviewContext = await state.get<any>('reviews', reviewId)
    const draftReview = await state.get<any>('drafts', reviewId)
    const critique = await state.get<any>('critiques', reviewId)

    if (!reviewContext || !draftReview || !critique) {
      throw new Error(`Missing review artifacts for ${reviewId}`)
    }

    // Fetch original diff for context
    let diff = reviewContext.diff
    if (!diff && reviewContext.diffUrl) {
      diff = await fetchDiffFromGitHub(reviewContext.diffUrl, logger)
    }

    // Call Claude Opus 4.5 for final refinement
    const refinedReview = await refineWithClaude(
      draftReview,
      critique,
      diff,
      reviewContext,
      logger
    )

    // Store refined review in state
    const refinedData = {
      ...refinedReview,
      refinedAt: new Date().toISOString(),
      model: 'claude-opus-4-5-20251101',
      analysisMetrics: {
        originalFindings: draftReview.findings.length,
        finalFindings: refinedReview.findings.length,
        missedIssuesAdded: critique.missedIssues?.length || 0,
        processingTimeMs: Date.now() - startTime,
        totalPipelineTimeMs: Date.now() - new Date(reviewContext.requestedAt).getTime()
      }
    }

    await state.set('refined', reviewId, refinedData)

    // Update review state
    await state.set('reviews', reviewId, {
      ...reviewContext,
      status: 'review_completed',
      finalScore: refinedReview.overallScore,
      recommendation: refinedReview.recommendation,
      stages: {
        ...reviewContext.stages,
        review_completed: { timestamp: new Date().toISOString() }
      }
    })

    // Update progress stream
    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'review_completed',
      message: `Review complete! Score: ${refinedReview.overallScore}/100. ${refinedReview.findings.length} actionable items identified.`,
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        pullRequest: pullRequestNumber || undefined,
        progress: 85,
        currentAgent: 'Refiner (Claude Opus 4.5)',
        findings: refinedReview.findings.length,
        score: refinedReview.overallScore
      }
    })

    logger.info('Refiner Agent completed', {
      reviewId,
      finalScore: refinedReview.overallScore,
      recommendation: refinedReview.recommendation,
      findingsCount: refinedReview.findings.length,
      processingTimeMs: Date.now() - startTime
    })

    // Emit event to trigger GitHub delivery
    await emit({
      topic: 'review.completed',
      data: {
        reviewId,
        repository,
        repositoryOwner,
        pullRequestNumber,
        commitSha,
        overallScore: refinedReview.overallScore,
        recommendation: refinedReview.recommendation,
        findingsCount: refinedReview.findings.length
      }
    })

  } catch (error) {
    logger.error('Refiner Agent failed', { reviewId, error: String(error) })

    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'failed',
      message: `Refiner Agent error: ${String(error)}`,
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        currentAgent: 'Refiner'
      }
    })

    throw error
  }
}

/**
 * Fetch diff from GitHub API
 */
async function fetchDiffFromGitHub(diffUrl: string, logger: any): Promise<string> {
  try {
    const response = await fetch(diffUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3.diff',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Motia-Code-Review-Bot'
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    return await response.text()
  } catch (error) {
    logger.error('Failed to fetch diff from GitHub', { diffUrl, error: String(error) })
    throw error
  }
}

/**
 * Refine review using Claude Opus 4.5
 */
async function refineWithClaude(
  draftReview: any,
  critique: any,
  diff: string,
  context: any,
  logger: any
): Promise<RefinedReview> {
  const systemPrompt = `You are a senior engineering lead producing the final code review deliverable.

Your task is to synthesize the initial draft review and the critic's feedback into a polished, actionable final review that:

1. **Prioritizes findings** by business impact and effort
2. **Removes false positives** identified by the critic
3. **Incorporates missed issues** from the critique
4. **Provides concrete fixes** with code snippets
5. **Generates test assertions** where appropriate
6. **Explains impact** in business terms
7. **Groups related findings** together
8. **Provides clear recommendation** (approve, request_changes, or comment)

The final review should be:
- Actionable and specific
- Prioritized by severity and effort
- Professional and constructive in tone
- Complete with code examples for fixes`

  const userPrompt = `Create the final refined review by synthesizing these inputs:

ORIGINAL CODE DIFF:
\`\`\`diff
${diff}
\`\`\`

DRAFT REVIEW:
\`\`\`json
${JSON.stringify(draftReview, null, 2)}
\`\`\`

CRITIQUE FEEDBACK:
\`\`\`json
${JSON.stringify(critique, null, 2)}
\`\`\`

Context:
- Repository: ${context.repository}
- Branch: ${context.branch}
- PR Title: ${context.title || 'N/A'}
- Author: ${context.author}

Produce the final review as JSON:
{
  "reviewId": "${context.reviewId}",
  "summary": "<concise overall assessment>",
  "overallScore": <0-100>,
  "recommendation": "<approve|request_changes|comment>",
  "findings": [
    {
      "id": "<unique-id>",
      "category": "<category>",
      "severity": "<severity>",
      "priority": <1-N where 1 is highest priority>,
      "title": "<clear title>",
      "description": "<detailed description>",
      "file": "<filename>",
      "lineStart": <line>,
      "lineEnd": <optional>,
      "codeSnippet": "<relevant code>",
      "suggestedFix": "<complete code fix>",
      "testAssertion": "<suggested test if applicable>",
      "explanation": "<why this matters to the business>",
      "impact": "<what could go wrong>",
      "effortEstimate": "<trivial|easy|moderate|complex>",
      "relatedFindings": ["<other-finding-id>"]
    }
  ],
  "highlights": {
    "critical": <count>,
    "high": <count>,
    "medium": <count>,
    "low": <count>,
    "info": <count>
  },
  "categories": {
    "bugs": <count>,
    "security": <count>,
    "performance": <count>,
    "style": <count>,
    "maintainability": <count>,
    "testCoverage": <count>
  },
  "executiveSummary": "<2-3 sentence summary for stakeholders>",
  "positiveAspects": ["<what's good about this PR>"],
  "areasForImprovement": ["<general areas to improve>"]
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 16384, // Increased to prevent truncation
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Claude API error', { status: response.status, error: errorText })
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    
    // Check if response was truncated
    if (result.stop_reason === 'max_tokens') {
      logger.warn('Claude response was truncated, attempting to recover')
    }
    
    const content = result.content[0].text
    logger.info('Claude response received', { 
      stopReason: result.stop_reason, 
      contentLength: content.length 
    })

    // Extract JSON from response
    let jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/)
    if (!jsonMatch) {
      jsonMatch = content.match(/\{[\s\S]*\}/)
    }
    
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response as JSON')
    }

    let jsonStr = jsonMatch[1] || jsonMatch[0]
    
    // Try to repair truncated JSON
    try {
      return JSON.parse(jsonStr) as RefinedReview
    } catch (parseError) {
      logger.warn('Initial JSON parse failed, attempting repair', { error: String(parseError) })
      
      // Try to fix common truncation issues
      // Close unclosed strings
      const openQuotes = (jsonStr.match(/"/g) || []).length
      if (openQuotes % 2 !== 0) {
        jsonStr += '"'
      }
      
      // Close unclosed arrays and objects
      const openBrackets = (jsonStr.match(/\[/g) || []).length
      const closeBrackets = (jsonStr.match(/\]/g) || []).length
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        jsonStr += ']'
      }
      
      const openBraces = (jsonStr.match(/\{/g) || []).length
      const closeBraces = (jsonStr.match(/\}/g) || []).length
      for (let i = 0; i < openBraces - closeBraces; i++) {
        jsonStr += '}'
      }
      
      try {
        return JSON.parse(jsonStr) as RefinedReview
      } catch (repairError) {
        logger.error('JSON repair failed', { error: String(repairError) })
        throw parseError // Throw original error
      }
    }

  } catch (error) {
    logger.error('Failed to refine with Claude', { error: String(error) })
    
    // Return simplified refinement on API failure in development
    if (process.env.NODE_ENV === 'development') {
      const critiquedFindings = critique.findingCritiques || []
      const keptFindings = draftReview.findings.filter((f: any) => {
        const crit = critiquedFindings.find((c: any) => c.findingId === f.id)
        return !crit || !crit.shouldRemove
      })

      return {
        reviewId: context.reviewId,
        summary: 'Mock refined review - Claude API unavailable',
        overallScore: draftReview.overallScore || 75,
        recommendation: 'comment',
        findings: keptFindings.map((f: any, idx: number) => ({
          ...f,
          priority: idx + 1,
          explanation: f.reasoning || 'See description',
          impact: 'Potential issue identified',
          effortEstimate: 'moderate' as const,
          suggestedFix: f.suggestedFix || 'Review and address as appropriate'
        })),
        highlights: {
          critical: 0,
          high: 0,
          medium: keptFindings.length,
          low: 0,
          info: 0
        },
        categories: {
          bugs: 0,
          security: 0,
          performance: 0,
          style: keptFindings.length,
          maintainability: 0,
          testCoverage: 0
        },
        executiveSummary: 'Mock review generated due to API unavailability.',
        positiveAspects: ['Code submitted for review'],
        areasForImprovement: ['Review when API is available']
      }
    }
    
    throw error
  }
}

