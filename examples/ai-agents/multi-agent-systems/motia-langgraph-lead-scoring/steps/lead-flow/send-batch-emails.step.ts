import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadFlow } from '../../src/services/lead-service';
import type { EmailRecord } from '../../src/services/email-draft-service';
import { sendBatchEmails } from '../../src/services/resend-service';

const emailToSendSchema = z.object({
  leadId: z.string(),
  email: z.string(),
  name: z.string(),
  subject: z.string(),
  htmlContent: z.string(),
  textContent: z.string().optional(),
});

const inputSchema = z.object({
  flowId: z.string(),
  emailsToSend: z.array(emailToSendSchema),
  isRetry: z.boolean().optional(),
});

export const config: EventConfig = {
  name: 'SendBatchEmails',
  type: 'event',
  description: 'Sends batch emails via Resend API',
  subscribes: ['emails.send.requested'],
  emits: [{ topic: 'emails.send.complete', label: 'Sending Complete' }],
  input: inputSchema,
  flows: ['lead-score-flow'],
};

export const handler: Handlers['SendBatchEmails'] = async (input, { emit, logger, state }) => {
  const { flowId, emailsToSend, isRetry } = input;

  logger.info('Sending batch emails', { flowId, count: emailsToSend.length, isRetry });

  try {
    // Get flow
    const flow = await state.get<LeadFlow>('flows', flowId);
    if (!flow) {
      logger.error('Flow not found', { flowId });
      return;
    }

    // Prepare emails for Resend
    const emailParams = emailsToSend.map(email => ({
      to: email.email,
      subject: email.subject,
      html: email.htmlContent,
      text: email.textContent,
      tags: [
        { name: 'flow_id', value: flowId },
        { name: 'lead_id', value: email.leadId },
      ],
    }));

    // Send emails in batches
    const result = await sendBatchEmails(emailParams, (sent, total) => {
      logger.info('Sending progress', { flowId, sent, total });
    });

    // Get existing email records
    const emailRecords = await state.get<EmailRecord[]>('email-records', flowId) || [];

    // Create/update email records
    for (let i = 0; i < emailsToSend.length; i++) {
      const emailData = emailsToSend[i];
      const sendResult = result.results[i];

      // Find existing record (for retry) or create new
      const existingIndex = emailRecords.findIndex(
        r => r.leadId === emailData.leadId && r.status === 'failed'
      );

      const record: EmailRecord = {
        id: existingIndex >= 0 ? emailRecords[existingIndex].id : `email_${Date.now()}_${i}`,
        flowId,
        leadId: emailData.leadId,
        leadEmail: emailData.email,
        subject: emailData.subject,
        status: sendResult.success ? 'sent' : 'failed',
        resendId: sendResult.resendId,
        sentAt: sendResult.success ? new Date().toISOString() : undefined,
        error: sendResult.error,
        createdAt: existingIndex >= 0 ? emailRecords[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        emailRecords[existingIndex] = record;
      } else {
        emailRecords.push(record);
      }
    }

    // Save email records
    await state.set('email-records', flowId, emailRecords);

    // Update flow stats
    flow.sentLeads = (flow.sentLeads || 0) + result.totalSent;
    flow.failedLeads = emailRecords.filter(r => r.status === 'failed').length;
    flow.status = result.totalFailed === 0 ? 'completed' : 'completed';
    flow.updatedAt = new Date().toISOString();
    await state.set('flows', flowId, flow);

    logger.info('Batch email sending complete', { 
      flowId,
      sent: result.totalSent,
      failed: result.totalFailed,
    });

    // Emit completion event
    await emit({
      topic: 'emails.send.complete',
      data: {
        flowId,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
        isRetry: isRetry || false,
      },
    });
  } catch (error) {
    logger.error('Batch email sending failed', { 
      flowId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    const flow = await state.get<LeadFlow>('flows', flowId);
    if (flow) {
      flow.status = 'failed';
      flow.error = error instanceof Error ? error.message : 'Email sending failed';
      flow.updatedAt = new Date().toISOString();
      await state.set('flows', flowId, flow);
    }
  }
};

