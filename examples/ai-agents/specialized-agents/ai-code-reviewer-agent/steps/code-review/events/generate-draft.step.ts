import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Input schema for the Generator node
 */
const inputSchema = z.object({
  reviewId: z.string(),
  repository: z.string(),
  repositoryOwner: z.string(),
  pullRequestNumber: z.number().nullable(),
  commitSha: z.string(),
  branch: z.string()
})

/**
 * Schema for individual code findings
 */
const findingSchema = z.object({
  id: z.string(),
  category: z.enum(['bug', 'security', 'performance', 'style', 'maintainability', 'test-coverage']),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  title: z.string(),
  description: z.string(),
  file: z.string(),
  lineStart: z.number(),
  lineEnd: z.number().optional(),
  codeSnippet: z.string().optional(),
  suggestedFix: z.string().optional(),
  reasoning: z.string()
})

export type Finding = z.infer<typeof findingSchema>

export const config: EventConfig = {
  type: 'event',
  name: 'GenerateDraftReview',
  description: 'Generator Agent: Analyzes code diff and produces initial structured review with categorized findings',
  subscribes: ['code_review.requested'],
  emits: ['review.draft_generated'],
  virtualSubscribes: ['review.pipeline.start'],
  flows: ['code-review-pipeline'],
  input: inputSchema
}

export const handler: Handlers['GenerateDraftReview'] = async (input, { emit, logger, state, streams }) => {
  const { reviewId, repository, repositoryOwner, pullRequestNumber, commitSha } = input
  const startTime = Date.now()

  logger.info('Generator Agent starting analysis', { reviewId, repository })

  try {
    // Update progress stream
    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'generating_draft',
      message: 'Generator Agent analyzing code diff for bugs, security issues, and improvements...',
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        pullRequest: typeof pullRequestNumber === 'number' ? pullRequestNumber : undefined,
        progress: 15,
        currentAgent: 'Generator (Claude Opus 4.5)'
      }
    })

    // Fetch review context from state
    const reviewContext = await state.get<any>('reviews', reviewId)
    if (!reviewContext) {
      throw new Error(`Review context not found for ${reviewId}`)
    }

    // Fetch diff from GitHub if not already present
    let diff = reviewContext.diff
    if (!diff && reviewContext.diffUrl) {
      diff = await fetchDiffFromGitHub(reviewContext.diffUrl, logger)
    }

    if (!diff) {
      throw new Error('Unable to fetch diff for review')
    }

    // Call Claude Opus 4.5 for initial code review
    const draftReview = await generateDraftWithClaude(
      diff,
      reviewContext,
      logger
    )

    // Store draft review in state
    const draftData = {
      reviewId,
      generatedAt: new Date().toISOString(),
      model: 'claude-opus-4-5-20251101',
      findings: draftReview.findings,
      summary: draftReview.summary,
      overallScore: draftReview.overallScore,
      analysisMetrics: {
        linesAnalyzed: draftReview.linesAnalyzed,
        filesAnalyzed: draftReview.filesAnalyzed,
        processingTimeMs: Date.now() - startTime
      }
    }

    await state.set('drafts', reviewId, draftData)

    // Update review state
    await state.set('reviews', reviewId, {
      ...reviewContext,
      status: 'draft_generated',
      stages: {
        ...reviewContext.stages,
        draft_generated: { timestamp: new Date().toISOString() }
      }
    })

    // Update progress stream
    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'draft_generated',
      message: `Draft review complete. Found ${draftReview.findings.length} issues across ${draftReview.filesAnalyzed} files.`,
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        pullRequest: typeof pullRequestNumber === 'number' ? pullRequestNumber : undefined,
        progress: 35,
        currentAgent: 'Generator (Claude Opus 4.5)',
        findings: draftReview.findings.length,
        score: draftReview.overallScore
      }
    })

    logger.info('Generator Agent completed', {
      reviewId,
      findingsCount: draftReview.findings.length,
      processingTimeMs: Date.now() - startTime
    })

    // Emit event to trigger Critic
    await emit({
      topic: 'review.draft_generated',
      data: {
        reviewId,
        repository,
        repositoryOwner,
        pullRequestNumber,
        commitSha,
        findingsCount: draftReview.findings.length
      }
    })

  } catch (error) {
    logger.error('Generator Agent failed', { reviewId, error: String(error) })

    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: 'failed',
      message: `Generator Agent error: ${String(error)}`,
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        currentAgent: 'Generator'
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
 * Generate draft review using Claude Opus 4.5
 */
async function generateDraftWithClaude(
  diff: string,
  context: any,
  logger: any
): Promise<{
  findings: Finding[]
  summary: string
  overallScore: number
  linesAnalyzed: number
  filesAnalyzed: number
}> {
  const systemPrompt = `You are an expert code reviewer with deep knowledge of software engineering best practices, security vulnerabilities, performance optimization, and maintainability patterns.

Your task is to analyze the provided code diff and generate a comprehensive, structured review. For each finding:
1. Categorize it (bug, security, performance, style, maintainability, test-coverage)
2. Assign severity (critical, high, medium, low, info)
3. Provide specific file and line references
4. Explain the issue and why it matters
5. Suggest a concrete fix when possible

Focus on:
- Security vulnerabilities (injection, XSS, authentication issues, data exposure)
- Bugs and logic errors
- Performance issues (N+1 queries, memory leaks, inefficient algorithms)
- Code style and consistency
- Maintainability concerns (complexity, coupling, unclear code)
- Missing test coverage for critical paths

Be specific and actionable. Reference exact line numbers and provide code snippets for suggested fixes.`

  const userPrompt = `Please review the following code diff from repository "${context.repository}" (branch: ${context.branch}).

Pull Request: ${context.title || 'N/A'}
Description: ${context.description || 'N/A'}

DIFF:
\`\`\`diff
${diff}
\`\`\`

Provide your review as a JSON object with the following structure:
{
  "summary": "Brief overall assessment of the changes",
  "overallScore": <number 0-100 representing code quality>,
  "findings": [
    {
      "id": "<unique-id>",
      "category": "<bug|security|performance|style|maintainability|test-coverage>",
      "severity": "<critical|high|medium|low|info>",
      "title": "<brief title>",
      "description": "<detailed description>",
      "file": "<filename>",
      "lineStart": <line number>,
      "lineEnd": <optional end line>,
      "codeSnippet": "<relevant code>",
      "suggestedFix": "<suggested code fix>",
      "reasoning": "<why this matters>"
    }
  ],
  "linesAnalyzed": <number>,
  "filesAnalyzed": <number>
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
        temperature: 0.3,
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

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response as JSON')
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0]
    const parsed = JSON.parse(jsonStr)

    // Add unique IDs if missing
    parsed.findings = parsed.findings.map((f: Finding, idx: number) => ({
      ...f,
      id: f.id || `finding-${idx + 1}`
    }))

    return parsed
  } catch (error) {
    logger.error('Failed to generate draft with Claude', { error: String(error) })
    
    // Return empty review on API failure (allows pipeline to continue with mock data in dev)
    if (process.env.NODE_ENV === 'development') {
      return {
        summary: 'Mock review - Claude API unavailable',
        overallScore: 75,
        findings: [],
        linesAnalyzed: 0,
        filesAnalyzed: 0
      }
    }
    
    throw error
  }
}

