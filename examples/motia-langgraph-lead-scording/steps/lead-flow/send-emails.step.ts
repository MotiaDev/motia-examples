import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadFlow, LeadWithScore } from '../../src/services/lead-service';
import type { EmailDraft } from '../../src/services/email-draft-service';

const bodySchema = z.object({
  leadIds: z.array(z.string()).optional(),
  sendAllApproved: z.boolean().optional(),
  minScore: z.number().min(0).max(100).optional(),
  tier: z.enum(['hot', 'warm', 'cold']).optional(),
  maxRecipients: z.number().min(1).max(100).default(10),
});

export const config: ApiRouteConfig = {
  name: 'SendEmails',
  type: 'api',
  description: 'Send approved email drafts via Resend. Requires explicit approval or uses filters.',
  path: '/lead-flows/:flowId/send',
  method: 'POST',
  emits: [{ topic: 'emails.send.requested', label: 'Send Emails Requested' }],
  flows: ['lead-score-flow'],
  bodySchema,
  responseSchema: {
    202: z.object({
      flowId: z.string(),
      emailsQueued: z.number(),
      message: z.string(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['SendEmails'] = async (req, { emit, logger, state }) => {
  const { flowId } = req.pathParams;

  try {
    const body = bodySchema.parse(req.body);
    const { leadIds, sendAllApproved, minScore, tier, maxRecipients } = body;

    logger.info('Processing send request', { flowId, sendAllApproved, minScore, tier, maxRecipients });

    const flow = await state.get<LeadFlow>('flows', flowId);
    if (!flow) {
      return {
        status: 404,
        body: { error: `Flow ${flowId} not found` },
      };
    }

    if (!['awaiting_review', 'completed'].includes(flow.status)) {
      return {
        status: 400,
        body: { error: `Cannot send emails in status: ${flow.status}. Wait for drafts to be ready.` },
      };
    }

    const drafts = await state.get<EmailDraft[]>('email-drafts', flowId) || [];
    const scoredLeads = await state.get<LeadWithScore[]>('scored-leads', flowId) || [];
    const leadMap = new Map(scoredLeads.map(l => [l.id, l]));

    // Filter drafts to send
    const draftsToSend: { draft: EmailDraft; lead: LeadWithScore }[] = [];

    for (const draft of drafts) {
      const lead = leadMap.get(draft.leadId);
      if (!lead) continue;

      let shouldSend = false;

      // Only send approved drafts unless specific leadIds provided
      if (leadIds && leadIds.includes(draft.leadId)) {
        shouldSend = true;
      } else if (sendAllApproved && draft.approved) {
        shouldSend = true;
      } else if (minScore !== undefined && lead.score >= minScore && draft.approved) {
        shouldSend = true;
      } else if (tier && lead.tier === tier && draft.approved) {
        shouldSend = true;
      }

      if (shouldSend) {
        draftsToSend.push({ draft, lead });
      }
    }

    // Apply max recipients limit for safety
    const limitedDrafts = draftsToSend.slice(0, maxRecipients);

    if (limitedDrafts.length === 0) {
      return {
        status: 400,
        body: { error: 'No approved emails match the send criteria' },
      };
    }

    // Update flow status
    flow.status = 'sending';
    flow.updatedAt = new Date().toISOString();
    await state.set('flows', flowId, flow);

    // Emit event to trigger email sending
    await emit({
      topic: 'emails.send.requested',
      data: {
        flowId,
        emailsToSend: limitedDrafts.map(({ draft, lead }) => ({
          leadId: lead.id,
          email: lead.email,
          name: lead.name,
          subject: draft.subject,
          htmlContent: draft.htmlContent,
          textContent: draft.textContent,
        })),
      },
    });

    logger.info('Emails queued for sending', { flowId, count: limitedDrafts.length });

    return {
      status: 202,
      body: {
        flowId,
        emailsQueued: limitedDrafts.length,
        message: `Queued ${limitedDrafts.length} emails for sending.${
          draftsToSend.length > maxRecipients 
            ? ` (Limited from ${draftsToSend.length} by maxRecipients=${maxRecipients})`
            : ''
        }`,
      },
    };
  } catch (error) {
    logger.error('Failed to queue emails', { error: error instanceof Error ? error.message : 'Unknown' });
    
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: { error: error.errors.map(e => e.message).join(', ') },
      };
    }

    return {
      status: 400,
      body: { error: error instanceof Error ? error.message : 'Failed to queue emails' },
    };
  }
};

