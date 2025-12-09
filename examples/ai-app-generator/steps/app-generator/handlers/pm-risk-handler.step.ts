/**
 * PM Risk Handler Event Step
 * 
 * Handles risk flags from the Project Manager agent.
 * Logs risks and can trigger notifications or alerts.
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  flowId: z.string(),
  risk: z.object({
    type: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    message: z.string(),
    suggestion: z.string().optional(),
  }),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'PMRiskHandler',
  description: 'Handles risk flags from the Project Manager agent',
  subscribes: ['pm.risk_flagged'],
  emits: [],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['PMRiskHandler'] = async (input, { logger, state, streams }) => {
  const { flowId, risk, timestamp } = input;
  
  logger.warn('Risk flagged by Project Manager', {
    flowId,
    riskType: risk.type,
    severity: risk.severity,
    message: risk.message,
  });

  // Update workflow state with risk info
  const workflowState = await state.get<any>('workflows', flowId);
  if (workflowState) {
    if (!workflowState.risks) {
      workflowState.risks = [];
    }
    workflowState.risks.push({
      ...risk,
      timestamp,
      acknowledged: false,
    });
    await state.set('workflows', flowId, workflowState);
  }

  // Stream progress update about the risk
  await streams.appGenerationProgress.set(flowId, `${flowId}-risk-${Date.now()}`, {
    id: `${flowId}-risk-${Date.now()}`,
    flowId,
    phase: 'monitoring',
    agent: 'project-manager',
    message: `⚠️ Risk detected: ${risk.message}`,
    progress: workflowState?.progress || 0,
    timestamp,
    details: {
      riskType: risk.type,
      severity: risk.severity,
      suggestion: risk.suggestion,
    },
  });

  logger.info('Risk recorded', { flowId, riskType: risk.type });
};

