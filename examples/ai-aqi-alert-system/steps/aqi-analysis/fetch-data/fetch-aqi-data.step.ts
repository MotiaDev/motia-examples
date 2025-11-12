import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { LocationSchema, AQIDataSchema } from '../../../src/types/aqi.types';
import { fetchAQIData } from '../../../src/services/aqi/fetch-aqi-data';
import type { AQIRequest } from '../../../src/types/state.types';

const inputSchema = z.object({
  requestId: z.string(),
  location: LocationSchema,
  include_trends: z.boolean().optional(),
  compare_nearby: z.boolean().optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'FetchAQIData',
  description: 'Fetch real-time AQI data using Firecrawl web scraping',
  subscribes: ['fetch-aqi-data'],
  emits: [
    'generate-health-recommendations',
    'store-historical-data',
    {
      topic: 'analyze-trends',
      conditional: true,
    },
  ],
  input: inputSchema,
  flows: ['aqi-analysis'],
};

export const handler: Handlers['FetchAQIData'] = async (input, { emit, logger, state }) => {
  const { requestId, location, include_trends } = input;
  
  try {
    logger.info('Starting AQI data fetch', { requestId, location });
    
    // Update request status
    const request = await state.get<AQIRequest>('aqi-requests', requestId);
    if (request) {
      await state.set('aqi-requests', requestId, {
        ...request,
        status: 'fetching_data',
      });
    }
    
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!firecrawlApiKey && !openWeatherApiKey) {
      throw new Error('At least one API key required: FIRECRAWL_API_KEY or OPENWEATHER_API_KEY');
    }
    
    logger.info('Fetching AQI data', { 
      requestId, 
      location,
      primarySource: firecrawlApiKey ? 'Firecrawl' : 'OpenWeatherMap',
      fallbackAvailable: !!(firecrawlApiKey && openWeatherApiKey),
    });
    
    // Use the fetchAQIData service with fallback support
    const aqiData = await fetchAQIData({
      location,
      firecrawlApiKey,
      openWeatherApiKey,
    });
    
    logger.info('AQI data fetched successfully', {
      requestId,
      aqi: aqiData.aqi,
      temperature: aqiData.temperature,
      pm25: aqiData.pm25,
      sourceUrl: aqiData.source_url,
    });
    
    const validatedAqiData = AQIDataSchema.parse(aqiData);
    
    logger.info('AQI data validated', { 
      requestId,
      aqi: validatedAqiData.aqi,
      pm25: validatedAqiData.pm25,
    });
    
    // Store AQI data in state for other steps to access
    await state.set('aqi-data', requestId, validatedAqiData);
    
    // Emit to generate health recommendations
    await emit({
      topic: 'generate-health-recommendations',
      data: {
        requestId,
        location,
        aqiData: validatedAqiData,
        include_trends,
      },
    });
    
    // Store for historical analysis
    await emit({
      topic: 'store-historical-data',
      data: {
        location,
        aqiData: validatedAqiData,
      },
    });
    
    // Analyze trends if requested
    if (include_trends) {
      await emit({
        topic: 'analyze-trends',
        data: {
          requestId,
          location,
          currentAqi: validatedAqiData.aqi,
        },
      });
    }
    
    logger.info('AQI data fetch completed', { requestId });
    
  } catch (error) {
    logger.error('Failed to fetch AQI data', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Update request with error status
    const request = await state.get<AQIRequest>('aqi-requests', requestId);
    if (request) {
      await state.set('aqi-requests', requestId, {
        ...request,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch AQI data',
      });
    }
    
    // Store error in results
    await state.set('aqi-results', requestId, {
      request_id: requestId,
      location,
      error: 'Failed to fetch AQI data',
      details: error instanceof Error ? error.message : 'Unknown error',
      created_at: new Date().toISOString(),
    });
  }
};
