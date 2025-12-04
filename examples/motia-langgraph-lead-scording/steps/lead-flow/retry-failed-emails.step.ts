import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadFlow, LeadWithScore } from '../../src/services/lead-service';
import type { EmailRecord, EmailDraft } from '../../src/services/email-draft-service';

export const config: ApiRouteConfig = {
  name: 'RetryFailedEmails',
  type: 'api',
  description: 'Retry sending failed emails for a flow',
  path: '/lead-flows/:flowId/retry',
  method: 'POST',
  emits: [{ topic: 'emails.send.requested', label: 'Retry Failed Emails' }],
  flows: ['lead-score-flow'],
  responseSchema: {
    202: z.object({
      flowId: z.string(),
      retriedCount: z.number(),
      message: z.string(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['RetryFailedEmails'] = async (req, { emit, logger, state }) => {
  const { flowId } = req.pathParams;

  logger.info('Retrying failed emails', { flowId });

  const flow = await state.get<LeadFlow>('flows', flowId);
  if (!flow) {
    return {
      status: 404,
      body: { error: `Flow ${flowId} not found` },
    };
  }

  // Get email records and find failed ones
  const emailRecords = await state.get<EmailRecord[]>('email-records', flowId) || [];
  const failedRecords = emailRecords.filter(r => r.status === 'failed');

  if (failedRecords.length === 0) {
    return {
      status: 400,
      body: { error: 'No failed emails to retry' },
    };
  }

  // Get lead and draft data for retry
  const scoredLeads = await state.get<LeadWithScore[]>('scored-leads', flowId) || [];
  const drafts = await state.get<EmailDraft[]>('email-drafts', flowId) || [];
  
  const leadMap = new Map(scoredLeads.map(l => [l.id, l]));
  const draftMap = new Map(drafts.map(d => [d.leadId, d]));

  const emailsToRetry = failedRecords
    .map(record => {
      const lead = leadMap.get(record.leadId);
      const draft = draftMap.get(record.leadId);
      if (!lead || !draft) return null;
      
      return {
        leadId: lead.id,
        email: lead.email,
        name: lead.name,
        subject: draft.subject,
        htmlContent: draft.htmlContent,
        textContent: draft.textContent,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (emailsToRetry.length === 0) {
    return {
      status: 400,
      body: { error: 'No valid emails to retry (missing lead or draft data)' },
    };
  }

  // Update flow status
  flow.status = 'sending';
  flow.updatedAt = new Date().toISOString();
  await state.set('flows', flowId, flow);

  // Emit retry event
  await emit({
    topic: 'emails.send.requested',
    data: {
      flowId,
      emailsToSend: emailsToRetry,
      isRetry: true,
    },
  });

  logger.info('Failed emails queued for retry', { flowId, count: emailsToRetry.length });

  return {
    status: 202,
    body: {
      flowId,
      retriedCount: emailsToRetry.length,
      message: `Queued ${emailsToRetry.length} failed emails for retry`,
    },
  };
};

