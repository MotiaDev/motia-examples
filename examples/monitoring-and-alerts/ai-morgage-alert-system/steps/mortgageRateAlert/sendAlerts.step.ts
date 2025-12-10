import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { sendEmail } from '../../src/services/resend';
import { generateRateAlertEmail, generateRateAlertSubject } from '../../src/utils/email-templates';
import type { MortgageRate } from '../../src/services/scraper/types';

const changeSchema = z.object({
  current: z.object({
    lender: z.string(),
    product: z.string(),
    rate: z.number(),
    apr: z.number(),
    points: z.number(),
    source: z.string(),
    timestamp: z.string()
  }),
  previous: z.object({
    lender: z.string(),
    product: z.string(),
    rate: z.number(),
    apr: z.number(),
    points: z.number(),
    source: z.string(),
    timestamp: z.string()
  }),
  change: z.number()
});

const inputSchema = z.object({
  changes: z.array(changeSchema),
  timestamp: z.string()
});

export const config: EventConfig = {
  name: 'SendMortgageAlerts',
  type: 'event',
  description: 'Sends email alerts when mortgage rates change significantly',
  subscribes: ['rate-changes-detected'],
  emits: [],
  input: inputSchema,
  flows: ['mortgage-rate-alert']
};

export const handler: Handlers['SendMortgageAlerts'] = async (input, { logger }) => {
  const { changes, timestamp } = input;
  
  logger.info('Preparing to send mortgage rate alerts', { 
    changeCount: changes.length,
    timestamp 
  });
  
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const alertRecipients = process.env.ALERT_RECIPIENTS?.split(',').map(email => email.trim()) || [];
  
  if (!resendApiKey) {
    logger.error('Missing RESEND_API_KEY environment variable');
    throw new Error('RESEND_API_KEY is required');
  }
  
  if (alertRecipients.length === 0) {
    logger.warn('No alert recipients configured. Set ALERT_RECIPIENTS environment variable');
    return;
  }
  
  logger.info('Sending alerts to recipients', { 
    recipientCount: alertRecipients.length 
  });
  
  const emailHtml = generateRateAlertEmail(changes);
  const emailSubject = generateRateAlertSubject(changes);
  
  try {
    const result = await sendEmail(
      {
        from: fromEmail,
        to: alertRecipients,
        subject: emailSubject,
        html: emailHtml,
        replyTo: fromEmail
      },
      resendApiKey
    );
    
    logger.info('Alert emails sent successfully', { 
      emailId: result.id,
      recipientCount: alertRecipients.length,
      changeCount: changes.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send alert emails', { 
      error: errorMessage,
      recipientCount: alertRecipients.length
    });
    throw error;
  }
};

