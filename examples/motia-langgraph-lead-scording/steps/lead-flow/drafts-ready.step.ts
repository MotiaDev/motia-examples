import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  flowId: z.string(),
  draftedCount: z.number(),
  approvedCount: z.number(),
});

export const config: EventConfig = {
  name: 'DraftsReady',
  type: 'event',
  description: 'Marks drafts as ready for review. Human-in-the-loop checkpoint.',
  subscribes: ['leads.drafts.complete'],
  emits: [],
  input: inputSchema,
  flows: ['lead-score-flow'],
};

export const handler: Handlers['DraftsReady'] = async (input, { logger }) => {
  const { flowId, draftedCount, approvedCount } = input;

  logger.info('📋 Drafts ready for review', { 
    flowId, 
    draftedCount,
    approvedCount,
    needsReview: draftedCount - approvedCount,
  });

  // This is a checkpoint - human review happens via API
  // No automated emit here - user must approve via /approve endpoint
  // then trigger send via /send endpoint
};

