import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { LocationSchema, AQIDataSchema } from '../../../src/types/aqi.types';
import type { HistoricalDataPoint } from '../../../src/types/state.types';

const inputSchema = z.object({
  location: LocationSchema,
  aqiData: AQIDataSchema,
});

export const config: EventConfig = {
  type: 'event',
  name: 'StoreHistoricalData',
  description: 'Store AQI data for historical trend analysis',
  subscribes: ['store-historical-data'],
  emits: [],
  input: inputSchema,
  flows: ['aqi-analysis'],
};

export const handler: Handlers['StoreHistoricalData'] = async (input, { logger, state }) => {
  const { location, aqiData } = input;
  
  try {
    const locationKey = `${location.country}-${location.state}-${location.city}`;
    const timestamp = new Date().toISOString();
    const dataPointId = `${locationKey}-${timestamp}`;
    
    const historicalPoint: HistoricalDataPoint = {
      location,
      aqi_data: aqiData,
      stored_at: timestamp,
    };
    
    await state.set('historical-data', dataPointId, historicalPoint);
    
    logger.info('Historical data stored', { 
      locationKey,
      aqi: aqiData.aqi,
    });
    
  } catch (error) {
    logger.error('Failed to store historical data', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
