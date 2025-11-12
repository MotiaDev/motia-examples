import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { LocationSchema } from '../../../src/types/aqi.types';
import type { AlertState } from '../../../src/types/state.types';
import { randomUUID } from 'crypto';

const subscriptionSchema = z.object({
  user_id: z.string(),
  email: z.string().email(),
  location: LocationSchema,
  aqi_threshold: z.number().min(0).max(500),
});

const responseSchema = {
  201: z.object({
    alert_id: z.string(),
    message: z.string(),
  }),
  400: z.object({ error: z.string() }),
  500: z.object({ error: z.string() }),
};

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'SubscribeAlert',
  description: 'Subscribe to AQI alerts for a location',
  path: '/aqi/alerts/subscribe',
  method: 'POST',
  bodySchema: subscriptionSchema,
  responseSchema,
  emits: [],
  flows: ['aqi-analysis'],
};

export const handler: Handlers['SubscribeAlert'] = async (req, { logger, state }) => {
  try {
    const subscription = subscriptionSchema.parse(req.body);
    const alertId = randomUUID();
    
    logger.info('Creating alert subscription', {
      alertId,
      userId: subscription.user_id,
      threshold: subscription.aqi_threshold,
    });
    
    const alertState: AlertState = {
      alert_id: alertId,
      user_id: subscription.user_id,
      locations: [subscription.location],
      thresholds: {
        aqi_level: subscription.aqi_threshold,
        notification_channels: ['email'],
      },
      email: subscription.email,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await state.set('alert-subscriptions', alertId, alertState);
    
    logger.info('Alert subscription created', { alertId });
    
    return {
      status: 201,
      body: {
        alert_id: alertId,
        message: 'Alert subscription created successfully',
      },
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: {
          error: 'Invalid subscription data',
        },
      };
    }
    
    logger.error('Failed to create alert subscription', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      status: 500,
      body: {
        error: 'Failed to create subscription',
      },
    };
  }
};

