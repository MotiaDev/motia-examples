import { TrendData, Location } from '../../types/aqi.types'
import { predictTrend, generatePredictions } from '../../utils/aqi/aqi-utils'

export interface HistoricalDataPoint {
  timestamp: string
  aqi: number
  pm25?: number
  pm10?: number
  co?: number
  temperature?: number
  humidity?: number
  wind_speed?: number
}

export interface AnalyzeTrendsOptions {
  location: Location
  currentAqi: number
  historicalData: HistoricalDataPoint[]
}

export async function analyzeHistoricalTrends(
  options: AnalyzeTrendsOptions
): Promise<TrendData> {
  const { currentAqi, historicalData } = options
  
  if (historicalData.length < 3) {
    return {
      period: '0d',
      average_aqi: currentAqi,
      max_aqi: currentAqi,
      min_aqi: currentAqi,
      trend_direction: 'stable',
      data_points: [{ timestamp: new Date().toISOString(), aqi: currentAqi }],
    }
  }
  
  // Analyze different periods
  const periods = [
    { name: '24h', hours: 24 },
    { name: '7d', hours: 168 },
    { name: '30d', hours: 720 },
  ]
  
  const now = new Date()
  const trendAnalyses = []
  
  for (const period of periods) {
    const cutoffTime = new Date(now.getTime() - period.hours * 60 * 60 * 1000)
    const periodData = historicalData.filter(d => new Date(d.timestamp) >= cutoffTime)
    
    if (periodData.length >= 3) {
      const aqiValues = periodData.map(d => d.aqi)
      const average_aqi = aqiValues.reduce((sum, aqi) => sum + aqi, 0) / aqiValues.length
      const max_aqi = Math.max(...aqiValues)
      const min_aqi = Math.min(...aqiValues)
      const trend_direction = predictTrend(periodData)
      
      trendAnalyses.push({
        period: period.name,
        average_aqi: Math.round(average_aqi),
        max_aqi,
        min_aqi,
        trend_direction,
        data_points: periodData.map(d => ({
          timestamp: d.timestamp,
          aqi: d.aqi,
        })),
      })
    }
  }
  
  // Use the longest period with data, or 7d by default
  const primaryTrend = trendAnalyses.find(t => t.period === '7d') || trendAnalyses[trendAnalyses.length - 1]
  
  if (!primaryTrend) {
    throw new Error('Could not generate trend analysis')
  }
  
  // Generate predictions for next 24 hours
  const predictions = generatePredictions(historicalData, 24)
  
  return {
    ...primaryTrend,
    predictions,
  }
}

