import OpenAI from 'openai'
import { OpenAIClient } from '../../services/openai/OpenAIClient'
import {
  mockPRClassification,
  mockIssueClassification,
  mockTeamMembers,
} from '../mocks/github-events.mock'

jest.mock('openai')

describe('OpenAIClient', () => {
  let openaiClient: OpenAIClient
  let mockCreateCompletion: jest.Mock

  beforeEach(() => {
    const originalApiKey = process.env.OPENAI_API_KEY
    const originalModel = process.env.OPENAI_MODEL

    process.env.OPENAI_API_KEY = 'test-api-key'
    process.env.OPENAI_MODEL = 'gpt-3.5-turbo'

    mockCreateCompletion = jest.fn()

    const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>
    MockOpenAI.mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: mockCreateCompletion,
            },
          },
        } as unknown as OpenAI)
    )

    openaiClient = new OpenAIClient()

    process.env.OPENAI_API_KEY = originalApiKey
    process.env.OPENAI_MODEL = originalModel
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('classifyIssue', () => {
    it('should classify an issue successfully', async () => {
      const title = 'Bug: Login page crashes'
      const body = 'The login page crashes when submitting the form'

      mockCreateCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockIssueClassification),
            },
          },
        ],
      })

      const result = await openaiClient.classifyIssue(title, body)

      expect(mockCreateCompletion).toHaveBeenCalled()
      expect(result).toEqual(mockIssueClassification)
    })

    it('should handle empty response from OpenAI', async () => {
      mockCreateCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: '',
            },
          },
        ],
      })

      const result = await openaiClient.classifyIssue('title', 'body')

      expect(result).toEqual({})
    })
  })

  describe('suggestAssignees', () => {
    it('should suggest assignees successfully', async () => {
      const title = 'Feature: Add authentication'
      const body = 'Add OAuth2 authentication to the app'
      const suggestedAssignees = ['security-expert', 'backend-dev']

      mockCreateCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(suggestedAssignees),
            },
          },
        ],
      })

      const result = await openaiClient.suggestAssignees(title, body, mockTeamMembers)

      expect(mockCreateCompletion).toHaveBeenCalled()
      expect(result).toEqual(suggestedAssignees)
    })

    it('should handle empty response when suggesting assignees', async () => {
      mockCreateCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: '',
            },
          },
        ],
      })

      const result = await openaiClient.suggestAssignees('title', 'body', mockTeamMembers)

      expect(result).toEqual([])
    })
  })

  describe('suggestReviewers', () => {
    it('should suggest reviewers successfully', async () => {
      const title = 'Feature: Add authentication'
      const body = 'Add OAuth2 authentication to the app'
      const suggestedReviewers = ['security-expert', 'backend-dev']

      mockCreateCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'security-expert backend-dev',
            },
          },
        ],
      })

      const result = await openaiClient.suggestReviewers(
        title,
        body,
        mockTeamMembers,
        mockPRClassification
      )

      expect(mockCreateCompletion).toHaveBeenCalled()
      expect(result).toEqual(suggestedReviewers)
    })

    it('should handle empty response when suggesting reviewers', async () => {
      mockCreateCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: '',
            },
          },
        ],
      })

      const result = await openaiClient.suggestReviewers(
        'title',
        'body',
        mockTeamMembers,
        mockPRClassification
      )

      expect(result).toEqual([])
    })

    it('should filter out non-existent team members', async () => {
      mockCreateCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'security-expert non-existent-user',
            },
          },
        ],
      })

      const result = await openaiClient.suggestReviewers(
        'title',
        'body',
        mockTeamMembers,
        mockPRClassification
      )

      expect(result).toEqual(['security-expert'])
    })
  })

  describe('classifyPR', () => {
    it('should classify a PR successfully', async () => {
      const title = 'Feature: Add authentication'
      const body = 'Add OAuth2 authentication to the app'

      mockCreateCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockPRClassification),
            },
          },
        ],
      })

      const result = await openaiClient.classifyPR(title, body)

      expect(mockCreateCompletion).toHaveBeenCalled()
      expect(result).toEqual(mockPRClassification)
    })

    it('should handle invalid JSON response', async () => {
      mockCreateCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'not valid json',
            },
          },
        ],
      })

      await expect(openaiClient.classifyPR('title', 'body')).rejects.toThrow(
        'Failed to parse PR classification response'
      )
    })
  })
})
