import { createMockContext } from '@motiadev/test'
import { handler } from '../../steps/pr-classifier/pr-reviewer-assigner.step'
import { OpenAIClient } from '../../services/openai/OpenAIClient'
import { GithubClient } from '../../services/github/GithubClient'
import { mockPRClassifiedEvent } from '../mocks/github-events.mock'
import { GithubPREvent } from '../../types/github-events'

jest.mock('../../services/openai/OpenAIClient')
jest.mock('../../services/github/GithubClient')

describe('PR Reviewer Assigner Step', () => {
  let mockContext: ReturnType<typeof createMockContext>
  let mockSuggestReviewers: jest.Mock
  let mockRequestReviews: jest.Mock
  let mockCreateComment: jest.Mock

  beforeEach(() => {
    mockContext = createMockContext()

    mockSuggestReviewers = jest.fn()
    mockRequestReviews = jest.fn().mockResolvedValue(undefined)
    mockCreateComment = jest.fn().mockResolvedValue(undefined)
    ;(OpenAIClient as jest.MockedClass<typeof OpenAIClient>).mockImplementation(
      () =>
        ({
          suggestReviewers: mockSuggestReviewers,
        }) as unknown as OpenAIClient
    )
    ;(GithubClient as jest.MockedClass<typeof GithubClient>).mockImplementation(
      () =>
        ({
          requestReviews: mockRequestReviews,
          createComment: mockCreateComment,
        }) as unknown as GithubClient
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should suggest reviewers and assign them to the PR', async () => {
    const suggestedReviewers = ['security-expert', 'backend-dev']
    mockSuggestReviewers.mockResolvedValue(suggestedReviewers)

    await handler(mockPRClassifiedEvent, mockContext)

    expect(mockSuggestReviewers).toHaveBeenCalledWith(
      mockPRClassifiedEvent.title,
      mockPRClassifiedEvent.body || '',
      expect.any(Array),
      mockPRClassifiedEvent.classification
    )

    expect(mockRequestReviews).toHaveBeenCalledWith(
      mockPRClassifiedEvent.owner,
      mockPRClassifiedEvent.repo,
      mockPRClassifiedEvent.prNumber,
      suggestedReviewers
    )

    expect(mockCreateComment).toHaveBeenCalledWith(
      mockPRClassifiedEvent.owner,
      mockPRClassifiedEvent.repo,
      mockPRClassifiedEvent.prNumber,
      expect.stringContaining(suggestedReviewers[0])
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubPREvent.ReviewersAssigned,
      data: {
        ...mockPRClassifiedEvent,
        reviewers: suggestedReviewers,
      },
    })

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      '[PR Reviewer Assigner] Finding reviewers',
      expect.objectContaining({
        prNumber: mockPRClassifiedEvent.prNumber,
      })
    )
  })

  it('should handle errors when suggesting reviewers', async () => {
    const error = new Error('Failed to suggest reviewers')
    mockSuggestReviewers.mockRejectedValue(error)

    await handler(mockPRClassifiedEvent, mockContext)

    expect(mockContext.logger.error).toHaveBeenCalledWith(
      '[PR Reviewer Assigner] Failed to assign reviewers',
      expect.objectContaining({
        error,
        prNumber: mockPRClassifiedEvent.prNumber,
      })
    )

    expect(mockRequestReviews).not.toHaveBeenCalled()
    expect(mockContext.emit).not.toHaveBeenCalled()
  })

  it('should handle errors when assigning reviewers', async () => {
    const suggestedReviewers = ['security-expert', 'backend-dev']
    mockSuggestReviewers.mockResolvedValue(suggestedReviewers)

    const error = new Error('Failed to assign reviewers')
    mockRequestReviews.mockRejectedValue(error)

    await handler(mockPRClassifiedEvent, mockContext)

    expect(mockContext.logger.error).toHaveBeenCalledWith(
      '[PR Reviewer Assigner] Failed to assign reviewers',
      expect.objectContaining({
        error,
        prNumber: mockPRClassifiedEvent.prNumber,
      })
    )

    expect(mockContext.emit).not.toHaveBeenCalled()
  })

  it('should handle case when no reviewers are suggested', async () => {
    mockSuggestReviewers.mockResolvedValue([])

    await handler(mockPRClassifiedEvent, mockContext)

    expect(mockRequestReviews).not.toHaveBeenCalled()

    expect(mockContext.logger.warn).toHaveBeenCalledWith(
      '[PR Reviewer Assigner] No suitable reviewers found',
      expect.objectContaining({
        prNumber: mockPRClassifiedEvent.prNumber,
      })
    )

    expect(mockContext.emit).not.toHaveBeenCalled()
  })
})
