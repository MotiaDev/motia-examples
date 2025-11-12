import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { LocationSchema, TrendDataSchema } from '../../../src/types/aqi.types';
import type { HistoricalDataPoint } from '../../../src/types/state.types';
import { calculateTrend } from '../../../src/utils/aqi/aqi-utils';

const inputSchema = z.object({
  requestId: z.string(),
  location: LocationSchema,
  currentAqi: z.number(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'AnalyzeTrends',
  description: 'Analyze historical AQI trends for a location',
  subscribes: ['analyze-trends'],
  emits: [],
  input: inputSchema,
  flows: ['aqi-analysis'],
};

export const handler: Handlers['AnalyzeTrends'] = async (input, { logger, state }) => {
  const { requestId, location, currentAqi } = input;
  
  try {
    logger.info('Starting trend analysis', { requestId, location });
    
    // Get historical data for this location
    const locationKey = `${location.country}-${location.state}-${location.city}`;
    const historicalData = await state.getGroup<HistoricalDataPoint>('historical-data');
    
    // Filter data for this location from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const locationHistory = historicalData
      .filter(point => {
        const pointKey = `${point.location.country}-${point.location.state}-${point.location.city}`;
        return pointKey === locationKey && new Date(point.stored_at) > sevenDaysAgo;
      })
      .sort((a, b) => new Date(a.stored_at).getTime() - new Date(b.stored_at).getTime());
    
    if (locationHistory.length < 2) {
      logger.info('Not enough historical data for trend analysis', { 
        requestId, 
        dataPoints: locationHistory.length 
      });
      return;
    }
    
    // Calculate trend
    const aqiValues = locationHistory.map(point => point.aqi_data.aqi);
    const trend = calculateTrend(aqiValues);
    const avgAqi = aqiValues.reduce((sum, val) => sum + val, 0) / aqiValues.length;
    const maxAqi = Math.max(...aqiValues);
    const minAqi = Math.min(...aqiValues);
    
    // Determine trend direction
    let trendDirection: 'improving' | 'worsening' | 'stable';
    if (trend > 5) {
      trendDirection = 'worsening';
    } else if (trend < -5) {
      trendDirection = 'improving';
    } else {
      trendDirection = 'stable';
    }
    
    const trendData = {
      period: '7d',
      average_aqi: Math.round(avgAqi),
      max_aqi: maxAqi,
      min_aqi: minAqi,
      trend_direction: trendDirection,
      data_points: locationHistory.map(point => ({
        timestamp: point.stored_at,
        aqi: point.aqi_data.aqi,
      })),
    };
    
    const validatedTrend = TrendDataSchema.parse(trendData);
    await state.set('aqi-trends', requestId, validatedTrend);
    
    logger.info('Trend analysis completed', { 
      requestId, 
      trendDirection,
      dataPoints: locationHistory.length,
    });
    
  } catch (error) {
    logger.error('Failed to analyze trends', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
