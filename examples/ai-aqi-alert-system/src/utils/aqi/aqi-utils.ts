import { AQI_LEVELS, POLLUTANT_STANDARDS } from '../../types/aqi.types';

/**
 * Determine AQI level category based on AQI value
 */
export function getAQILevel(aqi: number): { 
  level: string; 
  color: string; 
  severity: string;
  description: string;
} {
  if (aqi <= AQI_LEVELS.GOOD.max) {
    return { 
      level: AQI_LEVELS.GOOD.label, 
      color: AQI_LEVELS.GOOD.color, 
      severity: 'minimal',
      description: 'Air quality is satisfactory, and air pollution poses little or no risk.',
    };
  } else if (aqi <= AQI_LEVELS.MODERATE.max) {
    return { 
      level: AQI_LEVELS.MODERATE.label, 
      color: AQI_LEVELS.MODERATE.color, 
      severity: 'low',
      description: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.',
    };
  } else if (aqi <= AQI_LEVELS.UNHEALTHY_SENSITIVE.max) {
    return { 
      level: AQI_LEVELS.UNHEALTHY_SENSITIVE.label, 
      color: AQI_LEVELS.UNHEALTHY_SENSITIVE.color, 
      severity: 'moderate',
      description: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
    };
  } else if (aqi <= AQI_LEVELS.UNHEALTHY.max) {
    return { 
      level: AQI_LEVELS.UNHEALTHY.label, 
      color: AQI_LEVELS.UNHEALTHY.color, 
      severity: 'high',
      description: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.',
    };
  } else if (aqi <= AQI_LEVELS.VERY_UNHEALTHY.max) {
    return { 
      level: AQI_LEVELS.VERY_UNHEALTHY.label, 
      color: AQI_LEVELS.VERY_UNHEALTHY.color, 
      severity: 'very_high',
      description: 'Health alert: The risk of health effects is increased for everyone.',
    };
  } else {
    return { 
      level: AQI_LEVELS.HAZARDOUS.label, 
      color: AQI_LEVELS.HAZARDOUS.color, 
      severity: 'very_high',
      description: 'Health warning of emergency conditions: everyone is more likely to be affected.',
    };
  }
}

/**
 * Calculate health impact score based on AQI and pollutants
 */
export function calculateHealthImpactScore(
  aqi: number,
  pm25: number,
  pm10: number,
  co: number
): number {
  let score = aqi / 10; // Base score from AQI
  
  // Add weights for specific pollutants
  if (pm25 > POLLUTANT_STANDARDS.pm25.unhealthy_sensitive) score += 2;
  if (pm10 > POLLUTANT_STANDARDS.pm10.unhealthy_sensitive) score += 1.5;
  if (co > POLLUTANT_STANDARDS.co.unhealthy_sensitive) score += 1;
  
  return Math.min(score, 10); // Cap at 10
}

/**
 * Determine affected groups based on AQI level
 */
export function getAffectedGroups(aqi: number, sensitivity?: string): string[] {
  const groups: string[] = [];
  
  if (aqi > AQI_LEVELS.MODERATE.max || sensitivity === 'high') {
    groups.push('People with respiratory conditions (asthma, COPD)');
    groups.push('Children and elderly');
  }
  
  if (aqi > AQI_LEVELS.UNHEALTHY_SENSITIVE.max) {
    groups.push('People with heart disease');
    groups.push('Pregnant women');
  }
  
  if (aqi > AQI_LEVELS.UNHEALTHY.max) {
    groups.push('General population');
  }
  
  return groups.length > 0 ? groups : ['No specific groups at significant risk'];
}

/**
 * Generate activity recommendations based on AQI and activity type
 */
export function getActivityAdvisability(
  aqi: number,
  activityType: string,
  medicalConditions?: string[],
  sensitivity?: string
): 'recommended' | 'proceed_with_caution' | 'not_recommended' | 'avoid' {
  const isOutdoorIntense = /run|jog|exercise|sport|cycling|hiking/i.test(activityType);
  const hasSensitiveCondition = medicalConditions?.some(c => 
    /asthma|copd|respiratory|heart|cardiovascular/i.test(c)
  );
  
  // For people with sensitive conditions
  if (hasSensitiveCondition || sensitivity === 'high') {
    if (aqi <= AQI_LEVELS.GOOD.max) return 'recommended';
    if (aqi <= AQI_LEVELS.MODERATE.max && !isOutdoorIntense) return 'proceed_with_caution';
    if (aqi <= AQI_LEVELS.UNHEALTHY_SENSITIVE.max) return 'not_recommended';
    return 'avoid';
  }
  
  // For intense outdoor activities
  if (isOutdoorIntense) {
    if (aqi <= AQI_LEVELS.GOOD.max) return 'recommended';
    if (aqi <= AQI_LEVELS.MODERATE.max) return 'proceed_with_caution';
    if (aqi <= AQI_LEVELS.UNHEALTHY.max) return 'not_recommended';
    return 'avoid';
  }
  
  // For general outdoor activities
  if (aqi <= AQI_LEVELS.MODERATE.max) return 'recommended';
  if (aqi <= AQI_LEVELS.UNHEALTHY_SENSITIVE.max) return 'proceed_with_caution';
  if (aqi <= AQI_LEVELS.UNHEALTHY.max) return 'not_recommended';
  return 'avoid';
}

/**
 * Format URL for AQI data source
 */
export function formatAQIUrl(country: string, state: string | undefined, city: string): string {
  // Format URL matching Python implementation for aqi.in
  // Format: https://www.aqi.in/dashboard/{country}/{state}/{city}
  // or:     https://www.aqi.in/dashboard/{country}/{city} (if no state)
  
  const countryClean = country.toLowerCase().replace(/\s+/g, '-');
  const cityClean = city.toLowerCase().replace(/\s+/g, '-');
  
  // If no state provided or state is 'none', exclude it from URL
  if (!state || state.toLowerCase() === 'none') {
    return `https://www.aqi.in/dashboard/${countryClean}/${cityClean}`;
  }
  
  const stateClean = state.toLowerCase().replace(/\s+/g, '-');
  return `https://www.aqi.in/dashboard/${countryClean}/${stateClean}/${cityClean}`;
}

/**
 * Calculate trend from array of AQI values
 * Returns positive number if worsening, negative if improving
 */
export function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  // Simple linear regression slope
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Predict AQI trend based on historical data
 */
export function predictTrend(dataPoints: Array<{ timestamp: string; aqi: number }>): 'improving' | 'worsening' | 'stable' {
  if (dataPoints.length < 3) return 'stable';
  
  // Simple linear regression
  const recentPoints = dataPoints.slice(-7); // Last 7 data points
  const n = recentPoints.length;
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  recentPoints.forEach((point, index) => {
    sumX += index;
    sumY += point.aqi;
    sumXY += index * point.aqi;
    sumX2 += index * index;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Threshold for considering trend significant
  if (Math.abs(slope) < 1) return 'stable';
  return slope > 0 ? 'worsening' : 'improving';
}

/**
 * Generate future AQI predictions using simple moving average
 */
export function generatePredictions(
  historicalData: Array<{ timestamp: string; aqi: number }>,
  hoursAhead: number = 24
): Array<{ timestamp: string; predicted_aqi: number; confidence: number }> {
  if (historicalData.length < 3) return [];
  
  const predictions: Array<{ timestamp: string; predicted_aqi: number; confidence: number }> = [];
  const recentAvg = historicalData.slice(-6).reduce((sum, d) => sum + d.aqi, 0) / 6;
  const trend = predictTrend(historicalData);
  
  // Simple prediction: use moving average with trend adjustment
  const trendFactor = trend === 'improving' ? -0.5 : trend === 'worsening' ? 0.5 : 0;
  
  for (let i = 1; i <= hoursAhead; i++) {
    const lastTimestamp = new Date(historicalData[historicalData.length - 1].timestamp);
    const futureTimestamp = new Date(lastTimestamp.getTime() + i * 60 * 60 * 1000);
    
    const predictedAqi = Math.max(0, recentAvg + (trendFactor * i));
    const confidence = Math.max(0.3, 1 - (i / hoursAhead) * 0.5); // Confidence decreases with time
    
    predictions.push({
      timestamp: futureTimestamp.toISOString(),
      predicted_aqi: Math.round(predictedAqi),
      confidence: Math.round(confidence * 100) / 100,
    });
  }
  
  return predictions;
}

