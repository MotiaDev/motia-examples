import { AQIData, UserContext, HealthRecommendation, Location } from '../../types/aqi.types'
import { generateHealthRecommendationPrompt } from '../../utils/aqi/ai-prompts'
import { 
  getAQILevel, 
  getAffectedGroups,
  getActivityAdvisability,
} from '../../utils/aqi/aqi-utils'

export interface GenerateRecommendationsOptions {
  location: Location
  aqiData: AQIData
  userContext: UserContext
  openaiApiKey: string
}

export async function generateHealthRecommendations(
  options: GenerateRecommendationsOptions
): Promise<HealthRecommendation> {
  const { location, aqiData, userContext, openaiApiKey } = options
  
  const prompt = generateHealthRecommendationPrompt(location, aqiData, userContext)
  
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a health and environmental expert. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })
  
  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text()
    throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`)
  }
  
  const aiResult = await openaiResponse.json()
  const aiContent = aiResult.choices[0]?.message?.content
  
  if (!aiContent) {
    throw new Error('No content returned from OpenAI')
  }
  
  // Parse AI response - try to extract JSON if wrapped in markdown
  let recommendationData
  try {
    const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || aiContent.match(/```\n?([\s\S]*?)\n?```/)
    const jsonContent = jsonMatch ? jsonMatch[1] : aiContent
    recommendationData = JSON.parse(jsonContent)
  } catch (parseError) {
    // Fallback to rule-based recommendations
    const aqiLevel = getAQILevel(aqiData.aqi)
    const affectedGroups = getAffectedGroups(aqiData.aqi, userContext.sensitivity_level)
    const advisability = getActivityAdvisability(
      aqiData.aqi,
      userContext.planned_activity,
      userContext.medical_conditions,
      userContext.sensitivity_level
    )
    
    recommendationData = {
      overall_assessment: `Air quality is currently ${aqiLevel.level} with an AQI of ${aqiData.aqi}. ${advisability === 'avoid' ? 'Outdoor activities should be avoided.' : advisability === 'not_recommended' ? 'Outdoor activities are not recommended.' : 'Outdoor activities should be approached with caution.'}`,
      health_impact: {
        severity: aqiLevel.severity,
        description: `Current air quality poses ${aqiLevel.severity} health risks, particularly for sensitive groups.`,
        affected_groups: affectedGroups,
      },
      activity_advice: {
        advisability,
        precautions: [
          'Monitor air quality regularly',
          'Consider wearing an N95 mask if going outdoors',
          'Limit outdoor exposure time',
          'Stay hydrated',
        ],
        alternative_times: [
          'Early morning hours typically have better air quality',
          'Late evening after traffic decreases',
        ],
      },
      protective_measures: [
        'Keep windows closed',
        'Use air purifiers indoors',
        'Avoid strenuous activities',
        'Stay well hydrated',
      ],
      best_time_windows: [
        {
          time: 'Early morning (5-7 AM)',
          reason: 'Lower traffic and better air circulation',
        },
      ],
    }
  }
  
  return recommendationData as HealthRecommendation
}

