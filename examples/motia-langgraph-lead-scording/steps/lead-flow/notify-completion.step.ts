import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadFlow } from '../../src/services/lead-service';
import { sendEmail } from '../../src/services/resend-service';

const inputSchema = z.object({
  flowId: z.string(),
  totalSent: z.number(),
  totalFailed: z.number(),
  isRetry: z.boolean(),
});

export const config: EventConfig = {
  name: 'NotifyCompletion',
  type: 'event',
  description: 'Sends notification email when flow completes',
  subscribes: ['emails.send.complete'],
  emits: [],
  input: inputSchema,
  flows: ['lead-score-flow'],
};

export const handler: Handlers['NotifyCompletion'] = async (input, { logger, state }) => {
  const { flowId, totalSent, totalFailed, isRetry } = input;

  logger.info('Flow completion notification', { flowId, totalSent, totalFailed, isRetry });

  try {
    // Get flow details
    const flow = await state.get<LeadFlow>('flows', flowId);
    if (!flow) {
      logger.error('Flow not found for notification', { flowId });
      return;
    }

    // Get alert recipients from env
    const alertRecipients = process.env.ALERT_RECIPIENTS?.split(',').map(e => e.trim()) || [];
    
    if (alertRecipients.length === 0) {
      logger.info('No alert recipients configured, skipping notification');
      return;
    }

    // Send notification to each recipient
    for (const recipient of alertRecipients) {
      const subject = isRetry 
        ? `[Lead Flow] Retry Complete - ${flowId}`
        : `[Lead Flow] Campaign Complete - ${flowId}`;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .stat { display: inline-block; margin: 10px 20px 10px 0; }
    .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .success { color: #10b981; }
    .failed { color: #ef4444; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📧 Lead Flow ${isRetry ? 'Retry' : 'Campaign'} Complete</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Flow ID: ${flowId}</p>
    </div>
    <div class="content">
      <h2>Summary</h2>
      <div>
        <div class="stat">
          <div class="stat-value">${flow.totalLeads}</div>
          <div class="stat-label">Total Leads</div>
        </div>
        <div class="stat">
          <div class="stat-value">${flow.scoredLeads}</div>
          <div class="stat-label">Scored</div>
        </div>
        <div class="stat">
          <div class="stat-value">${flow.draftedLeads}</div>
          <div class="stat-label">Drafted</div>
        </div>
      </div>
      
      <h2>Email Results</h2>
      <div>
        <div class="stat">
          <div class="stat-value success">${totalSent}</div>
          <div class="stat-label">Sent Successfully</div>
        </div>
        <div class="stat">
          <div class="stat-value failed">${totalFailed}</div>
          <div class="stat-label">Failed</div>
        </div>
      </div>
      
      <p><strong>Status:</strong> ${flow.status}</p>
      <p><strong>Started:</strong> ${flow.createdAt}</p>
      <p><strong>Completed:</strong> ${flow.updatedAt}</p>
      
      ${totalFailed > 0 ? '<p style="color: #ef4444;">⚠️ Some emails failed. Use the retry endpoint to resend failed emails.</p>' : ''}
      
      <div class="footer">
        <p>This is an automated notification from the Lead Score Flow system.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

      const result = await sendEmail({
        to: recipient,
        subject,
        html: htmlContent,
        tags: [
          { name: 'type', value: 'notification' },
          { name: 'flow_id', value: flowId },
        ],
      });

      if (result.success) {
        logger.info('Notification sent', { recipient, flowId });
      } else {
        logger.error('Failed to send notification', { recipient, error: result.error });
      }
    }
  } catch (error) {
    logger.error('Notification handling failed', { 
      flowId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

