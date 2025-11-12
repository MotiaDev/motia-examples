import { z } from 'zod';
import { 
  Location, 
  AQIData, 
  UserContext, 
  HealthRecommendation,
  TrendData,
  AlertSubscription,
} from './aqi.types';

/**
 * State types for AQI Analysis system
 * These types define the structure of data stored in Motia's state management
 */

export interface AQIRequest {
  requestId: string;
  location: Location;
  user_context: UserContext;
  include_trends?: boolean;
  compare_nearby?: boolean;
  timestamp: string;
  status: 'processing' | 'fetching_data' | 'generating_recommendations' | 'completed' | 'error';
  error?: string;
  created_at: string;
}

export interface AQIResult {
  request_id: string;
  location: Location;
  aqi_data: AQIData;
  recommendations: HealthRecommendation;
  trends?: TrendData;
  created_at: string;
  error?: string;
  details?: string;
}

export interface AlertState extends AlertSubscription {
  alert_id: string;
  created_at: string;
  updated_at: string;
  last_check?: string;
  last_triggered?: string;
}

export interface ComparisonRequest {
  comparisonId: string;
  locations: Location[];
  user_context?: UserContext;
  timestamp: string;
  status: 'processing' | 'completed' | 'error';
}

export interface ComparisonResult {
  comparison_id: string;
  locations: Array<{
    location: Location;
    aqi_data: AQIData;
    rank: number;
    recommendation: string;
  }>;
  best_location: Location;
  summary: string;
  created_at: string;
}

export interface HistoricalDataPoint {
  location_key: string; // Format: "country-state-city"
  aqi_data: AQIData;
  stored_at: string;
}

