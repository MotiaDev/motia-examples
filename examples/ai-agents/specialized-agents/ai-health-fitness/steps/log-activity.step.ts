import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { logUserActivity } from '../shared/sqliteLogger';


const schema = z.object({
  user: z.string(),
  weight: z.string().optional(),
  workout: z.string().optional(),
  meal: z.string().optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'log-user-activity',
  description: 'Logs user weight, workout, or meal to SQLite',
  subscribes: ['user-activity-log'],
  emits: [],
  input: schema,
  flows: ['health-companion']
};

export const handler: Handlers['log-user-activity'] = async (input, { logger }) => {
  const { user, weight = '', workout = '', meal = '' } = input;

  try {
    logUserActivity(user, weight, workout, meal);
    logger.info('User activity logged to SQLite');
  } catch (err) {
    logger.error(`DB Logger Error: ${err}`);
    throw err;
  }
};
