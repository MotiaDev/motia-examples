import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadFlow, Lead } from '../../src/services/lead-service';

const inputSchema = z.object({
  flowId: z.string(),
  leadsCount: z.number(),
});

export const config: EventConfig = {
  name: 'ProcessCSV',
  type: 'event',
  description: 'Processes uploaded CSV and triggers lead scoring',
  subscribes: ['leads.csv.uploaded'],
  emits: [{ topic: 'leads.scoring.start', label: 'Start Scoring' }],
  input: inputSchema,
  flows: ['lead-score-flow'],
};

export const handler: Handlers['ProcessCSV'] = async (input, { emit, logger, state }) => {
  const { flowId, leadsCount } = input;

  logger.info('Processing CSV upload', { flowId, leadsCount });

  try {
    // Get flow
    const flow = await state.get<LeadFlow>('flows', flowId);
    if (!flow) {
      logger.error('Flow not found', { flowId });
      return;
    }

    // Update flow status
    flow.status = 'processing';
    flow.processedLeads = leadsCount;
    flow.updatedAt = new Date().toISOString();
    await state.set('flows', flowId, flow);

    // Get leads from state
    const leads = await state.get<Lead[]>('leads', flowId);
    if (!leads || leads.length === 0) {
      logger.error('No leads found in state', { flowId });
      flow.status = 'failed';
      flow.error = 'No leads found to process';
      await state.set('flows', flowId, flow);
      return;
    }

    logger.info('CSV processed, starting scoring', { flowId, leadsCount: leads.length });

    // Emit event to start scoring
    await emit({
      topic: 'leads.scoring.start',
      data: {
        flowId,
        leadsCount: leads.length,
      },
    });
  } catch (error) {
    logger.error('Failed to process CSV', { 
      flowId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    const flow = await state.get<LeadFlow>('flows', flowId);
    if (flow) {
      flow.status = 'failed';
      flow.error = error instanceof Error ? error.message : 'Processing failed';
      flow.updatedAt = new Date().toISOString();
      await state.set('flows', flowId, flow);
    }
  }
};

