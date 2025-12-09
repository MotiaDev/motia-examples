/**
 * Progress Service
 * 
 * Utility service for updating workflow progress and streaming updates.
 */

export type ProgressPhase = 
  | 'requested'
  | 'designing'
  | 'coding'
  | 'testing'
  | 'refining'
  | 'assembling'
  | 'completed'
  | 'failed';

export type ProgressAgent = 
  | 'architect'
  | 'engineer'
  | 'test-designer'
  | 'test-executor'
  | 'project-manager'
  | 'designer'
  | 'assembly'
  | 'system';

export interface ProgressEvent {
  id: string;
  flowId: string;
  timestamp: string;
  phase: ProgressPhase;
  agent?: ProgressAgent;
  message: string;
  progress: number;
  details?: {
    currentModule?: string;
    modulesCompleted?: number;
    totalModules?: number;
    testsRun?: number;
    testsPassed?: number;
    iteration?: number;
    tokensUsed?: number;
    estimatedCost?: number;
  };
}

export interface ProgressUpdateParams {
  flowId: string;
  phase: ProgressPhase;
  agent?: ProgressAgent;
  message: string;
  progress: number;
  details?: ProgressEvent['details'];
}

/**
 * Creates a progress event object
 */
export function createProgressEvent(params: ProgressUpdateParams): ProgressEvent {
  return {
    id: `${params.flowId}-${Date.now()}`,
    flowId: params.flowId,
    timestamp: new Date().toISOString(),
    phase: params.phase,
    agent: params.agent,
    message: params.message,
    progress: params.progress,
    details: params.details,
  };
}

/**
 * Calculate overall progress based on workflow state
 */
export function calculateOverallProgress(
  phase: ProgressPhase,
  modulesCompleted: number = 0,
  totalModules: number = 1,
  iteration: number = 1,
  maxIterations: number = 3
): number {
  const phaseWeights: Record<ProgressPhase, { start: number; end: number }> = {
    requested: { start: 0, end: 5 },
    designing: { start: 5, end: 20 },
    coding: { start: 20, end: 50 },
    testing: { start: 50, end: 70 },
    refining: { start: 70, end: 85 },
    assembling: { start: 85, end: 95 },
    completed: { start: 95, end: 100 },
    failed: { start: 0, end: 0 },
  };

  const weight = phaseWeights[phase];
  
  if (phase === 'failed') {
    return 0;
  }

  if (phase === 'completed') {
    return 100;
  }

  // Calculate progress within phase
  let phaseProgress = 0;
  
  if (phase === 'coding' || phase === 'testing') {
    phaseProgress = totalModules > 0 ? modulesCompleted / totalModules : 0;
  } else if (phase === 'refining') {
    phaseProgress = iteration / maxIterations;
  } else {
    phaseProgress = 0.5; // Mid-point for single-task phases
  }

  return Math.round(weight.start + phaseProgress * (weight.end - weight.start));
}

/**
 * Generate phase-appropriate status message
 */
export function getPhaseMessage(
  phase: ProgressPhase,
  agent?: ProgressAgent,
  moduleName?: string
): string {
  const messages: Record<ProgressPhase, string> = {
    requested: 'App generation request received, initializing workflow...',
    designing: `${agent === 'architect' ? 'Architect' : 'System'} is designing the application architecture...`,
    coding: moduleName 
      ? `Engineer is generating code for ${moduleName}...` 
      : 'Engineer is generating application code...',
    testing: moduleName
      ? `Running tests for ${moduleName}...`
      : 'Executing test suite...',
    refining: 'Refining code based on test feedback...',
    assembling: 'Assembling final application bundle...',
    completed: 'Application generation completed successfully!',
    failed: 'Application generation failed. Check logs for details.',
  };

  return messages[phase];
}
