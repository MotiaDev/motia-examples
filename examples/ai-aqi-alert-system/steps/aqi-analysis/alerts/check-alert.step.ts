import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { LocationSchema } from '../../../src/types/aqi.types';
import { fetchAQIData } from '../../../src/services/aqi/fetch-aqi-data';

const inputSchema = z.object({
  alertId: z.string(),
  userId: z.string(),
  location: LocationSchema,
  threshold: z.number(),
  email: z.string().email(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'CheckAlert',
  description: 'Check if AQI threshold is exceeded and send notification',
  subscribes: ['check-alert'],
  emits: ['send-alert-email'],
  input: inputSchema,
  flows: ['aqi-analysis'],
};

export const handler: Handlers['CheckAlert'] = async (input, { emit, logger }) => {
  const { alertId, userId, location, threshold, email } = input;
  
  try {
    logger.info('Checking alert threshold', { alertId, threshold });
    
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!firecrawlApiKey && !openWeatherApiKey) {
      throw new Error('At least one API key required: FIRECRAWL_API_KEY or OPENWEATHER_API_KEY');
    }
    
    // Fetch current AQI (with fallback)
    const aqiData = await fetchAQIData({ location, firecrawlApiKey, openWeatherApiKey });
    
    logger.info('Current AQI fetched', { 
      alertId, 
      currentAqi: aqiData.aqi, 
      threshold 
    });
    
    // Check if threshold exceeded
    if (aqiData.aqi >= threshold) {
      await emit({
        topic: 'send-alert-email',
        data: {
          alertId,
          email,
          location,
          currentAqi: aqiData.aqi,
          threshold,
          aqiData,
        },
      });
      
      logger.info('Alert threshold exceeded, notification sent', { 
        alertId, 
        currentAqi: aqiData.aqi 
      });
    } else {
      logger.info('Alert threshold not exceeded', { 
        alertId, 
        currentAqi: aqiData.aqi 
      });
    }
    
  } catch (error) {
    logger.error('Failed to check alert', {
      alertId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

