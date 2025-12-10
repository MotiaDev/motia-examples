import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { sendErrorAlert } from '../../services/slack.service';

const inputSchema = z.object({
  error: z.string(),
  context: z.string(),
  commitId: z.string().optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'SlackAlert',
  description: 'Send error alerts to Slack',
  subscribes: ['slack-error'],
  emits: [],
  input: inputSchema,
  flows: ['github-commit-jenkins']
};

export const handler: Handlers['SlackAlert'] = async (input, { logger }) => {
  try {
    const { error, context, commitId } = input;

    logger.info('Sending Slack alert', { context, commitId });

    // Send Slack notification
    const channel = process.env.SLACK_CHANNEL || '#alerts';
    await sendErrorAlert(channel, error, {
      context,
      ...(commitId && { commitId })
    });

    logger.info('Slack alert sent successfully', { context, commitId });

  } catch (err) {
    logger.error('Failed to send Slack alert', { 
      error: err instanceof Error ? err.message : 'Unknown error',
      originalError: input.error 
    });
  }
};

