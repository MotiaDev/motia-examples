import axios from 'axios'
import { Logger } from 'motia'

export class SlackService {
  private logger: Logger

  constructor(private webhookUrl: string, logger: Logger) {
    this.logger = logger
  }

  async sendMessage(channel: string, message: string) {
    try {
      await axios.post(this.webhookUrl, {
        channel,
        text: message,
      })
    } catch (error) {
      this.logger.error('Error sending Slack message', error)
      throw error
    }
  }
}
