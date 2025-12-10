import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { LocationSchema, AQIDataSchema, HealthRecommendationSchema } from '../../../src/types/aqi.types';
import type { AQIRequest, AQIResult } from '../../../src/types/state.types';
import { generateHealthRecommendationPrompt } from '../../../src/utils/aqi/ai-prompts';
import { 
  getAQILevel, 
  calculateHealthImpactScore, 
  getAffectedGroups,
  getActivityAdvisability,
} from '../../../src/utils/aqi/aqi-utils';

const inputSchema = z.object({
  requestId: z.string(),
  location: LocationSchema,
  aqiData: AQIDataSchema,
  include_trends: z.boolean().optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'GenerateHealthRecommendations',
  description: 'Generate personalized health recommendations using AI based on AQI data',
  subscribes: ['generate-health-recommendations'],
  emits: ['send-analysis-email'],
  input: inputSchema,
  flows: ['aqi-analysis'],
};

export const handler: Handlers['GenerateHealthRecommendations'] = async (input, { emit, logger, state }) => {
  const { requestId, location, aqiData, include_trends } = input;
  
  try {
    logger.info('Starting health recommendation generation', { requestId });
    
    // Update request status
    const request = await state.get<AQIRequest>('aqi-requests', requestId);
    if (request) {
      await state.set('aqi-requests', requestId, {
        ...request,
        status: 'generating_recommendations',
      });
    }
    
    // Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    // Get user context from original request
    const userContext = request?.user_context || {
      planned_activity: 'outdoor activities',
    };
    
    // Generate AI prompt
    const prompt = generateHealthRecommendationPrompt(location, aqiData, userContext);
    
    logger.info('Calling OpenAI for recommendations', { requestId });
    
    // Call OpenAI API
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
    });
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }
    
    const aiResult = await openaiResponse.json();
    const aiContent = aiResult.choices[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content returned from OpenAI');
    }
    
    logger.info('OpenAI response received', { requestId });
    
    // Parse AI response - try to extract JSON if wrapped in markdown
    let recommendationData;
    try {
      // Remove markdown code block if present
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || aiContent.match(/```\n?([\s\S]*?)\n?```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : aiContent;
      recommendationData = JSON.parse(jsonContent);
    } catch (parseError) {
      logger.error('Failed to parse AI response', { 
        requestId,
        aiContent: aiContent.substring(0, 500),
        error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
      });
      
      // Fallback to rule-based recommendations
      const aqiLevel = getAQILevel(aqiData.aqi);
      const affectedGroups = getAffectedGroups(aqiData.aqi, userContext.sensitivity_level);
      const advisability = getActivityAdvisability(
        aqiData.aqi,
        userContext.planned_activity,
        userContext.medical_conditions,
        userContext.sensitivity_level
      );
      
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
      };
    }
    
    // Validate recommendation data
    const recommendations = HealthRecommendationSchema.parse(recommendationData);
    
    logger.info('Health recommendations generated and validated', { requestId });
    
    // Get trends if available
    const trends = include_trends ? await state.get('aqi-trends', requestId) : undefined;
    
    // Store complete result
    const result: AQIResult = {
      request_id: requestId,
      location,
      aqi_data: aqiData,
      recommendations,
      trends,
      created_at: new Date().toISOString(),
    };
    
    await state.set('aqi-results', requestId, result);
    
    // Emit event to send analysis email if recipient email is provided
    const recipientEmail = process.env.ALERT_RECIPIENTS || request.user_id;
    if (recipientEmail) {
      await emit({
        topic: 'send-analysis-email',
        data: {
          requestId,
          location,
          aqiData,
          recommendations,
          trends: trends || undefined,
          recipientEmail,
        },
      });
    }
    
    logger.info('Analysis completed', { requestId, hasTrends: !!trends });
    
  } catch (error) {
    logger.error('Failed to generate health recommendations', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Update request with error
    const request = await state.get<AQIRequest>('aqi-requests', requestId);
    if (request) {
      await state.set('aqi-requests', requestId, {
        ...request,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate recommendations',
      });
    }
  }
};

