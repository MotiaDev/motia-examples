import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Input schema for the Critic node
 */
const inputSchema = z.object({
  reviewId: z.string(),
  repository: z.string(),
  repositoryOwner: z.string(),
  pullRequestNumber: z.number().nullable(),
  commitSha: z.string(),
  findingsCount: z.number()
})

/**
 * Schema for critique feedback on individual findings
 */
const findingCritiqueSchema = z.object({
  findingId: z.string(),
  isAccurate: z.boolean(),
  accuracyScore: z.number().min(0).max(100),
  feedback: z.string(),
  suggestedEdits: z.string().optional(),
  shouldRemove: z.boolean(),
  missedContext: z.string().optional()
})

/**
 * Schema for overall critique
 */
const critiqueSchema = z.object({
  reviewId: z.string(),
  overallQualityScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  actionabilityScore: z.number().min(0).max(100),
  findingCritiques: z.array(findingCritiqueSchema),
  missedIssues: z.array(z.object({
    category: z.string(),
    description: z.string(),
    severity: z.string(),
    file: z.string().optional(),
    lineHint: z.string().optional()
  })),
  generalFeedback: z.string(),
  suggestedPriorityReordering: z.array(z.string()).optional()
})

export type Critique = z.infer<typeof critiqueSchema>

export const config: EventConfig = {
  type: 'event',
  name: 'CritiqueDraftReview',
  description: 'Critic Agent: Meta-analyzes the draft review for accuracy, completeness, and actionability',
  subscribes: ['review.draft_generated'],
  emits: ['review.critique_completed'],
  flows: ['code-review-pipeline'],
  input: inputSchema
}

export const handler: Handlers['CritiqueDraftReview'] = async (input, { emit, logger, state, streams }) => {
  const { reviewId, repository, repositoryOwner, pullRequestNumber, commitSha } = input
  const startTime = Date.now()

  logger.info('Critic Agent starting meta-analysis', { reviewId, repository })

  try {
    // Update progress stream
    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'critiquing',
      message: 'Critic Agent validating findings for accuracy, completeness, and actionability...',
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        pullRequest: pullRequestNumber || undefined,
        progress: 50,
        currentAgent: 'Critic (Claude Opus 4.5)'
      }
    })

    // Fetch review context and draft from state
    const reviewContext = await state.get<any>('reviews', reviewId)
    const draftReview = await state.get<any>('drafts', reviewId)

    if (!reviewContext || !draftReview) {
      throw new Error(`Review or draft not found for ${reviewId}`)
    }

    // Fetch original diff for context
    let diff = reviewContext.diff
    if (!diff && reviewContext.diffUrl) {
      diff = await fetchDiffFromGitHub(reviewContext.diffUrl, logger)
    }

    // Call Claude Opus 4.5 for critique
    const critique = await generateCritiqueWithClaude(
      draftReview,
      diff,
      reviewContext,
      logger
    )

    // Store critique in state
    const critiqueData = {
      ...critique,
      reviewId,
      critiquedAt: new Date().toISOString(),
      model: 'claude-opus-4-5-20251101',
      analysisMetrics: {
        findingsReviewed: draftReview.findings.length,
        issuesIdentified: critique.missedIssues.length,
        processingTimeMs: Date.now() - startTime
      }
    }

    await state.set('critiques', reviewId, critiqueData)

    // Update review state
    await state.set('reviews', reviewId, {
      ...reviewContext,
      status: 'critique_completed',
      stages: {
        ...reviewContext.stages,
        critique_completed: { timestamp: new Date().toISOString() }
      }
    })

    // Calculate summary metrics
    const accurateFindings = critique.findingCritiques.filter(c => c.isAccurate).length
    const removedFindings = critique.findingCritiques.filter(c => c.shouldRemove).length

    // Update progress stream
    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'critique_completed',
      message: `Critique complete. ${accurateFindings}/${draftReview.findings.length} findings validated, ${critique.missedIssues.length} additional issues identified.`,
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        pullRequest: pullRequestNumber || undefined,
        progress: 65,
        currentAgent: 'Critic (Claude Opus 4.5)',
        findings: accurateFindings
      }
    })

    logger.info('Critic Agent completed', {
      reviewId,
      qualityScore: critique.overallQualityScore,
      accurateFindings,
      removedFindings,
      missedIssues: critique.missedIssues.length,
      processingTimeMs: Date.now() - startTime
    })

    // Emit event to trigger Refiner
    await emit({
      topic: 'review.critique_completed',
      data: {
        reviewId,
        repository,
        repositoryOwner,
        pullRequestNumber,
        commitSha,
        qualityScore: critique.overallQualityScore
      }
    })

  } catch (error) {
    logger.error('Critic Agent failed', { reviewId, error: String(error) })

    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'failed',
      message: `Critic Agent error: ${String(error)}`,
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        currentAgent: 'Critic'
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
 * Generate critique using Claude Opus 4.5
 */
async function generateCritiqueWithClaude(
  draftReview: any,
  diff: string,
  context: any,
  logger: any
): Promise<Critique> {
  const systemPrompt = `You are a senior code review auditor specializing in meta-analysis of AI-generated code reviews.

Your task is to critically evaluate a draft code review and provide detailed feedback on:

1. **Accuracy**: Are the identified issues real problems? Are there false positives?
2. **Completeness**: Did the review miss any important issues? Consider:
   - Security vulnerabilities (authentication, authorization, injection, data exposure)
   - Edge cases and error handling
   - Test coverage gaps
   - Performance implications
   - Breaking changes
3. **Actionability**: Are the suggestions specific and implementable?
4. **Priority**: Are severity levels appropriate? Should any be changed?

Be thorough but fair. Consider the context of the changes when evaluating findings.`

  const userPrompt = `Please critique the following draft code review.

ORIGINAL CODE DIFF:
\`\`\`diff
${diff}
\`\`\`

DRAFT REVIEW TO CRITIQUE:
\`\`\`json
${JSON.stringify(draftReview, null, 2)}
\`\`\`

Context:
- Repository: ${context.repository}
- Branch: ${context.branch}
- PR Title: ${context.title || 'N/A'}

Provide your critique as a JSON object:
{
  "overallQualityScore": <0-100>,
  "completenessScore": <0-100>,
  "actionabilityScore": <0-100>,
  "findingCritiques": [
    {
      "findingId": "<id from draft>",
      "isAccurate": <boolean>,
      "accuracyScore": <0-100>,
      "feedback": "<detailed feedback>",
      "suggestedEdits": "<how to improve this finding>",
      "shouldRemove": <boolean - true if this is a false positive>,
      "missedContext": "<any context the original review missed>"
    }
  ],
  "missedIssues": [
    {
      "category": "<category>",
      "description": "<what was missed>",
      "severity": "<severity level>",
      "file": "<affected file if known>",
      "lineHint": "<approximate location>"
    }
  ],
  "generalFeedback": "<overall assessment and suggestions>",
  "suggestedPriorityReordering": ["<finding-id-1>", "<finding-id-2>", ...] // optional
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
        max_tokens: 12288, // Increased to prevent truncation
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
    const content = result.content[0].text

    // Extract JSON from response
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response as JSON')
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0]
    return JSON.parse(jsonStr) as Critique

  } catch (error) {
    logger.error('Failed to generate critique with Claude', { error: String(error) })
    
    // Return passthrough critique on API failure in development
    if (process.env.NODE_ENV === 'development') {
      return {
        reviewId: draftReview.reviewId,
        overallQualityScore: 80,
        completenessScore: 75,
        actionabilityScore: 85,
        findingCritiques: draftReview.findings.map((f: any) => ({
          findingId: f.id,
          isAccurate: true,
          accuracyScore: 85,
          feedback: 'Mock critique - Claude API unavailable',
          shouldRemove: false
        })),
        missedIssues: [],
        generalFeedback: 'Mock critique generated due to API unavailability'
      }
    }
    
    throw error
  }
}

