import { createMockContext } from '@motiadev/test'
import { handler } from '../../steps/issue-triage/assignee-selector.step'
import { GithubIssueEvent } from '../../types/github-events'
import { mockIssueAssignedEvent } from '../mocks/issue-events.mock'
import { GithubClient } from '../../services/github/GithubClient'
import { OpenAIClient } from '../../services/openai/OpenAIClient'

jest.mock('../../services/github/GithubClient')
const MockGithubClient = GithubClient as jest.MockedClass<typeof GithubClient>

jest.mock('../../services/openai/OpenAIClient')
const MockOpenAIClient = OpenAIClient as jest.MockedClass<typeof OpenAIClient>

describe('Issue Assigner Step', () => {
  let mockContext: ReturnType<typeof createMockContext>
  let mockGithubClient: jest.Mocked<GithubClient>
  let mockOpenAIClient: jest.Mocked<OpenAIClient>
  type UpdateIssueReturn = Awaited<ReturnType<GithubClient['updateIssue']>>
  type CreateCommentReturn = Awaited<ReturnType<GithubClient['createComment']>>

  beforeEach(() => {
    mockContext = createMockContext()

    mockGithubClient = {
      updateIssue: jest.fn(),
      createComment: jest.fn(),
    } as unknown as jest.Mocked<GithubClient>

    mockOpenAIClient = {
      suggestAssignees: jest.fn().mockResolvedValue(mockIssueAssignedEvent.suggestedAssignees),
    } as unknown as jest.Mocked<OpenAIClient>

    MockGithubClient.mockImplementation(() => mockGithubClient)
    MockOpenAIClient.mockImplementation(() => mockOpenAIClient)

    process.env.TEAM_MEMBERS = JSON.stringify([
      { login: 'frontend-dev', expertise: ['frontend', 'react', 'css'] },
      {
        login: 'mobile-dev',
        expertise: ['mobile', 'react-native', 'ios', 'android'],
      },
    ])
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.TEAM_MEMBERS
  })

  it('should assign an issue and emit an event', async () => {
    mockGithubClient.updateIssue.mockResolvedValueOnce({ id: 123 } as UpdateIssueReturn)
    mockGithubClient.createComment.mockResolvedValueOnce({ id: 456 } as CreateCommentReturn)

    const event = {
      ...mockIssueAssignedEvent,
      labels: ['bug', 'high-priority', 'moderate-complexity'],
    }

    await handler(event, mockContext)

    expect(mockGithubClient.updateIssue).toHaveBeenCalledWith(
      event.owner,
      event.repo,
      event.issueNumber,
      expect.objectContaining({
        assignees: event.suggestedAssignees,
      })
    )

    expect(mockGithubClient.createComment).toHaveBeenCalledWith(
      event.owner,
      event.repo,
      event.issueNumber,
      expect.any(String)
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubIssueEvent.Assigned,
      data: expect.objectContaining({
        ...event,
        assignees: event.suggestedAssignees,
      }),
    })
  })

  it('should handle errors when updating the issue', async () => {
    const mockError = new Error('Update failed')
    mockGithubClient.updateIssue.mockRejectedValueOnce(mockError)

    const event = {
      ...mockIssueAssignedEvent,
      labels: ['bug', 'high-priority', 'moderate-complexity'],
    }

    await handler(event, mockContext)

    expect(mockContext.emit).not.toHaveBeenCalled()

    expect(mockContext.logger.error).toHaveBeenCalledWith(
      '[Assignee Selector] Failed to assign users',
      expect.objectContaining({
        error: mockError,
      })
    )

    expect(mockGithubClient.createComment).not.toHaveBeenCalled()
  })

  it('should handle errors when creating a comment', async () => {
    mockGithubClient.updateIssue.mockResolvedValueOnce({ id: 123 } as UpdateIssueReturn)
    const mockError = new Error('Comment failed')
    mockGithubClient.createComment.mockRejectedValueOnce(mockError)

    const event = {
      ...mockIssueAssignedEvent,
      labels: ['bug', 'high-priority', 'moderate-complexity'],
    }

    await handler(event, mockContext)

    expect(mockContext.logger.error).toHaveBeenCalledWith(
      '[Assignee Selector] Failed to assign users',
      expect.objectContaining({
        error: mockError,
      })
    )
  })

  it('should handle empty assignee suggestions', async () => {
    mockOpenAIClient.suggestAssignees.mockResolvedValueOnce([])

    const eventWithEmptyAssignees = {
      ...mockIssueAssignedEvent,
      assignees: [],
      labels: ['bug', 'high-priority', 'moderate-complexity'],
    }

    mockGithubClient.updateIssue.mockResolvedValueOnce({ id: 123 } as UpdateIssueReturn)
    mockGithubClient.createComment.mockResolvedValueOnce({ id: 456 } as CreateCommentReturn)

    await handler(eventWithEmptyAssignees, mockContext)

    expect(mockGithubClient.updateIssue).toHaveBeenCalledWith(
      eventWithEmptyAssignees.owner,
      eventWithEmptyAssignees.repo,
      eventWithEmptyAssignees.issueNumber,
      expect.objectContaining({
        assignees: [],
      })
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubIssueEvent.Assigned,
      data: expect.objectContaining({
        ...eventWithEmptyAssignees,
        assignees: [],
      }),
    })
  })
})
