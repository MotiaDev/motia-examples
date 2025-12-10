import axios from 'axios'
import {Logger} from "motia";
import {createMockLogger} from "@motiadev/test";
import {SlackService} from '../slack.service'

jest.mock('axios')
jest.mock('motia')

describe('SlackService', () => {
  let slackService: SlackService
  const mockWebhookUrl = 'https://hooks.slack.com/test'
  let mockLogger: jest.Mocked<Logger>

  beforeEach(() => {
    mockLogger = createMockLogger()

    slackService = new SlackService(mockWebhookUrl, mockLogger)
    ;(axios.post as jest.Mock).mockClear()
  })

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      ;(axios.post as jest.Mock).mockResolvedValue({ data: 'ok' })

      await slackService.sendMessage('#test-channel', 'Test message')

      expect(axios.post).toHaveBeenCalledWith(mockWebhookUrl, {
        channel: '#test-channel',
        text: 'Test message',
      })
    })

    it('should handle network errors', async () => {
      const mockError = new Error('Network error')
      ;(axios.post as jest.Mock).mockRejectedValue(mockError)

      await expect(slackService.sendMessage('#test-channel', 'Test message')).rejects.toThrow('Network error')
      expect(mockLogger.error).toHaveBeenCalledWith('Error sending Slack message', mockError)
    })
  })
})
