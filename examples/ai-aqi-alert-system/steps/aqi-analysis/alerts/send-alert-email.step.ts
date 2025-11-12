import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { LocationSchema, AQIDataSchema } from '../../../src/types/aqi.types';
import { getAQILevel } from '../../../src/utils/aqi/aqi-utils';

const inputSchema = z.object({
  alertId: z.string(),
  email: z.string().email(),
  location: LocationSchema,
  currentAqi: z.number(),
  threshold: z.number(),
  aqiData: AQIDataSchema,
});

export const config: EventConfig = {
  type: 'event',
  name: 'SendAlertEmail',
  description: 'Send AQI alert email via Resend',
  subscribes: ['send-alert-email'],
  emits: [],
  input: inputSchema,
  flows: ['aqi-analysis'],
};

export const handler: Handlers['SendAlertEmail'] = async (input, { logger }) => {
  const { alertId, email, location, currentAqi, threshold, aqiData } = input;
  
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    if (!fromEmail) {
      throw new Error('FROM_EMAIL not configured');
    }
    
    const aqiLevel = getAQILevel(currentAqi);
    const locationName = `${location.city}, ${location.state}, ${location.country}`;
    
    const emailHtml = `
      <h2>🚨 AQI Alert for ${locationName}</h2>
      <p>The air quality has exceeded your threshold.</p>
      <ul>
        <li><strong>Current AQI:</strong> ${currentAqi} (${aqiLevel.level})</li>
        <li><strong>Your Threshold:</strong> ${threshold}</li>
        <li><strong>Temperature:</strong> ${aqiData.temperature}°C</li>
        <li><strong>Humidity:</strong> ${aqiData.humidity}%</li>
        <li><strong>PM2.5:</strong> ${aqiData.pm25} µg/m³</li>
        <li><strong>PM10:</strong> ${aqiData.pm10} µg/m³</li>
      </ul>
      <p><strong>Health Impact:</strong> ${aqiLevel.health_implications}</p>
      <p><strong>Recommendations:</strong></p>
      <ul>
        ${aqiLevel.cautionary_statement.split('.').filter(s => s.trim()).map(s => `<li>${s.trim()}</li>`).join('')}
      </ul>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Alert ID: ${alertId}
      </p>
    `;
    
    logger.info('Sending alert email via Resend', { alertId, email });
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `🚨 AQI Alert: ${locationName} - ${currentAqi} (${aqiLevel.level})`,
        html: emailHtml,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    logger.info('Alert email sent successfully', { 
      alertId, 
      email,
      emailId: result.id,
    });
    
  } catch (error) {
    logger.error('Failed to send alert email', {
      alertId,
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

