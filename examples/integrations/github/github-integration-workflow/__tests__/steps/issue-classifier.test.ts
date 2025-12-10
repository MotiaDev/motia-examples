import { createMockContext } from '@motiadev/test'
import { handler } from '../../steps/issue-triage/issue-classifier.step'
import { IssueClassification } from '../../types/github'
import { GithubIssueEvent } from '../../types/github-events'
import { mockIssueOpenedEvent, mockIssueClassification } from '../mocks/issue-events.mock'
import { OpenAIClient } from '../../services/openai/OpenAIClient'

jest.mock('../../services/openai/OpenAIClient')
const MockOpenAIClient = OpenAIClient as jest.MockedClass<typeof OpenAIClient>

describe('Issue Classifier Step', () => {
  let mockContext: ReturnType<typeof createMockContext>
  let mockOpenAIClient: jest.Mocked<OpenAIClient>

  beforeEach(() => {
    mockContext = createMockContext()

    mockOpenAIClient = {
      classifyIssue: jest.fn(),
    } as unknown as jest.Mocked<OpenAIClient>

    MockOpenAIClient.mockImplementation(() => mockOpenAIClient)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should classify an issue and emit a classified event', async () => {
    mockOpenAIClient.classifyIssue.mockResolvedValueOnce(mockIssueClassification)

    await handler(mockIssueOpenedEvent, mockContext)

    expect(mockOpenAIClient.classifyIssue).toHaveBeenCalledWith(
      mockIssueOpenedEvent.title,
      mockIssueOpenedEvent.body
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubIssueEvent.Classified,
      data: {
        ...mockIssueOpenedEvent,
        classification: mockIssueClassification,
      },
    })
  })

  it('should handle errors from OpenAI client', async () => {
    const mockError = new Error('Classification failed')
    mockOpenAIClient.classifyIssue.mockRejectedValueOnce(mockError)

    await handler(mockIssueOpenedEvent, mockContext)

    expect(mockContext.emit).not.toHaveBeenCalled()
  })

  it('should handle empty classification results', async () => {
    mockOpenAIClient.classifyIssue.mockResolvedValueOnce({} as IssueClassification)

    await handler(mockIssueOpenedEvent, mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubIssueEvent.Classified,
      data: expect.objectContaining({
        ...mockIssueOpenedEvent,
        classification: {},
      }),
    })
  })
})
