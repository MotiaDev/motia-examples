import { ApiRouteConfig, StepHandler, ApiRequest } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  command: z.string(),
  text: z.string(),
  user_id: z.string(),
  channel_id: z.string(),
  response_url: z.string(),
})

// In-memory task storage (shared with taskStorage.step.ts)
const tasks: Array<{
  id: string;
  text: string;
  user: string;
  channel: string;
  status: 'pending' | 'completed';
  createdAt: string;
}> = []

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Slack Task Manager',
  description: 'Handles Slack slash commands for task management',
  path: '/slack/command',
  method: 'POST',
  bodySchema: inputSchema,
  flows: ['default'],
  emits: ['task_created', 'task_reminder', 'task_completed'],
  virtualSubscribes: ['/slack/command'],
}


export const handler: StepHandler<typeof config> = async (req: ApiRequest, { logger, emit }) => {
  try {
    logger.info('Received Slack command:', {
      headers: req.headers,
      body: req.body
    });

    const body = req.body as {
      command: string;
      text: string;
      user_id: string;
      channel_id: string;
      response_url: string;
    };

    // Verify Slack token
    const slackToken = process.env.SLACK_VERIFICATION_TOKEN;
    const requestToken = req.headers['x-slack-request-token'] || req.headers['x-slack-signature'];
    logger.info('Token verification:', {
      hasSlackToken: !!slackToken,
      requestToken: requestToken
    });

    if (!slackToken || !requestToken) {
      logger.error('Missing Slack token or request token');
      return {
        status: 401,
        body: { error: 'Unauthorized' },
      };
    }

    // Handle different commands
    switch (body.command) {
      case '/task':
        // Create a new task
        const taskData = {
          topic: 'task_created',
          data: {
            text: body.text,
            user: body.user_id,
            channel: body.channel_id,
            timestamp: new Date().toISOString(),
          }
        };
        
        await emit(taskData);
        
        return {
          status: 200,
          body: {
            response_type: 'in_channel',
            text: `✅ Task created: ${body.text}`,
          },
        };

      case '/reminder':
        // Schedule a reminder
        const [time, ...reminderText] = body.text.split(' ');
        const reminderData = {
          topic: 'task_reminder',
          data: {
            text: reminderText.join(' '),
            user: body.user_id,
            channel: body.channel_id,
            time: time,
            timestamp: new Date().toISOString(),
          }
        };
        
        await emit(reminderData);
        
        return {
          status: 200,
          body: {
            response_type: 'in_channel',
            text: `⏰ Reminder set for ${time}: ${reminderText.join(' ')}`,
          },
        };

      case '/complete':
        // Mark a task as complete
        const completeData = {
          topic: 'task_completed',
          data: {
            text: body.text,
            user: body.user_id,
            channel: body.channel_id,
            timestamp: new Date().toISOString(),
          }
        };
        
        await emit(completeData);
        
        return {
          status: 200,
          body: {
            response_type: 'in_channel',
            text: `✅ Task completed: ${body.text}`,
          },
        };

      case '/list':
        // List all tasks
        const userTasks = tasks.filter(t => t.user === body.user_id);
        if (userTasks.length === 0) {
          return {
            status: 200,
            body: {
              response_type: 'ephemeral',
              text: 'You have no tasks.',
            },
          };
        }

        const taskList = userTasks.map(t => 
          `${t.status === 'completed' ? '✅' : '⏳'} ${t.text} (${new Date(t.createdAt).toLocaleString()})`
        ).join('\n');

        return {
          status: 200,
          body: {
            response_type: 'ephemeral',
            text: `Your tasks:\n${taskList}`,
          },
        };

      default:
        return {
          status: 200,
          body: {
            response_type: 'ephemeral',
            text: 'Unknown command. Available commands: /task, /reminder, /complete, /list',
          },
        };
    }
  } catch (error: any) {
    logger.error('Error processing Slack command:', error?.message || error);
    return {
      status: 500,
      body: { error: error?.message || 'Internal server error' },
    };
  }
}
