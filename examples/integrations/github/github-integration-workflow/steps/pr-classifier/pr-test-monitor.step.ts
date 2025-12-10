import { z } from 'zod'
import { GithubClient } from '../../services/github/GithubClient'
import { GithubPREvent } from '../../types/github-events'
import type { EventConfig, Handlers } from 'motia'

const prSchema = z.object({
  prNumber: z.number(),
  title: z.string(),
  body: z.string().optional(),
  owner: z.string(),
  repo: z.string(),
  author: z.string(),
  baseBranch: z.string(),
  headBranch: z.string(),
  commitSha: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'PR Test Monitor',
  description: 'Monitors CI/CD test results and updates PR status',
  subscribes: [GithubPREvent.Opened, GithubPREvent.Edited],
  emits: [
    {
      topic: GithubPREvent.TestsCompleted,
      label: 'Test results processed',
    },
  ],
  input: prSchema,
  flows: ['github-pr-management'],
}

export const handler: Handlers['PR Test Monitor'] = async (input, { emit, logger }) => {
  const github = new GithubClient()

  logger.info('[PR Test Monitor] Checking test status', {
    prNumber: input.prNumber,
  })

  try {
    const testResults = await github.getCheckRuns(input.owner, input.repo, input.commitSha)

    const hasInProgressTests = testResults.some(
      result => result.status === 'in_progress' || !result.conclusion
    )

    if (hasInProgressTests) {
      logger.info('[PR Test Monitor] Tests still running', {
        prNumber: input.prNumber,
      })
      return
    }

    const allPassed = testResults.every(result => result.conclusion === 'success')
    const label = allPassed ? 'tests-passed' : 'tests-failed'
    const comment = allPassed
      ? '✅ All tests have passed!'
      : '❌ Some tests have failed. Please check the CI/CD pipeline for details.'

    await github.addLabels(input.owner, input.repo, input.prNumber, [label])

    await github.createComment(input.owner, input.repo, input.prNumber, comment)

    await emit({
      topic: GithubPREvent.TestsCompleted,
      data: {
        ...input,
        testsPassed: allPassed,
        results: testResults,
      },
    })
  } catch (error) {
    logger.error('[PR Test Monitor] Failed to process test results', {
      error,
      prNumber: input.prNumber,
    })
  }
}
