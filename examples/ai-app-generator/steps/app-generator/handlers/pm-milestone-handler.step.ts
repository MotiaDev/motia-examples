/**
 * PM Milestone Handler Event Step
 * 
 * Handles milestone notifications from the Project Manager agent.
 * Logs progress milestones and updates workflow state.
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  flowId: z.string(),
  milestone: z.object({
    name: z.string(),
    phase: z.string(),
    description: z.string(),
    progress: z.number(),
  }),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'PMMilestoneHandler',
  description: 'Handles milestone notifications from the Project Manager agent',
  subscribes: ['pm.milestone_reached'],
  emits: [],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['PMMilestoneHandler'] = async (input, { logger, state, streams }) => {
  const { flowId, milestone, timestamp } = input;
  
  logger.info('Milestone reached', {
    flowId,
    milestoneName: milestone.name,
    phase: milestone.phase,
    progress: milestone.progress,
  });

  // Update workflow state with milestone
  const workflowState = await state.get<any>('workflows', flowId);
  if (workflowState) {
    if (!workflowState.milestones) {
      workflowState.milestones = [];
    }
    workflowState.milestones.push({
      ...milestone,
      timestamp,
    });
    await state.set('workflows', flowId, workflowState);
  }

  // Stream progress update about the milestone
  await streams.appGenerationProgress.set(flowId, `${flowId}-milestone-${Date.now()}`, {
    id: `${flowId}-milestone-${Date.now()}`,
    flowId,
    phase: milestone.phase,
    agent: 'project-manager',
    message: `🎯 ${milestone.name}: ${milestone.description}`,
    progress: milestone.progress,
    timestamp,
    details: {
      milestoneName: milestone.name,
      phase: milestone.phase,
    },
  });

  logger.info('Milestone recorded', { flowId, milestoneName: milestone.name });
};

