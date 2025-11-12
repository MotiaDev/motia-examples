import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { LocationSchema, AQIDataSchema, HealthRecommendationSchema, TrendDataSchema } from '../../../src/types/aqi.types';
import { getAQILevel } from '../../../src/utils/aqi/aqi-utils';

const inputSchema = z.object({
  requestId: z.string(),
  location: LocationSchema,
  aqiData: AQIDataSchema,
  recommendations: HealthRecommendationSchema,
  trends: TrendDataSchema.nullable().optional(),
  recipientEmail: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'SendAnalysisEmail',
  description: 'Send AI-powered AQI analysis results via email using Resend',
  subscribes: ['send-analysis-email'],
  emits: [],
  input: inputSchema,
  flows: ['aqi-analysis'],
};

export const handler: Handlers['SendAnalysisEmail'] = async (input, { logger }) => {
  const { requestId, location, aqiData, recommendations, trends, recipientEmail } = input;
  
  try {
    logger.info('Sending analysis email', { requestId, recipientEmail });
    
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    if (!fromEmail) {
      throw new Error('FROM_EMAIL not configured');
    }
    
    const aqiLevel = getAQILevel(aqiData.aqi);
    
    // Format trends data if available
    const trendsSection = trends ? `
    <h2 style="color: #1a73e8; margin-top: 24px;">📊 7-Day Trend Analysis</h2>
    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 8px 0;"><strong>Trend:</strong> ${trends.trend_direction === 'improving' ? '📈 Improving' : trends.trend_direction === 'worsening' ? '📉 Worsening' : '➡️ Stable'}</p>
      <p style="margin: 8px 0;"><strong>Average AQI:</strong> ${trends.average_aqi.toFixed(1)}</p>
      <p style="margin: 8px 0;"><strong>Range:</strong> ${trends.min_aqi} - ${trends.max_aqi}</p>
      <p style="margin: 8px 0;"><strong>Data Points:</strong> ${trends.data_points.length} measurements</p>
    </div>
    ` : '';
    
    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AQI Analysis Results</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 28px;">🌍 Your Air Quality Analysis</h1>
    <p style="margin: 8px 0 0 0; font-size: 18px; opacity: 0.9;">${location.city}, ${location.state ? location.state + ', ' : ''}${location.country}</p>
  </div>
  
  <div style="background: ${aqiLevel.color}; color: white; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
    <div style="font-size: 64px; font-weight: bold; margin-bottom: 8px;">${aqiData.aqi}</div>
    <div style="font-size: 24px; font-weight: 600; margin-bottom: 4px;">${aqiLevel.level}</div>
    <div style="font-size: 16px; opacity: 0.9;">${aqiLevel.description}</div>
  </div>
  
  <h2 style="color: #1a73e8; margin-top: 24px;">🌡️ Environmental Data</h2>
  <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0;"><strong>Temperature:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${aqiData.temperature.toFixed(1)}°C</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Humidity:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${aqiData.humidity}%</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Wind Speed:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${aqiData.wind_speed.toFixed(1)} km/h</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>PM2.5:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${aqiData.pm25.toFixed(1)} µg/m³</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>PM10:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${aqiData.pm10.toFixed(1)} µg/m³</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>CO Level:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${aqiData.co.toFixed(2)} mg/m³</td>
      </tr>
    </table>
  </div>
  
  ${trendsSection}
  
  <h2 style="color: #1a73e8; margin-top: 24px;">🏥 AI-Powered Health Recommendations</h2>
  
  <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 16px 0; border-radius: 4px;">
    <p style="margin: 0;"><strong>Overall Assessment:</strong></p>
    <p style="margin: 8px 0 0 0;">${recommendations.overall_assessment}</p>
  </div>
  
  <h3 style="color: #333; margin-top: 20px;">Health Impact</h3>
  <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 12px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Severity:</strong> ${recommendations.health_impact.severity}</p>
    <p style="margin: 0 0 8px 0;">${recommendations.health_impact.description}</p>
    ${recommendations.health_impact.affected_groups.length > 0 ? `
    <p style="margin: 8px 0 4px 0;"><strong>Affected Groups:</strong></p>
    <ul style="margin: 4px 0; padding-left: 20px;">
      ${recommendations.health_impact.affected_groups.map(group => `<li>${group}</li>`).join('')}
    </ul>
    ` : ''}
  </div>
  
  <h3 style="color: #333; margin-top: 20px;">Activity Advice</h3>
  <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 12px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Advisability:</strong> ${recommendations.activity_advice.advisability.replace(/_/g, ' ').toUpperCase()}</p>
    ${recommendations.activity_advice.precautions.length > 0 ? `
    <p style="margin: 12px 0 4px 0;"><strong>Precautions:</strong></p>
    <ul style="margin: 4px 0; padding-left: 20px;">
      ${recommendations.activity_advice.precautions.map(p => `<li>${p}</li>`).join('')}
    </ul>
    ` : ''}
    ${recommendations.activity_advice.alternative_times.length > 0 ? `
    <p style="margin: 12px 0 4px 0;"><strong>Alternative Times:</strong></p>
    <ul style="margin: 4px 0; padding-left: 20px;">
      ${recommendations.activity_advice.alternative_times.map(t => `<li>${t}</li>`).join('')}
    </ul>
    ` : ''}
  </div>
  
  ${recommendations.protective_measures.length > 0 ? `
  <h3 style="color: #333; margin-top: 20px;">🛡️ Protective Measures</h3>
  <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 12px 0;">
    <ul style="margin: 0; padding-left: 20px;">
      ${recommendations.protective_measures.map(m => `<li>${m}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  ${recommendations.best_time_windows.length > 0 ? `
  <h3 style="color: #333; margin-top: 20px;">⏰ Best Time Windows</h3>
  <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 12px 0;">
    ${recommendations.best_time_windows.map(window => `
    <div style="margin-bottom: 12px;">
      <strong>${window.time}</strong>
      <p style="margin: 4px 0 0 0;">${window.reason}</p>
      ${window.estimated_aqi ? `<p style="margin: 4px 0 0 0; color: #666;">Estimated AQI: ${window.estimated_aqi}</p>` : ''}
    </div>
    `).join('')}
  </div>
  ` : ''}
  
  <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #e0e0e0; text-align: center; color: #666; font-size: 14px;">
    <p style="margin: 0 0 8px 0;">Analysis ID: ${requestId}</p>
    <p style="margin: 0 0 8px 0;">Generated: ${new Date().toLocaleString()}</p>
    <p style="margin: 0;">Data source: ${aqiData.source_url ? '<a href="' + aqiData.source_url + '" style="color: #1a73e8;">View Source</a>' : 'OpenWeatherMap'}</p>
  </div>
  
  <div style="margin-top: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px; text-align: center; color: #666; font-size: 13px;">
    <p style="margin: 0;">Powered by AI 🤖 | Stay safe and breathe easy! 🌿</p>
  </div>
  
</body>
</html>
    `;
    
    // Parse recipient email(s) - handle comma-separated list
    const recipientEmails = recipientEmail
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipientEmails,
        subject: `🌍 Your AQI Analysis for ${location.city} - ${aqiLevel.level} (${aqiData.aqi})`,
        html: emailHtml,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    logger.info('Analysis email sent successfully', { 
      requestId, 
      recipientEmail,
      emailId: result.id,
    });
    
  } catch (error) {
    logger.error('Failed to send analysis email', {
      requestId,
      recipientEmail,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

