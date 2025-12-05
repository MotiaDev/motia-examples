import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadFlow } from '../../src/services/lead-service';

export const config: ApiRouteConfig = {
  name: 'GetFlowStatus',
  type: 'api',
  description: 'Get the status of a lead flow including processing metrics',
  path: '/lead-flows/:flowId/status',
  method: 'GET',
  emits: [],
  flows: ['lead-score-flow'],
  responseSchema: {
    200: z.object({
      flowId: z.string(),
      status: z.string(),
      progress: z.object({
        totalLeads: z.number(),
        processedLeads: z.number(),
        scoredLeads: z.number(),
        draftedLeads: z.number(),
        approvedLeads: z.number(),
        sentLeads: z.number(),
        failedLeads: z.number(),
      }),
      createdAt: z.string(),
      updatedAt: z.string(),
      error: z.string().optional(),
    }),
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['GetFlowStatus'] = async (req, { logger, state }) => {
  const { flowId } = req.pathParams;

  logger.info('Getting flow status', { flowId });

  const flow = await state.get<LeadFlow>('flows', flowId);

  if (!flow) {
    return {
      status: 404,
      body: { error: `Flow ${flowId} not found` },
    };
  }

  return {
    status: 200,
    body: {
      flowId: flow.flowId,
      status: flow.status,
      progress: {
        totalLeads: flow.totalLeads,
        processedLeads: flow.processedLeads,
        scoredLeads: flow.scoredLeads,
        draftedLeads: flow.draftedLeads,
        approvedLeads: flow.approvedLeads,
        sentLeads: flow.sentLeads,
        failedLeads: flow.failedLeads,
      },
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
      error: flow.error,
    },
  };
};

