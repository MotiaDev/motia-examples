import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { sendEmail } from '../../src/services/resend';

const inputSchema = z.object({
  dataId: z.string(),
  query: z.string(),
  analysis: z.string(),
  contextCount: z.number(),
  timestamp: z.string()
});

export const config: EventConfig = {
  name: 'SendAnalysisEmail',
  type: 'event',
  description: 'Sends AI analysis results via email',
  subscribes: ['send-analysis'],
  emits: [],
  input: inputSchema,
  flows: ['mortgage-rate-alert']
};

export const handler: Handlers['SendAnalysisEmail'] = async (input, { logger }) => {
  const { dataId, query, analysis, contextCount, timestamp } = input;
  
  logger.info('Preparing to send AI analysis email', { dataId, query });
  
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
  
  // Generate email content
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .query-box {
            background: white;
            padding: 20px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
            border-radius: 5px;
          }
          .query-box h3 {
            margin-top: 0;
            color: #667eea;
          }
          .analysis-box {
            background: white;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            white-space: pre-wrap;
          }
          .metadata {
            font-size: 12px;
            color: #666;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🤖 AI Mortgage Analysis</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Powered by OpenAI + Couchbase Vector Search</p>
        </div>
        <div class="content">
          <div class="query-box">
            <h3>📋 Your Query</h3>
            <p><strong>${query}</strong></p>
          </div>
          
          <div class="analysis-box">
            <h3 style="color: #333; margin-top: 0;">💡 AI Analysis</h3>
            ${analysis.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('')}
          </div>
          
          <div class="metadata">
            <p><strong>Analysis ID:</strong> ${dataId}</p>
            <p><strong>Context Sources:</strong> ${contextCount} relevant documents retrieved</p>
            <p><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</p>
          </div>
        </div>
        <div class="footer">
          <p>This analysis was generated automatically by your Mortgage Rate Alert system.</p>
        </div>
      </body>
    </html>
  `;
  
  try {
    const result = await sendEmail(
      {
        from: fromEmail,
        to: alertRecipients,
        subject: `🤖 AI Analysis: ${query}`,
        html: emailHtml,
        replyTo: fromEmail
      },
      resendApiKey
    );
    
    logger.info('Analysis email sent successfully', { 
      emailId: result.id,
      recipientCount: alertRecipients.length,
      dataId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send analysis email', { 
      error: errorMessage,
      recipientCount: alertRecipients.length,
      dataId
    });
    throw error;
  }
};

