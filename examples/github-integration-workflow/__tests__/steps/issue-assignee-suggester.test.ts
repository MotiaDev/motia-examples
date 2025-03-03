import { createMockContext } from '@motiadev/test'
import { handler } from '../../steps/issue-triage/assignee-selector.step'
import { GithubIssueEvent } from '../../types/github-events'
import {
  mockIssueClassifiedEvent,
  mockSuggestedAssignees,
  mockTeamMembers,
} from '../mocks/issue-events.mock'
import { OpenAIClient } from '../../services/openai/OpenAIClient'
import { GithubClient } from '../../services/github/GithubClient'

jest.mock('../../services/openai/OpenAIClient')
const MockOpenAIClient = OpenAIClient as jest.MockedClass<typeof OpenAIClient>
jest.mock('../../services/github/GithubClient')
const MockGithubClient = GithubClient as jest.MockedClass<typeof GithubClient>

describe('Issue Assignee Suggester Step', () => {
  let mockContext: ReturnType<typeof createMockContext>
  let mockOpenAIClient: jest.Mocked<OpenAIClient>
  let mockGithubClient: jest.Mocked<GithubClient>

  beforeEach(() => {
    mockContext = createMockContext()

    mockOpenAIClient = {
      suggestAssignees: jest.fn(),
    } as unknown as jest.Mocked<OpenAIClient>

    mockGithubClient = {
      updateIssue: jest.fn().mockResolvedValue({}),
      createComment: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<GithubClient>

    MockOpenAIClient.mockImplementation(() => mockOpenAIClient)
    MockGithubClient.mockImplementation(() => mockGithubClient)

    process.env.TEAM_MEMBERS = JSON.stringify(mockTeamMembers)
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.TEAM_MEMBERS
  })

  it('should suggest assignees for a classified issue and emit an event', async () => {
    mockOpenAIClient.suggestAssignees.mockResolvedValueOnce(mockSuggestedAssignees)

    const event = {
      ...mockIssueClassifiedEvent,
      labels: ['bug', 'high-priority', 'moderate-complexity'],
    }

    await handler(event, mockContext)

    expect(mockOpenAIClient.suggestAssignees).toHaveBeenCalledWith(
      event.title,
      event.body || '',
      expect.any(Array)
    )

    expect(mockGithubClient.updateIssue).toHaveBeenCalledWith(
      event.owner,
      event.repo,
      event.issueNumber,
      { assignees: mockSuggestedAssignees }
    )

    expect(mockGithubClient.createComment).toHaveBeenCalledWith(
      event.owner,
      event.repo,
      event.issueNumber,
      expect.stringContaining(mockSuggestedAssignees[0])
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubIssueEvent.Assigned,
      data: {
        ...event,
        assignees: mockSuggestedAssignees,
      },
    })

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      '[Assignee Selector] Finding suitable assignees',
      expect.objectContaining({
        issueNumber: event.issueNumber,
      })
    )
  })

  it('should handle errors from OpenAI client', async () => {
    const mockError = new Error('Suggestion failed')
    mockOpenAIClient.suggestAssignees.mockRejectedValueOnce(mockError)

    const event = {
      ...mockIssueClassifiedEvent,
      labels: ['bug', 'high-priority', 'moderate-complexity'],
    }

    await handler(event, mockContext)

    expect(mockGithubClient.updateIssue).not.toHaveBeenCalled()
    expect(mockGithubClient.createComment).not.toHaveBeenCalled()

    expect(mockContext.emit).not.toHaveBeenCalled()

    expect(mockContext.logger.error).toHaveBeenCalledWith(
      '[Assignee Selector] Failed to assign users',
      expect.objectContaining({
        error: mockError,
        issueNumber: event.issueNumber,
      })
    )
  })

  it('should handle empty assignee suggestions', async () => {
    mockOpenAIClient.suggestAssignees.mockResolvedValueOnce([])

    const event = {
      ...mockIssueClassifiedEvent,
      labels: ['bug', 'high-priority', 'moderate-complexity'],
    }

    await handler(event, mockContext)

    expect(mockGithubClient.updateIssue).toHaveBeenCalledWith(
      event.owner,
      event.repo,
      event.issueNumber,
      { assignees: [] }
    )

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubIssueEvent.Assigned,
      data: {
        ...event,
        assignees: [],
      },
    })
  })

  it('should handle missing team members configuration', async () => {
    delete process.env.TEAM_MEMBERS

    const mockError = new Error('Team members not configured')
    mockOpenAIClient.suggestAssignees.mockRejectedValueOnce(mockError)

    const event = {
      ...mockIssueClassifiedEvent,
      labels: ['bug', 'high-priority', 'moderate-complexity'],
    }

    await handler(event, mockContext)

    expect(mockGithubClient.updateIssue).not.toHaveBeenCalled()
    expect(mockGithubClient.createComment).not.toHaveBeenCalled()

    expect(mockContext.emit).not.toHaveBeenCalled()

    expect(mockContext.logger.error).toHaveBeenCalledWith(
      '[Assignee Selector] Failed to assign users',
      expect.objectContaining({
        issueNumber: event.issueNumber,
      })
    )
  })
})
