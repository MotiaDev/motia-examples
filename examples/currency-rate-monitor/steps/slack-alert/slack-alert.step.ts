import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  requestId: z.string(),
  query: z.string().optional(),
  error: z.string(),
  timestamp: z.string()
});

export const config: EventConfig = {
  type: 'event',
  name: 'SlackAlert',
  description: 'Sends error alerts to Slack channel',
  subscribes: ['slack.error'],
  emits: [],
  input: inputSchema,
  flows: ['currency-rate-monitor']
};

export const handler: Handlers['SlackAlert'] = async (input, { logger }) => {
  const { requestId, query, error, timestamp } = input;
  
  logger.info('Sending Slack alert', { requestId });

  try {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    const slackChannel = process.env.SLACK_CHANNEL || '#alerts';

    if (!slackWebhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    // Build error message
    const message = {
      channel: slackChannel,
      username: 'Currency Rate Monitor',
      icon_emoji: ':warning:',
      text: '🚨 *Currency Rate Monitor Error*',
      attachments: [
        {
          color: 'danger',
          fields: [
            {
              title: 'Request ID',
              value: requestId,
              short: true
            },
            {
              title: 'Timestamp',
              value: timestamp,
              short: true
            },
            {
              title: 'Query',
              value: query || 'N/A',
              short: false
            },
            {
              title: 'Error',
              value: `\`\`\`${error}\`\`\``,
              short: false
            }
          ],
          footer: 'Currency Rate Monitor',
          ts: Math.floor(new Date(timestamp).getTime() / 1000)
        }
      ]
    };

    // Send to Slack
    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    logger.info('Slack alert sent successfully', { requestId });
  } catch (error) {
    logger.error('Slack alert failed', { 
      requestId,
      error: (error as Error).message 
    });
    // Don't throw - we don't want alerting failures to break the main flow
  }
};

