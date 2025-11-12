import { CronConfig, Handlers } from 'motia';
import type { AlertState } from '../../../src/types/state.types';

export const config: CronConfig = {
  type: 'cron',
  name: 'CheckAQIAlerts',
  description: 'Check AQI levels for subscribed locations and send alerts',
  cron: '0 * * * *', // Every hour
  emits: ['check-alert'],
  flows: ['aqi-analysis'],
};

export const handler: Handlers['CheckAQIAlerts'] = async ({ logger, emit, state }) => {
  try {
    logger.info('Starting AQI alert check');
    
    const subscriptions = await state.getGroup<AlertState>('alert-subscriptions');
    const activeSubscriptions = subscriptions.filter(sub => sub.active);
    
    logger.info('Found active subscriptions', { count: activeSubscriptions.length });
    
    for (const subscription of activeSubscriptions) {
      for (const location of subscription.locations) {
        await emit({
          topic: 'check-alert',
          data: {
            alertId: subscription.alert_id,
            userId: subscription.user_id,
            location,
            threshold: subscription.thresholds.aqi_level,
            email: subscription.email,
          },
        });
      }
    }
    
    logger.info('Alert checks initiated', { 
      subscriptions: activeSubscriptions.length 
    });
    
  } catch (error) {
    logger.error('Failed to check alerts', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
