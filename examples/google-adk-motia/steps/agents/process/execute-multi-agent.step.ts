import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { SubAgentSchema } from '../../../src/types/agent.types';
import { createMultiAgent } from '../../../src/services/agents';

const inputSchema = z.object({
  requestId: z.string(),
  sessionId: z.string(),
  query: z.string(),
  workflowType: z.enum(['sequential', 'parallel', 'loop']),
  maxIterations: z.number().optional().default(1),
  subAgents: z.array(SubAgentSchema),
});

export const config: EventConfig = {
  type: 'event',
  name: 'ExecuteMultiAgent',
  description: 'Execute multi-agent workflow',
  subscribes: ['execute-multi-agent'],
  emits: [],
  input: inputSchema,
  flows: ['multi-agent-research'],
};

export const handler: Handlers['ExecuteMultiAgent'] = async (input, { logger, state, streams }) => {
  const { requestId, sessionId, query, workflowType, maxIterations, subAgents } = input;
  
  try {
    logger.info('Executing multi-agent workflow', {
      requestId,
      sessionId,
      workflowType,
      numAgents: subAgents.length,
    });
    
    // Send initial status to stream
    await streams.researchProgress.set(sessionId, requestId, {
      request_id: requestId,
      session_id: sessionId,
      status: 'researching',
      metadata: {
        workflow_type: workflowType,
        total_agents: subAgents.length,
        completed_agents: 0,
      },
      timestamp: new Date().toISOString(),
    });
    
    // Update request status
    const request = await state.get<any>('multi-agent-requests', requestId);
    if (request) {
      await state.set('multi-agent-requests', requestId, {
        ...request,
        status: 'executing',
      });
    }
    
    const startTime = Date.now();
    
    // Create multi-agent orchestrator
    const multiAgent = createMultiAgent();
    
    // Execute workflow based on type
    let result;
    
    if (workflowType === 'sequential') {
      result = await multiAgent.executeSequential(query, subAgents);
    } else if (workflowType === 'parallel') {
      result = await multiAgent.executeParallel(query, subAgents);
    } else {
      result = await multiAgent.executeLoop(query, subAgents, maxIterations);
    }
    
    const totalTime = Date.now() - startTime;
    
    // Store result
    const multiAgentResult = {
      request_id: requestId,
      workflow_type: workflowType,
      results: result.results,
      final_output: result.final_output,
      total_execution_time_ms: totalTime,
      created_at: new Date().toISOString(),
    };
    
    await state.set('multi-agent-results', requestId, multiAgentResult);
    
    // Send completed status to stream
    await streams.researchProgress.set(sessionId, requestId, {
      request_id: requestId,
      session_id: sessionId,
      status: 'completed',
      final_output: result.final_output,
      metadata: {
        workflow_type: workflowType,
        total_agents: subAgents.length,
        completed_agents: subAgents.length,
        execution_time_ms: totalTime,
      },
      timestamp: new Date().toISOString(),
    });
    
    // Update request status to completed
    if (request) {
      await state.set('multi-agent-requests', requestId, {
        ...request,
        status: 'completed',
      });
    }
    
    logger.info('Multi-agent workflow completed', {
      requestId,
      sessionId,
      workflowType,
      totalTime,
      numResults: result.results.length,
    });
    
  } catch (error) {
    logger.error('Failed to execute multi-agent workflow', {
      requestId,
      sessionId,
      workflowType,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Multi-agent execution failed';
    
    // Send error status to stream
    await streams.researchProgress.set(sessionId, requestId, {
      request_id: requestId,
      session_id: sessionId,
      status: 'error',
      error: errorMessage,
      metadata: {
        workflow_type: workflowType,
        total_agents: subAgents.length,
        completed_agents: 0,
      },
      timestamp: new Date().toISOString(),
    });
    
    // Update request with error status
    const request = await state.get<any>('multi-agent-requests', requestId);
    if (request) {
      await state.set('multi-agent-requests', requestId, {
        ...request,
        status: 'error',
        error: errorMessage,
      });
    }
  }
};

