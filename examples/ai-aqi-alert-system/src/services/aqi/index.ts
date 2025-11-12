/**
 * AQI Service
 * Business logic for air quality analysis
 */

import { fetchAQIData } from './fetch-aqi-data'
import { generateHealthRecommendations } from './generate-recommendations'
import { analyzeHistoricalTrends } from './analyze-trends'
import { checkAlertThreshold } from './check-alerts'

export const aqiService = {
  fetchAQIData,
  generateHealthRecommendations,
  analyzeHistoricalTrends,
  checkAlertThreshold,
}

