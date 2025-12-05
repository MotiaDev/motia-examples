import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadFlow } from '../../src/services/lead-service';
import type { EmailDraft } from '../../src/services/email-draft-service';

const bodySchema = z.object({
  leadIds: z.array(z.string()).optional(),
  approveAll: z.boolean().optional(),
  minScore: z.number().min(0).max(100).optional(),
  tier: z.enum(['hot', 'warm', 'cold']).optional(),
});

export const config: ApiRouteConfig = {
  name: 'ApproveEmails',
  type: 'api',
  description: 'Approve email drafts for sending. Can approve specific leads, all leads, or filter by score/tier.',
  path: '/lead-flows/:flowId/approve',
  method: 'POST',
  emits: [],
  flows: ['lead-score-flow'],
  bodySchema,
  responseSchema: {
    200: z.object({
      flowId: z.string(),
      approvedCount: z.number(),
      message: z.string(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['ApproveEmails'] = async (req, { logger, state }) => {
  const { flowId } = req.pathParams;

  try {
    const body = bodySchema.parse(req.body);
    const { leadIds, approveAll, minScore, tier } = body;

    logger.info('Approving emails', { flowId, leadIds, approveAll, minScore, tier });

    const flow = await state.get<LeadFlow>('flows', flowId);
    if (!flow) {
      return {
        status: 404,
        body: { error: `Flow ${flowId} not found` },
      };
    }

    if (flow.status !== 'awaiting_review' && flow.status !== 'drafting') {
      return {
        status: 400,
        body: { error: `Cannot approve emails in status: ${flow.status}` },
      };
    }

    const drafts = await state.get<EmailDraft[]>('email-drafts', flowId) || [];
    const scoredLeads = await state.get<any[]>('scored-leads', flowId) || [];
    const scoreMap = new Map(scoredLeads.map(l => [l.id, l]));

    let approvedCount = 0;

    for (const draft of drafts) {
      const lead = scoreMap.get(draft.leadId);
      if (!lead) continue;

      let shouldApprove = false;

      if (approveAll) {
        shouldApprove = true;
      } else if (leadIds && leadIds.includes(draft.leadId)) {
        shouldApprove = true;
      } else if (minScore !== undefined && lead.score >= minScore) {
        shouldApprove = true;
      } else if (tier && lead.tier === tier) {
        shouldApprove = true;
      }

      if (shouldApprove && !draft.approved) {
        draft.approved = true;
        draft.approvedAt = new Date().toISOString();
        approvedCount++;
      }
    }

    // Update drafts
    await state.set('email-drafts', flowId, drafts);

    // Update flow
    flow.approvedLeads = drafts.filter(d => d.approved).length;
    flow.status = 'awaiting_review';
    flow.updatedAt = new Date().toISOString();
    await state.set('flows', flowId, flow);

    logger.info('Emails approved', { flowId, approvedCount });

    return {
      status: 200,
      body: {
        flowId,
        approvedCount,
        message: `Approved ${approvedCount} email drafts. Total approved: ${flow.approvedLeads}`,
      },
    };
  } catch (error) {
    logger.error('Failed to approve emails', { error: error instanceof Error ? error.message : 'Unknown' });
    
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: { error: error.errors.map(e => e.message).join(', ') },
      };
    }

    return {
      status: 400,
      body: { error: error instanceof Error ? error.message : 'Failed to approve emails' },
    };
  }
};

