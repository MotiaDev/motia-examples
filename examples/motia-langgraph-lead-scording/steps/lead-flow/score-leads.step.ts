import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadFlow, Lead } from '../../src/services/lead-service';
import { scoreLeads } from '../../src/services/scoring-service';

const inputSchema = z.object({
  flowId: z.string(),
  leadsCount: z.number(),
});

export const config: EventConfig = {
  name: 'ScoreLeads',
  type: 'event',
  description: 'Scores leads using LangGraph-based analysis',
  subscribes: ['leads.scoring.start'],
  emits: [{ topic: 'leads.scoring.complete', label: 'Scoring Complete' }],
  input: inputSchema,
  flows: ['lead-score-flow'],
};

export const handler: Handlers['ScoreLeads'] = async (input, { emit, logger, state }) => {
  const { flowId, leadsCount } = input;

  logger.info('Starting lead scoring', { flowId, leadsCount });

  try {
    // Get flow
    const flow = await state.get<LeadFlow>('flows', flowId);
    if (!flow) {
      logger.error('Flow not found', { flowId });
      return;
    }

    // Update status
    flow.status = 'scoring';
    flow.updatedAt = new Date().toISOString();
    await state.set('flows', flowId, flow);

    // Get leads
    const leads = await state.get<Lead[]>('leads', flowId);
    if (!leads || leads.length === 0) {
      logger.error('No leads to score', { flowId });
      flow.status = 'failed';
      flow.error = 'No leads to score';
      await state.set('flows', flowId, flow);
      return;
    }

    logger.info('Scoring leads with LangGraph', { flowId, count: leads.length });

    // Score leads using LangGraph
    const scoredLeads = await scoreLeads(leads);

    // Store scored leads
    await state.set('scored-leads', flowId, scoredLeads);

    // Update flow
    flow.scoredLeads = scoredLeads.length;
    flow.updatedAt = new Date().toISOString();
    await state.set('flows', flowId, flow);

    // Log scoring summary
    const hotLeads = scoredLeads.filter(l => l.tier === 'hot').length;
    const warmLeads = scoredLeads.filter(l => l.tier === 'warm').length;
    const coldLeads = scoredLeads.filter(l => l.tier === 'cold').length;

    logger.info('Lead scoring complete', { 
      flowId, 
      total: scoredLeads.length,
      hot: hotLeads,
      warm: warmLeads,
      cold: coldLeads,
      topScore: scoredLeads[0]?.score,
    });

    // Emit completion event
    await emit({
      topic: 'leads.scoring.complete',
      data: {
        flowId,
        scoredCount: scoredLeads.length,
        summary: { hot: hotLeads, warm: warmLeads, cold: coldLeads },
      },
    });
  } catch (error) {
    logger.error('Lead scoring failed', { 
      flowId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    const flow = await state.get<LeadFlow>('flows', flowId);
    if (flow) {
      flow.status = 'failed';
      flow.error = error instanceof Error ? error.message : 'Scoring failed';
      flow.updatedAt = new Date().toISOString();
      await state.set('flows', flowId, flow);
    }
  }
};

