import { AQIData, UserContext } from '../../types/aqi.types';

/**
 * Generate prompt for health recommendation AI
 */
export function generateHealthRecommendationPrompt(
  location: { city: string; state?: string; country: string },
  aqiData: AQIData,
  userContext: UserContext
): string {
  const { city, state, country } = location;
  const { medical_conditions, planned_activity, activity_duration, age_group, sensitivity_level } = userContext;
  
  return `You are a health and environmental expert providing comprehensive air quality health recommendations.

## Current Air Quality Data for ${city}${state ? `, ${state}` : ''}, ${country}:

**Air Quality Index (AQI):** ${aqiData.aqi}
**Pollutant Levels:**
- PM2.5: ${aqiData.pm25} µg/m³
- PM10: ${aqiData.pm10} µg/m³
- Carbon Monoxide (CO): ${aqiData.co} ppb

**Weather Conditions:**
- Temperature: ${aqiData.temperature}°C
- Humidity: ${aqiData.humidity}%
- Wind Speed: ${aqiData.wind_speed} km/h

**Data Source:** ${aqiData.source_url}
**Timestamp:** ${aqiData.timestamp}

## User Context:

**Planned Activity:** ${planned_activity}
${activity_duration ? `**Activity Duration:** ${activity_duration} minutes` : ''}
${age_group ? `**Age Group:** ${age_group}` : ''}
${sensitivity_level ? `**Sensitivity Level:** ${sensitivity_level}` : ''}
${medical_conditions && medical_conditions.length > 0 ? `**Medical Conditions:** ${medical_conditions.join(', ')}` : '**Medical Conditions:** None reported'}

## Required Response Format (JSON):

Provide a comprehensive analysis in the following JSON structure:

\`\`\`json
{
  "overall_assessment": "A clear, concise summary (2-3 sentences) of the current air quality situation and its relevance to the user's planned activity.",
  
  "health_impact": {
    "severity": "minimal|low|moderate|high|very_high",
    "description": "Detailed explanation of how the current air quality affects health, specifically considering the user's medical conditions and age group.",
    "affected_groups": ["List specific groups most at risk"]
  },
  
  "activity_advice": {
    "advisability": "recommended|proceed_with_caution|not_recommended|avoid",
    "precautions": [
      "Specific actionable precautions to take if proceeding with the activity",
      "Include mask recommendations, duration limits, intensity modifications",
      "At least 3-5 specific precautions"
    ],
    "alternative_times": [
      "Specific time windows when air quality is typically better",
      "Consider weather patterns, traffic patterns, and daily AQI variations",
      "At least 2-3 alternative times with reasoning"
    ]
  },
  
  "protective_measures": [
    "General protective measures beyond the specific activity",
    "Include indoor air quality tips, diet recommendations, hydration advice",
    "At least 4-6 comprehensive measures"
  ],
  
  "best_time_windows": [
    {
      "time": "Specific time or time range (e.g., 'Early morning 5-7 AM')",
      "reason": "Why this time is optimal (wind patterns, traffic, temperature)",
      "estimated_aqi": <number> (optional estimated AQI for that time)
    }
  ]
}
\`\`\`

## Guidelines:

1. **Be Specific and Actionable**: Provide concrete, implementable advice rather than generic statements
2. **Consider All Factors**: Account for weather conditions, pollutant levels, user's health profile, and activity intensity
3. **Prioritize Safety**: If conditions are unsafe, clearly state so and explain why
4. **Evidence-Based**: Base recommendations on established air quality standards and health guidelines
5. **Personalized**: Tailor advice to the user's specific medical conditions, age group, and sensitivity level
6. **Time-Aware**: Provide realistic time windows based on typical AQI patterns
7. **Comprehensive**: Cover immediate actions, long-term precautions, and alternatives

Return ONLY the JSON object, no additional text.`;
}

/**
 * Generate prompt for trend analysis
 */
export function generateTrendAnalysisPrompt(
  location: { city: string; state?: string; country: string },
  historicalData: Array<{ timestamp: string; aqi: number }>,
  currentAqi: number
): string {
  return `You are an environmental data analyst specializing in air quality trends.

## Location: ${location.city}${location.state ? `, ${location.state}` : ''}, ${location.country}

## Current AQI: ${currentAqi}

## Historical Data (last ${historicalData.length} readings):
${historicalData.map(d => `- ${d.timestamp}: AQI ${d.aqi}`).join('\n')}

## Task:

Analyze the air quality trend and provide:

1. **Trend Direction**: improving, worsening, or stable
2. **Key Insights**: What's causing the trend? Seasonal factors? Weather patterns?
3. **Future Outlook**: What should people expect in the next 24-48 hours?
4. **Actionable Recommendations**: What should residents do based on this trend?

Provide a comprehensive analysis in 2-3 paragraphs, focusing on actionable insights.`;
}

/**
 * Generate prompt for multi-city comparison
 */
export function generateComparisonPrompt(
  locations: Array<{ city: string; state?: string; country: string; aqi: number }>,
  userContext?: UserContext
): string {
  const locationsList = locations.map((loc, idx) => 
    `${idx + 1}. ${loc.city}${loc.state ? `, ${loc.state}` : ''}, ${loc.country}: AQI ${loc.aqi}`
  ).join('\n');
  
  return `You are an air quality consultant helping someone compare air quality across multiple locations.

## Locations Being Compared:
${locationsList}

${userContext ? `## User Context:
**Planned Activity:** ${userContext.planned_activity}
${userContext.medical_conditions && userContext.medical_conditions.length > 0 ? `**Medical Conditions:** ${userContext.medical_conditions.join(', ')}` : ''}
` : ''}

## Task:

Provide a comprehensive comparison that includes:

1. **Rankings**: Rank locations from best to worst air quality
2. **Recommendations**: Which location is best for the user's needs?
3. **Key Differences**: What makes the air quality different between these locations?
4. **Timing Considerations**: Are there times when the rankings might change?
5. **Alternative Suggestions**: If all locations have poor air quality, what should the user do?

Provide a well-structured analysis that helps the user make an informed decision.`;
}

/**
 * Generate prompt for alert notification message
 */
export function generateAlertPrompt(
  location: { city: string; state?: string; country: string },
  currentAqi: number,
  threshold: number,
  medicalConditions?: string[]
): string {
  return `Generate a concise but informative air quality alert message.

**Location:** ${location.city}${location.state ? `, ${location.state}` : ''}, ${location.country}
**Current AQI:** ${currentAqi}
**Threshold:** ${threshold}
**Medical Conditions:** ${medicalConditions && medicalConditions.length > 0 ? medicalConditions.join(', ') : 'None'}

The message should:
1. Alert the user to the air quality situation
2. Provide 2-3 immediate actionable steps
3. Be concise (max 3-4 sentences)
4. Consider any medical conditions mentioned

Generate only the alert message text, no additional formatting.`;
}

