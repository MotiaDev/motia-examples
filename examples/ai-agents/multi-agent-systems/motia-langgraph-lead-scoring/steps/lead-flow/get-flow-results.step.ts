import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadFlow, LeadWithScore } from '../../src/services/lead-service';
import type { EmailDraft } from '../../src/services/email-draft-service';

export const config: ApiRouteConfig = {
  name: 'GetFlowResults',
  type: 'api',
  description: 'Get scored leads and email drafts for a flow',
  path: '/lead-flows/:flowId/results',
  method: 'GET',
  emits: [],
  flows: ['lead-score-flow'],
  queryParams: [
    { name: 'tier', description: 'Filter by tier: hot, warm, cold' },
    { name: 'minScore', description: 'Minimum score filter' },
    { name: 'limit', description: 'Max results to return' },
    { name: 'offset', description: 'Offset for pagination' },
  ],
  responseSchema: {
    200: z.object({
      flowId: z.string(),
      status: z.string(),
      leads: z.array(z.object({
        id: z.string(),
        name: z.string(),
        company: z.string(),
        email: z.string(),
        role: z.string(),
        industry: z.string(),
        score: z.number(),
        tier: z.string(),
        draft: z.object({
          subject: z.string(),
          approved: z.boolean(),
        }).optional(),
      })),
      pagination: z.object({
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
      }),
    }),
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['GetFlowResults'] = async (req, { logger, state }) => {
  const { flowId } = req.pathParams;
  const { tier, minScore, limit = '50', offset = '0' } = req.queryParams as Record<string, string>;

  logger.info('Getting flow results', { flowId, tier, minScore, limit, offset });

  const flow = await state.get<LeadFlow>('flows', flowId);
  if (!flow) {
    return {
      status: 404,
      body: { error: `Flow ${flowId} not found` },
    };
  }

  // Get scored leads
  let scoredLeads = await state.get<LeadWithScore[]>('scored-leads', flowId) || [];
  
  // Get drafts
  const drafts = await state.get<EmailDraft[]>('email-drafts', flowId) || [];
  const draftMap = new Map(drafts.map(d => [d.leadId, d]));

  // Apply filters
  if (tier) {
    scoredLeads = scoredLeads.filter(l => l.tier === tier);
  }
  if (minScore) {
    const min = parseInt(minScore, 10);
    scoredLeads = scoredLeads.filter(l => l.score >= min);
  }

  const total = scoredLeads.length;
  const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
  const offsetNum = parseInt(offset, 10) || 0;

  // Paginate
  const paginatedLeads = scoredLeads.slice(offsetNum, offsetNum + limitNum);

  return {
    status: 200,
    body: {
      flowId,
      status: flow.status,
      leads: paginatedLeads.map(lead => {
        const draft = draftMap.get(lead.id);
        return {
          id: lead.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          role: lead.role,
          industry: lead.industry,
          score: lead.score,
          tier: lead.tier,
          draft: draft ? {
            subject: draft.subject,
            approved: draft.approved,
          } : undefined,
        };
      }),
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
      },
    },
  };
};

