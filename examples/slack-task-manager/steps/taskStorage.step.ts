import { StepConfig, StepHandler } from 'motia';
import { z } from 'zod';


const tasks: Array<{
  id: string;
  text: string;
  user: string;
  channel: string;
  status: 'pending' | 'completed';
  createdAt: string;
}> = [];

const inputSchema = z.object({
  text: z.string(),
  user: z.string(),
  channel: z.string(),
  timestamp: z.string(),
});

export const config: StepConfig = {
  type: 'event',
  name: 'Task Storage',
  description: 'Manages task storage and state',
  input: inputSchema,
  subscribes: ['task_created', 'task_completed'],
  emits: ['task_updated'],
};

export const handler: StepHandler<typeof config> = async (input, { logger, emit, topic }) => {
  try {
    const { text, user, channel, timestamp } = input;

    if (topic === 'task_created') {
      // Create new task
      const newTask = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        user,
        channel,
        status: 'pending' as const,
        createdAt: timestamp,
      };
      tasks.push(newTask);

      logger.info(`Task created: ${newTask.id}`);
      return;
    }

    if (topic === 'task_completed') {
      // Find and update task
      const taskIndex = tasks.findIndex(t => t.text === text && t.user === user && t.status === 'pending');
      if (taskIndex !== -1) {
        tasks[taskIndex].status = 'completed';
        logger.info(`Task completed: ${tasks[taskIndex].id}`);
      }
      return;
    }
  } catch (error: any) {
    logger.error('Error managing task:', error?.message || error);
    return;
  }
}; 