import { WebClient } from '@slack/web-api';

let slack: WebClient;

function getSlackClient(): WebClient {
  if (!slack) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error('Slack bot token not configured. Please set SLACK_BOT_TOKEN in your .env file');
    }
    slack = new WebClient(token);
  }
  return slack;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
  attachments?: any[];
}

/**
 * Send a message to a Slack channel
 */
export async function sendMessage(message: SlackMessage): Promise<void> {
  try {
    const client = getSlackClient();
    await client.chat.postMessage({
      channel: message.channel,
      text: message.text,
      blocks: message.blocks,
      attachments: message.attachments,
    });
  } catch (error: any) {
    throw new Error(`Failed to send Slack message: ${error.message}`);
  }
}

/**
 * Send an error alert to the configured alerts channel
 */
export async function sendErrorAlert(error: {
  message: string;
  context?: string;
  traceId?: string;
  timestamp?: string;
}): Promise<void> {
  const channel = process.env.SLACK_ALERT_CHANNEL || '#alerts';
  
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 Public Form Auto Triage Error',
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Error:*\n${error.message}`
        },
        {
          type: 'mrkdwn',
          text: `*Time:*\n${error.timestamp || new Date().toISOString()}`
        }
      ]
    }
  ];

  if (error.context) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Context:*\n\`\`\`${error.context}\`\`\``
      }
    } as any);
  }

  if (error.traceId) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Trace ID: \`${error.traceId}\``
        }
      ]
    } as any);
  }

  await sendMessage({
    channel,
    text: `Public Form Auto Triage error: ${error.message}`,
    blocks
  });
}

/**
 * Send a success notification
 */
export async function sendSuccessNotification(data: {
  message: string;
  details?: Record<string, any>;
}): Promise<void> {
  const channel = process.env.SLACK_ALERT_CHANNEL || '#alerts';
  
  await sendMessage({
    channel,
    text: data.message,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ ${data.message}`
        }
      }
    ]
  });
}

