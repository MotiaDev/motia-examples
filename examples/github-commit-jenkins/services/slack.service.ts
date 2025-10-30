import { WebClient } from '@slack/web-api';

let slack: WebClient | null = null;

function getSlackClient(): WebClient {
  if (!slack) {
    slack = new WebClient(process.env.SLACK_TOKEN);
  }
  return slack;
}

export interface SlackMessage {
  channel: string;
  text: string;
  commitId?: string;
  metadata?: Record<string, any>;
}

/**
 * Send a message to Slack
 * @param message - The message details
 */
export async function sendSlackMessage(message: SlackMessage): Promise<void> {
  const client = getSlackClient();
  try {
    const blocks = buildMessageBlocks(message);

    await client.chat.postMessage({
      channel: message.channel,
      text: message.text,
      blocks,
    });
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw new Error('Failed to send Slack message');
  }
}

/**
 * Send an error alert to Slack
 * @param channel - The Slack channel
 * @param error - The error message
 * @param context - Additional context
 */
export async function sendErrorAlert(
  channel: string,
  error: string,
  context?: Record<string, any>
): Promise<void> {
  const client = getSlackClient();
  try {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 GitHub Commit Jenkins Error',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:*\n${error}`,
        },
      },
    ];

    if (context) {
      blocks.push({
        type: 'section',
        fields: Object.entries(context).map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}:*\n${value}`,
        })),
      } as any);
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `⏰ ${new Date().toISOString()}`,
        },
      ],
    });

    await client.chat.postMessage({
      channel,
      text: `Error: ${error}`,
      blocks,
    });
  } catch (err) {
    console.error('Error sending Slack alert:', err);
    throw new Error('Failed to send Slack alert');
  }
}

/**
 * Build message blocks for better formatting
 */
function buildMessageBlocks(message: SlackMessage): any[] {
  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message.text,
      },
    },
  ];

  if (message.commitId) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Commit ID: \`${message.commitId}\``,
        },
      ],
    });
  }

  if (message.metadata) {
    blocks.push({
      type: 'section',
      fields: Object.entries(message.metadata).map(([key, value]) => ({
        type: 'mrkdwn',
        text: `*${key}:*\n${value}`,
      })),
    });
  }

  return blocks;
}

/**
 * Send a success notification to Slack
 * @param channel - The Slack channel
 * @param message - Success message
 * @param details - Additional details
 */
export async function sendSuccessNotification(
  channel: string,
  message: string,
  details?: Record<string, any>
): Promise<void> {
  const client = getSlackClient();
  try {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '✅ GitHub Commit Jenkins Success',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
    ];

    if (details) {
      blocks.push({
        type: 'section',
        fields: Object.entries(details).map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}:*\n${value}`,
        })),
      } as any);
    }

    await client.chat.postMessage({
      channel,
      text: message,
      blocks,
    });
  } catch (error) {
    console.error('Error sending success notification:', error);
    throw new Error('Failed to send success notification');
  }
}

