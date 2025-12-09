/**
 * Project Manager Agent Event Step (Cron-based)
 * 
 * The Project Manager agent that:
 * - Periodically monitors workflow progress
 * - Flags risks and blockers
 * - Suggests optimizations
 * - Coordinates milestone completions
 * 
 * Runs every 2 minutes to check active workflows.
 */

import type { CronConfig, Handlers } from 'motia';
import { createProgressEvent } from '../../../src/services/progress.service';

export const config: CronConfig = {
  type: 'cron',
  name: 'ProjectManagerAgent',
  description: 'Project Manager agent that monitors workflows and flags risks',
  cron: '*/2 * * * *', // Every 2 minutes
  emits: [
    { topic: 'pm.risk_flagged', label: 'Risk identified', conditional: true },
    { topic: 'pm.milestone_reached', label: 'Milestone completed', conditional: true },
  ],
  flows: ['app-generator'],
};

export const handler: Handlers['ProjectManagerAgent'] = async ({ emit, logger, state, streams }) => {
  logger.info('Project Manager Agent running health check');

  try {
    // Get all active workflows from state
    const workflows = await state.getGroup<any>('workflows');
    
    if (!workflows || workflows.length === 0) {
      logger.info('No active workflows to monitor');
      return;
    }

    for (const workflow of workflows) {
      if (!workflow || !workflow.flowId) continue;
      
      const { flowId, status, phases, currentPhase, errors, createdAt, metrics } = workflow;

      // Skip completed or failed workflows
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        continue;
      }

      logger.info('Monitoring workflow', { flowId, status, currentPhase });

      // Check for stale workflows (no updates in 10 minutes)
      const lastUpdate = new Date(workflow.updatedAt || createdAt).getTime();
      const now = Date.now();
      const staleThreshold = 10 * 60 * 1000; // 10 minutes

      if (now - lastUpdate > staleThreshold) {
        logger.warn('Stale workflow detected', { flowId, lastUpdate: workflow.updatedAt });
        
        await streams.appGenerationProgress.set(flowId, `${flowId}-pm-stale`, createProgressEvent({
          flowId,
          phase: workflow.status,
          agent: 'project-manager',
          message: `⚠️ Workflow appears stale. Last update was ${Math.round((now - lastUpdate) / 60000)} minutes ago.`,
          progress: calculateProgressFromPhase(currentPhase),
          details: {
            iteration: workflow.currentIteration,
          },
        }));

        await emit({
          topic: 'pm.risk_flagged',
          data: {
            flowId,
            riskType: 'stale_workflow',
            message: 'Workflow has not progressed in 10+ minutes',
            severity: 'high',
          },
        });
        continue;
      }

      // Check for high error count
      if (errors && errors.length >= 3) {
        logger.warn('High error count detected', { flowId, errorCount: errors.length });
        
        await streams.appGenerationProgress.set(flowId, `${flowId}-pm-errors`, createProgressEvent({
          flowId,
          phase: workflow.status,
          agent: 'project-manager',
          message: `⚠️ Multiple errors detected (${errors.length}). Consider reviewing the workflow.`,
          progress: calculateProgressFromPhase(currentPhase),
        }));

        await emit({
          topic: 'pm.risk_flagged',
          data: {
            flowId,
            riskType: 'high_error_count',
            message: `${errors.length} errors encountered during generation`,
            severity: 'medium',
            errors: errors.slice(-3), // Last 3 errors
          },
        });
      }

      // Check for cost overruns
      const estimatedBudget = 1.0; // $1 default budget
      if (metrics?.estimatedCost > estimatedBudget) {
        logger.warn('Cost threshold exceeded', { flowId, cost: metrics.estimatedCost });
        
        await streams.appGenerationProgress.set(flowId, `${flowId}-pm-cost`, createProgressEvent({
          flowId,
          phase: workflow.status,
          agent: 'project-manager',
          message: `💰 Cost alert: $${metrics.estimatedCost.toFixed(4)} spent (budget: $${estimatedBudget.toFixed(2)})`,
          progress: calculateProgressFromPhase(currentPhase),
          details: {
            tokensUsed: metrics.totalTokens,
            estimatedCost: metrics.estimatedCost,
          },
        }));
      }

      // Check for milestone completions
      if (currentPhase === 'design_completed' && workflow.designDocument) {
        await emit({
          topic: 'pm.milestone_reached',
          data: {
            flowId,
            milestone: 'design_completed',
            message: 'Architecture design phase completed',
            componentCount: workflow.designDocument.components?.length || 0,
          },
        });
      }

      // Log progress summary
      const completedModules = workflow.modules?.filter((m: any) => 
        m.status === 'passed' || m.status === 'generated'
      ).length || 0;
      const totalModules = workflow.modules?.length || 0;

      logger.info('Workflow health check complete', {
        flowId,
        status,
        currentPhase,
        modulesProgress: `${completedModules}/${totalModules}`,
        iteration: workflow.currentIteration,
        tokensUsed: metrics?.totalTokens || 0,
        estimatedCost: metrics?.estimatedCost?.toFixed(4) || '0',
      });
    }

  } catch (error: any) {
    logger.error('Project Manager Agent error', { error: error.message });
  }
};

function calculateProgressFromPhase(phase: string): number {
  const phaseProgress: Record<string, number> = {
    'requested': 5,
    'designing': 15,
    'design_completed': 20,
    'coding': 40,
    'testing': 60,
    'refining': 75,
    'assembling': 90,
    'completed': 100,
    'failed': 0,
  };
  return phaseProgress[phase] || 0;
}

