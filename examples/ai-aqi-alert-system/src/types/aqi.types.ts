import { z } from 'zod';

// ================ Core Schemas ================

export const LocationSchema = z.object({
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const AQIDataSchema = z.object({
  aqi: z.number(),
  temperature: z.number(),
  humidity: z.number(),
  wind_speed: z.number(),
  pm25: z.number(),
  pm10: z.number(),
  co: z.number(),
  timestamp: z.string(),
  source_url: z.string(),
});

export const UserContextSchema = z.object({
  medical_conditions: z.array(z.string()).optional(),
  planned_activity: z.string(),
  activity_duration: z.number().optional(), // in minutes
  activity_time: z.string().optional(), // ISO timestamp
  age_group: z.enum(['child', 'adult', 'senior']).optional(),
  sensitivity_level: z.enum(['low', 'moderate', 'high']).optional(),
});

export const AnalysisRequestSchema = z.object({
  location: LocationSchema,
  user_context: UserContextSchema,
  include_trends: z.boolean().optional().default(false),
  compare_nearby: z.boolean().optional().default(false),
  user_id: z.string().optional(),
});

export const HealthRecommendationSchema = z.object({
  overall_assessment: z.string(),
  health_impact: z.object({
    severity: z.enum(['minimal', 'low', 'moderate', 'high', 'very_high']),
    description: z.string(),
    affected_groups: z.array(z.string()),
  }),
  activity_advice: z.object({
    advisability: z.enum(['recommended', 'proceed_with_caution', 'not_recommended', 'avoid']),
    precautions: z.array(z.string()),
    alternative_times: z.array(z.string()),
  }),
  protective_measures: z.array(z.string()),
  best_time_windows: z.array(z.object({
    time: z.string(),
    reason: z.string(),
    estimated_aqi: z.number().optional(),
  })),
});

export const TrendDataSchema = z.object({
  period: z.string(), // e.g., "7d", "30d"
  average_aqi: z.number(),
  max_aqi: z.number(),
  min_aqi: z.number(),
  trend_direction: z.enum(['improving', 'worsening', 'stable']),
  data_points: z.array(z.object({
    timestamp: z.string(),
    aqi: z.number(),
  })),
  predictions: z.array(z.object({
    timestamp: z.string(),
    predicted_aqi: z.number(),
    confidence: z.number(),
  })).optional(),
});

export const AlertSubscriptionSchema = z.object({
  user_id: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  locations: z.array(LocationSchema),
  thresholds: z.object({
    aqi_level: z.number(),
    pm25_level: z.number().optional(),
    notification_channels: z.array(z.enum(['email', 'sms', 'webhook'])),
  }),
  active: z.boolean().default(true),
});

export const NearbyLocationSchema = z.object({
  location: LocationSchema,
  distance_km: z.number(),
  aqi_data: AQIDataSchema,
  better_than_current: z.boolean(),
});

// ================ Response Schemas ================

export const AnalysisResponseSchema = z.object({
  request_id: z.string(),
  location: LocationSchema,
  aqi_data: AQIDataSchema,
  recommendations: HealthRecommendationSchema,
  trends: TrendDataSchema.optional(),
  nearby_locations: z.array(NearbyLocationSchema).optional(),
  air_quality_forecast: z.array(z.object({
    time: z.string(),
    predicted_aqi: z.number(),
    confidence: z.number(),
  })).optional(),
  created_at: z.string(),
});

export const HistoricalQuerySchema = z.object({
  city: z.string(),
  state: z.string().optional(),
  country: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  include_predictions: z.boolean().optional(),
});

export const ComparisonRequestSchema = z.object({
  locations: z.array(LocationSchema).min(2).max(10),
  user_context: UserContextSchema.optional(),
});

// ================ Type Exports ================

export type Location = z.infer<typeof LocationSchema>;
export type AQIData = z.infer<typeof AQIDataSchema>;
export type UserContext = z.infer<typeof UserContextSchema>;
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
export type HealthRecommendation = z.infer<typeof HealthRecommendationSchema>;
export type TrendData = z.infer<typeof TrendDataSchema>;
export type AlertSubscription = z.infer<typeof AlertSubscriptionSchema>;
export type NearbyLocation = z.infer<typeof NearbyLocationSchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
export type HistoricalQuery = z.infer<typeof HistoricalQuerySchema>;
export type ComparisonRequest = z.infer<typeof ComparisonRequestSchema>;

// ================ Constants ================

export const AQI_LEVELS = {
  GOOD: { max: 50, label: 'Good', color: 'green' },
  MODERATE: { max: 100, label: 'Moderate', color: 'yellow' },
  UNHEALTHY_SENSITIVE: { max: 150, label: 'Unhealthy for Sensitive Groups', color: 'orange' },
  UNHEALTHY: { max: 200, label: 'Unhealthy', color: 'red' },
  VERY_UNHEALTHY: { max: 300, label: 'Very Unhealthy', color: 'purple' },
  HAZARDOUS: { max: 500, label: 'Hazardous', color: 'maroon' },
};

export const POLLUTANT_STANDARDS = {
  pm25: {
    good: 12,
    moderate: 35.4,
    unhealthy_sensitive: 55.4,
    unhealthy: 150.4,
    very_unhealthy: 250.4,
  },
  pm10: {
    good: 54,
    moderate: 154,
    unhealthy_sensitive: 254,
    unhealthy: 354,
    very_unhealthy: 424,
  },
  co: {
    good: 4.4,
    moderate: 9.4,
    unhealthy_sensitive: 12.4,
    unhealthy: 15.4,
    very_unhealthy: 30.4,
  },
};

