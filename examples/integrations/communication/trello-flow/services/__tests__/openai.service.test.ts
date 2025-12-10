import OpenAI from 'openai'
import {Logger} from "motia";
import {createMockLogger} from "@motiadev/test";
import {OpenAIService} from '../openai.service'
import {appConfig} from '../../config/default'

jest.mock('openai')
jest.mock('../../config/default', () => ({
  appConfig: {
    openai: {
      apiKey: 'test-key',
      model: 'gpt-3.5-turbo',
    },
  },
}))

describe('OpenAIService', () => {
  let openaiService: OpenAIService
  let mockLogger: jest.Mocked<Logger>
  let mockCreateCompletion: jest.Mock

  beforeEach(() => {
    mockCreateCompletion = jest.fn()
    mockLogger = createMockLogger()
    ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: mockCreateCompletion,
            },
          },
        }) as any,
    )

    openaiService = new OpenAIService(mockLogger)
  })

  describe('generateSummary', () => {
    it('should generate a summary successfully', async () => {
      const mockSummary = 'Generated summary'
      mockCreateCompletion.mockResolvedValue({
        choices: [{ message: { content: mockSummary } }],
      })

      const result = await openaiService.generateSummary('Test Title', 'Test Description')

      expect(result).toBe(mockSummary)
      expect(mockLogger.info).toHaveBeenCalledWith('Generating summary for task', { title: 'Test Title' })
      expect(mockLogger.info).toHaveBeenCalledWith('Summary generated successfully')
      expect(mockCreateCompletion).toHaveBeenCalledWith({
        model: appConfig.openai.model,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Test Title'),
          },
        ],
        temperature: 0.5,
        max_tokens: 50,
      })
    })

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error')
      mockCreateCompletion.mockRejectedValue(mockError)

      await expect(openaiService.generateSummary('Test Title', 'Test Description')).rejects.toThrow(
        'Unable to generate summary at this time',
      )

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to generate summary', { error: mockError })
    })

    it('should handle empty response gracefully', async () => {
      mockCreateCompletion.mockResolvedValue({
        choices: [],
      })

      const result = await openaiService.generateSummary('Test Title', 'Test Description')

      expect(result).toBe('No summary generated')
    })
  })
})
