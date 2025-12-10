import { createMockContext } from '@motiadev/test'
import { handler } from '../slack-notifier.step'
import { SlackService } from '../../services/slack.service'

jest.mock('../../services/slack.service')

describe('Slack Notifier Handler', () => {
  const mockSendMessage = jest.fn()
  const mockContext = createMockContext()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(SlackService as jest.Mock).mockImplementation(() => ({
      sendMessage: mockSendMessage,
    }))
  })

  it('should send message to specified channel', async () => {
    const notification = {
      channel: 'test-channel',
      message: 'Test message',
    }

    await handler(notification, mockContext)

    expect(mockSendMessage).toHaveBeenCalledWith('test-channel', 'Test message')
  })
})
