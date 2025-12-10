import { createMockContext } from '@motiadev/test'
import { handler } from '../../steps/pr-classifier/pr-test-monitor.step'
import { GithubClient } from '../../services/github/GithubClient'
import { mockPROpenedEvent, mockCheckRuns } from '../mocks/github-events.mock'
import { GithubPREvent } from '../../types/github-events'

jest.mock('../../services/github/GithubClient')

describe('PR Test Monitor Step', () => {
  let mockContext: ReturnType<typeof createMockContext>
  let mockGetCheckRuns: jest.Mock
  let mockCreateComment: jest.Mock
  let mockAddLabels: jest.Mock

  beforeEach(() => {
    mockContext = createMockContext()
    mockGetCheckRuns = jest.fn()
    mockCreateComment = jest.fn()
    mockAddLabels = jest.fn()
    ;(GithubClient as jest.MockedClass<typeof GithubClient>).mockImplementation(
      () =>
        ({
          getCheckRuns: mockGetCheckRuns,
          createComment: mockCreateComment,
          addLabels: mockAddLabels,
        }) as unknown as GithubClient
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should monitor tests and emit event when all tests pass', async () => {
    mockGetCheckRuns.mockResolvedValue(mockCheckRuns)
    mockCreateComment.mockResolvedValue({})
    mockAddLabels.mockResolvedValue({})

    await handler(mockPROpenedEvent, mockContext)

    expect(mockGetCheckRuns).toHaveBeenCalledWith(
      mockPROpenedEvent.owner,
      mockPROpenedEvent.repo,
      mockPROpenedEvent.commitSha
    )

    expect(mockCreateComment).toHaveBeenCalledWith(
      mockPROpenedEvent.owner,
      mockPROpenedEvent.repo,
      mockPROpenedEvent.prNumber,
      expect.stringContaining('All tests have passed')
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubPREvent.TestsCompleted,
      data: {
        ...mockPROpenedEvent,
        testsPassed: true,
        results: mockCheckRuns,
      },
    })

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      '[PR Test Monitor] Checking test status',
      expect.objectContaining({
        prNumber: mockPROpenedEvent.prNumber,
      })
    )
  })

  it('should handle failed tests', async () => {
    const failedCheckRuns = mockCheckRuns.map(run => ({
      ...run,
      conclusion: 'failure',
    }))
    mockGetCheckRuns.mockResolvedValue(failedCheckRuns)
    mockCreateComment.mockResolvedValue({})
    mockAddLabels.mockResolvedValue({})

    await handler(mockPROpenedEvent, mockContext)

    expect(mockGetCheckRuns).toHaveBeenCalledWith(
      mockPROpenedEvent.owner,
      mockPROpenedEvent.repo,
      mockPROpenedEvent.commitSha
    )

    expect(mockCreateComment).toHaveBeenCalledWith(
      mockPROpenedEvent.owner,
      mockPROpenedEvent.repo,
      mockPROpenedEvent.prNumber,
      expect.stringContaining('Some tests have failed')
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubPREvent.TestsCompleted,
      data: {
        ...mockPROpenedEvent,
        testsPassed: false,
        results: failedCheckRuns,
      },
    })

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      '[PR Test Monitor] Checking test status',
      expect.objectContaining({
        prNumber: mockPROpenedEvent.prNumber,
      })
    )
  })

  it('should handle in-progress tests', async () => {
    const inProgressCheckRuns = mockCheckRuns.map(run => ({
      ...run,
      status: 'in_progress',
      conclusion: null,
    }))
    mockGetCheckRuns.mockResolvedValue(inProgressCheckRuns)

    await handler(mockPROpenedEvent, mockContext)

    expect(mockGetCheckRuns).toHaveBeenCalledWith(
      mockPROpenedEvent.owner,
      mockPROpenedEvent.repo,
      mockPROpenedEvent.commitSha
    )

    expect(mockCreateComment).not.toHaveBeenCalled()

    expect(mockContext.emit).not.toHaveBeenCalled()

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      '[PR Test Monitor] Tests still running',
      expect.objectContaining({
        prNumber: mockPROpenedEvent.prNumber,
      })
    )
  })

  it('should handle errors when fetching check runs', async () => {
    const error = new Error('Failed to fetch check runs')
    mockGetCheckRuns.mockRejectedValue(error)

    await handler(mockPROpenedEvent, mockContext)

    expect(mockContext.logger.error).toHaveBeenCalledWith(
      '[PR Test Monitor] Failed to process test results',
      expect.objectContaining({
        error,
        prNumber: mockPROpenedEvent.prNumber,
      })
    )

    expect(mockContext.emit).not.toHaveBeenCalled()
  })
})
