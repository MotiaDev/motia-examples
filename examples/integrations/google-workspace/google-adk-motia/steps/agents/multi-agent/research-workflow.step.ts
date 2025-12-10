import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { MultiAgentRequestSchema, MultiAgentResponseSchema } from '../../../src/types/agent.types';
import { randomUUID } from 'crypto';

const requestSchema = z.object({
  query: z.string(),
  session_id: z.string().optional(),
  workflow_type: z.enum(['sequential', 'parallel', 'loop']).optional().default('sequential'),
  max_iterations: z.number().optional().default(1),
});

const responseSchema = {
  202: z.object({
    request_id: z.string(),
    workflow_type: z.string(),
    status: z.string(),
    message: z.string(),
  }),
  400: z.object({
    error: z.string(),
    details: z.string().optional(),
  }),
  500: z.object({
    error: z.string(),
  }),
};

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ResearchWorkflow',
  description: 'Multi-agent research workflow: Research → Summarize → Critique',
  path: '/agents/research',
  method: 'POST',
  bodySchema: requestSchema,
  responseSchema,
  emits: ['execute-multi-agent'],
  flows: ['multi-agent-research'],
};

export const handler: Handlers['ResearchWorkflow'] = async (req, { emit, logger, state }) => {
  try {
    const request = requestSchema.parse(req.body);
    const requestId = randomUUID();
    const sessionId = request.session_id || randomUUID();
    
    logger.info('Starting multi-agent research workflow', {
      requestId,
      sessionId,
      workflowType: request.workflow_type,
    });
    
    // Define research workflow agents
    const subAgents = [
      {
        id: 'researcher',
        name: 'Research Agent',
        role: 'researcher',
        system_prompt: `You are a comprehensive research agent. Your role is to:
1. Conduct thorough research on the given topic
2. Gather current information and trends
3. Identify key facts, statistics, and developments
4. Provide structured findings with sources

Be detailed and comprehensive in your research.`,
        tools: ['google_search'],
      },
      {
        id: 'summarizer',
        name: 'Summarizer Agent',
        role: 'summarizer',
        system_prompt: `You are a synthesis agent. Your role is to:
1. Analyze the research findings provided
2. Extract key insights and patterns
3. Create clear, actionable summaries
4. Highlight the most important points

Focus on clarity and actionability.`,
      },
      {
        id: 'critic',
        name: 'Critic Agent',
        role: 'critic',
        system_prompt: `You are a critical analysis agent. Your role is to:
1. Evaluate the research and summary quality
2. Identify gaps or missing information
3. Assess risks and opportunities
4. Provide recommendations for improvement

Be constructive and thorough in your critique.`,
      },
    ];
    
    // Store request in state
    await state.set('multi-agent-requests', requestId, {
      requestId,
      sessionId,
      query: request.query,
      workflow_type: request.workflow_type,
      max_iterations: request.max_iterations,
      sub_agents: subAgents,
      status: 'processing',
      created_at: new Date().toISOString(),
    });
    
    // Emit event to execute multi-agent workflow
    await emit({
      topic: 'execute-multi-agent',
      data: {
        requestId,
        sessionId,
        query: request.query,
        workflowType: request.workflow_type,
        maxIterations: request.max_iterations,
        subAgents,
      },
    });
    
    logger.info('Multi-agent research workflow queued', { requestId, sessionId });
    
    return {
      status: 202,
      body: {
        request_id: requestId,
        workflow_type: request.workflow_type || 'sequential',
        status: 'processing',
        message: 'Multi-agent research is in progress. Poll GET /agents/research/:requestId for results.',
      },
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validation error in research workflow', {
        error: error.message,
        issues: error.issues,
      });
      
      return {
        status: 400,
        body: {
          error: 'Invalid request data',
          details: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        },
      };
    }
    
    logger.error('Failed to initiate research workflow', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      status: 500,
      body: {
        error: 'Failed to initiate research workflow',
      },
    };
  }
};

