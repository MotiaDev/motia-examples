import { StepConfig, StepHandler } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  text: z.string(),
  user: z.string(),
  channel: z.string(),
  time: z.string(),
  timestamp: z.string(),
});

export const config: StepConfig = {
  type: 'event',
  name: 'Task Reminder',
  description: 'Handles task reminders and sends notifications',
  input: inputSchema,
  subscribes: ['task_reminder'],
  emits: [],
  flows: ['default'],
};

export const handler: StepHandler<typeof config> = async (input, { logger }) => {
  try {
    const { text, user, channel, time, timestamp } = input;

    // Parse the reminder time
    const reminderTime = new Date(time);
    if (isNaN(reminderTime.getTime())) {
      throw new Error('Invalid time format');
    }

    // Calculate delay in milliseconds
    const delay = reminderTime.getTime() - new Date().getTime();
    if (delay <= 0) {
      throw new Error('Reminder time must be in the future');
    }

    // Schedule the reminder
    setTimeout(async () => {
      try {
        // Send reminder to Slack
        const slackToken = process.env.SLACK_BOT_TOKEN;
        if (!slackToken) {
          throw new Error('SLACK_BOT_TOKEN not set');
        }

        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${slackToken}`,
          },
          body: JSON.stringify({
            channel,
            text: `⏰ Reminder for <@${user}>: ${text}`,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send reminder');
        }

        logger.info(`Reminder sent to user ${user}: ${text}`);
      } catch (error: any) {
        logger.error('Error sending reminder:', error?.message || error);
      }
    }, delay);

    return;
  } catch (error: any) {
    logger.error('Error processing reminder:', error?.message || error);
    return;
  }
}; 