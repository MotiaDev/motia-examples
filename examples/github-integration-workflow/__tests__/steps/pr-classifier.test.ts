import { createMockContext } from '@motiadev/test'
import { handler } from '../../steps/pr-classifier/pr-classifier.step'
import { OpenAIClient } from '../../services/openai/OpenAIClient'
import { mockPROpenedEvent, mockPRClassification } from '../mocks/github-events.mock'
import { GithubPREvent } from '../../types/github-events'

jest.mock('../../services/openai/OpenAIClient')

describe('PR Classifier Step', () => {
  let mockContext: ReturnType<typeof createMockContext>
  let mockClassifyPR: jest.Mock

  beforeEach(() => {
    mockContext = createMockContext()
    mockClassifyPR = jest.fn()
    ;(OpenAIClient as jest.MockedClass<typeof OpenAIClient>).mockImplementation(
      () =>
        ({
          classifyPR: mockClassifyPR,
        }) as unknown as OpenAIClient
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should classify a PR and emit a classified event', async () => {
    mockClassifyPR.mockResolvedValue(mockPRClassification)

    await handler(mockPROpenedEvent, mockContext)

    expect(mockClassifyPR).toHaveBeenCalledWith(
      mockPROpenedEvent.title,
      mockPROpenedEvent.body || ''
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubPREvent.Classified,
      data: {
        ...mockPROpenedEvent,
        classification: mockPRClassification,
      },
    })

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      '[PR Classifier] Analyzing PR',
      expect.objectContaining({
        prNumber: mockPROpenedEvent.prNumber,
      })
    )

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      '[PR Classifier] Classification complete',
      expect.objectContaining({
        prNumber: mockPROpenedEvent.prNumber,
        classification: mockPRClassification,
      })
    )
  })

  it('should handle errors during classification', async () => {
    const error = new Error('Classification failed')
    mockClassifyPR.mockRejectedValue(error)

    await handler(mockPROpenedEvent, mockContext)

    expect(mockContext.logger.error).toHaveBeenCalledWith(
      '[PR Classifier] Classification failed',
      expect.objectContaining({
        error,
        prNumber: mockPROpenedEvent.prNumber,
      })
    )

    expect(mockContext.emit).not.toHaveBeenCalled()
  })

  it('should handle PRs with no body', async () => {
    const prEventWithoutBody = {
      ...mockPROpenedEvent,
      body: undefined,
    }

    mockClassifyPR.mockResolvedValue(mockPRClassification)

    await handler(prEventWithoutBody, mockContext)

    expect(mockClassifyPR).toHaveBeenCalledWith(prEventWithoutBody.title, '')

    expect(mockContext.emit).toHaveBeenCalled()
  })
})
