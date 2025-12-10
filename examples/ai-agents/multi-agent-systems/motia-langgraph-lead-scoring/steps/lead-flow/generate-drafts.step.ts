import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadFlow, LeadWithScore } from '../../src/services/lead-service';
import { generateEmailDrafts, EmailDraft } from '../../src/services/email-draft-service';

const inputSchema = z.object({
  flowId: z.string(),
  scoredCount: z.number(),
  summary: z.object({
    hot: z.number(),
    warm: z.number(),
    cold: z.number(),
  }),
});

export const config: EventConfig = {
  name: 'GenerateEmailDrafts',
  type: 'event',
  description: 'Generates personalized email drafts using GPT (parallel processing)',
  subscribes: ['leads.scoring.complete'],
  emits: [{ topic: 'leads.drafts.complete', label: 'Drafts Complete' }],
  input: inputSchema,
  flows: ['lead-score-flow'],
};

export const handler: Handlers['GenerateEmailDrafts'] = async (input, { emit, logger, state }) => {
  const { flowId, scoredCount, summary } = input;

  logger.info('Generating email drafts', { flowId, scoredCount, summary });

  try {
    // Get flow
    const flow = await state.get<LeadFlow>('flows', flowId);
    if (!flow) {
      logger.error('Flow not found', { flowId });
      return;
    }

    // Update status
    flow.status = 'drafting';
    flow.updatedAt = new Date().toISOString();
    await state.set('flows', flowId, flow);

    // Get scored leads
    const scoredLeads = await state.get<LeadWithScore[]>('scored-leads', flowId);
    if (!scoredLeads || scoredLeads.length === 0) {
      logger.error('No scored leads found', { flowId });
      flow.status = 'failed';
      flow.error = 'No scored leads to draft emails for';
      await state.set('flows', flowId, flow);
      return;
    }

    // Get flow settings for auto-approve
    const settings = await state.get<{ autoApproveThreshold: number | null }>('flow-settings', flowId);
    const autoApproveThreshold = settings?.autoApproveThreshold;

    logger.info('Generating drafts with parallel processing', { 
      flowId, 
      count: scoredLeads.length,
      autoApproveThreshold,
      concurrency: 10,
    });

    // Track start time
    const startTime = Date.now();
    let lastProgressLog = 0;

    // Generate drafts with parallel processing (10 concurrent requests)
    const drafts = await generateEmailDrafts(
      scoredLeads,
      10, // concurrency
      async (completed, total) => {
        // Log progress every 50 leads or 10 seconds
        const now = Date.now();
        if (completed - lastProgressLog >= 50 || now - startTime > (lastProgressLog / 50 + 1) * 10000) {
          const elapsed = ((now - startTime) / 1000).toFixed(1);
          const rate = (completed / ((now - startTime) / 1000)).toFixed(1);
          logger.info('Draft generation progress', { 
            flowId, 
            completed, 
            total, 
            percent: Math.round((completed / total) * 100),
            elapsedSeconds: elapsed,
            rate: `${rate}/sec`,
          });
          
          // Update flow progress
          flow.draftedLeads = completed;
          flow.updatedAt = new Date().toISOString();
          await state.set('flows', flowId, flow);
          
          lastProgressLog = completed;
        }
      }
    );

    // Auto-approve if threshold is set
    if (autoApproveThreshold !== null && autoApproveThreshold !== undefined) {
      for (const draft of drafts) {
        const lead = scoredLeads.find(l => l.id === draft.leadId);
        if (lead && lead.score >= autoApproveThreshold) {
          draft.approved = true;
          draft.approvedAt = new Date().toISOString();
          draft.approvedBy = 'auto';
        }
      }
    }

    // Store drafts
    await state.set('email-drafts', flowId, drafts);

    // Update flow
    const approvedCount = drafts.filter(d => d.approved).length;
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    flow.draftedLeads = drafts.length;
    flow.approvedLeads = approvedCount;
    flow.status = 'awaiting_review';
    flow.updatedAt = new Date().toISOString();
    await state.set('flows', flowId, flow);

    logger.info('Email drafts generated', { 
      flowId, 
      total: drafts.length,
      approved: approvedCount,
      totalTimeSeconds: totalTime,
      avgTimePerDraft: (parseFloat(totalTime) / drafts.length).toFixed(2),
    });

    // Emit completion event
    await emit({
      topic: 'leads.drafts.complete',
      data: {
        flowId,
        draftedCount: drafts.length,
        approvedCount,
      },
    });
  } catch (error) {
    logger.error('Draft generation failed', { 
      flowId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    const flow = await state.get<LeadFlow>('flows', flowId);
    if (flow) {
      flow.status = 'failed';
      flow.error = error instanceof Error ? error.message : 'Draft generation failed';
      flow.updatedAt = new Date().toISOString();
      await state.set('flows', flowId, flow);
    }
  }
};
