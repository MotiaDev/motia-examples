import { createMockContext } from '@motiadev/test'
import { handler } from '../../steps/pr-classifier/pr-label-assigner.step'
import { GithubClient } from '../../services/github/GithubClient'
import { mockPRClassifiedEvent } from '../mocks/github-events.mock'
import { GithubPREvent } from '../../types/github-events'

jest.mock('../../services/github/GithubClient')

describe('PR Label Assigner Step', () => {
  let mockContext: ReturnType<typeof createMockContext>
  let mockAddLabels: jest.Mock
  let mockCreateComment: jest.Mock

  beforeEach(() => {
    mockContext = createMockContext()
    mockAddLabels = jest.fn()
    mockCreateComment = jest.fn()
    ;(GithubClient as jest.MockedClass<typeof GithubClient>).mockImplementation(
      () =>
        ({
          addLabels: mockAddLabels,
          createComment: mockCreateComment,
        }) as unknown as GithubClient
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should assign labels based on PR classification', async () => {
    mockAddLabels.mockResolvedValue([])
    mockCreateComment.mockResolvedValue({})

    await handler(mockPRClassifiedEvent, mockContext)

    const expectedLabels = [
      `type:${mockPRClassifiedEvent.classification.type}`,
      `impact:${mockPRClassifiedEvent.classification.impact}`,
      ...mockPRClassifiedEvent.classification.areas.map(area => `area:${area}`),
    ]

    expect(mockAddLabels).toHaveBeenCalledWith(
      mockPRClassifiedEvent.owner,
      mockPRClassifiedEvent.repo,
      mockPRClassifiedEvent.prNumber,
      expect.arrayContaining(expectedLabels)
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubPREvent.Labeled,
      data: {
        ...mockPRClassifiedEvent,
        labels: expectedLabels,
      },
    })

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      '[PR Label Assigner] Assigning labels',
      expect.objectContaining({
        prNumber: mockPRClassifiedEvent.prNumber,
        classification: mockPRClassifiedEvent.classification,
      })
    )
  })

  it('should handle errors when assigning labels', async () => {
    const error = new Error('Failed to assign labels')
    mockAddLabels.mockRejectedValue(error)

    await handler(mockPRClassifiedEvent, mockContext)

    expect(mockContext.logger.error).toHaveBeenCalledWith(
      '[PR Label Assigner] Failed to assign labels',
      expect.objectContaining({
        error,
        prNumber: mockPRClassifiedEvent.prNumber,
      })
    )

    expect(mockContext.emit).not.toHaveBeenCalled()
  })

  it('should handle PRs with no areas in classification', async () => {
    const prEventWithNoAreas = {
      ...mockPRClassifiedEvent,
      classification: {
        ...mockPRClassifiedEvent.classification,
        areas: [],
      },
    }

    mockAddLabels.mockResolvedValue([])
    mockCreateComment.mockResolvedValue({})

    await handler(prEventWithNoAreas, mockContext)

    const expectedLabels = [
      `type:${prEventWithNoAreas.classification.type}`,
      `impact:${prEventWithNoAreas.classification.impact}`,
    ]

    expect(mockAddLabels).toHaveBeenCalledWith(
      prEventWithNoAreas.owner,
      prEventWithNoAreas.repo,
      prEventWithNoAreas.prNumber,
      expect.arrayContaining(expectedLabels)
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubPREvent.Labeled,
      data: {
        ...prEventWithNoAreas,
        labels: expectedLabels,
      },
    })
  })
})
