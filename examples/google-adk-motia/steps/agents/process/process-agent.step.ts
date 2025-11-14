import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { AgentConfigSchema } from '../../../src/types/agent.types';
import type { AgentRequestState, AgentResultState } from '../../../src/types/state.types';
import { createGeminiAgent } from '../../../src/services/agents';

const inputSchema = z.object({
  requestId: z.string(),
  sessionId: z.string(),
  message: z.string(),
  config: AgentConfigSchema.optional(),
  context: z.record(z.any()).optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessAgentRequest',
  description: 'Process agent chat request using Gemini',
  subscribes: ['process-agent-request'],
  emits: [],
  input: inputSchema,
  flows: ['agent-chat'],
};

export const handler: Handlers['ProcessAgentRequest'] = async (input, { logger, state, streams }) => {
  const { requestId, sessionId, message, config: agentConfig, context } = input;
  
  try {
    logger.info('Processing agent request', { requestId, sessionId });
    
    // Send initial processing status to stream
    await streams.agentResponse.set(sessionId, requestId, {
      request_id: requestId,
      session_id: sessionId,
      status: 'processing',
      response: '',
      metadata: {
        model_used: agentConfig?.model || 'gemini-2.5-flash',
        agent_type: 'simple',
      },
      timestamp: new Date().toISOString(),
    });
    
    // Update request status
    const request = await state.get<AgentRequestState>('agent-requests', requestId);
    if (request) {
      await state.set('agent-requests', requestId, {
        ...request,
        status: 'processing',
      });
    }
    
    const startTime = Date.now();
    
    // Get conversation history from state
    const conversationKey = `conversation-${sessionId}`;
    const conversation = await state.get<any>('conversations', conversationKey) || {
      messages: [],
    };
    
    // Create and execute agent
    const agent = createGeminiAgent({
      config: {
        model: agentConfig?.model || 'gemini-2.5-flash',
        temperature: agentConfig?.temperature || 0.7,
        max_tokens: agentConfig?.max_tokens,
        system_prompt: agentConfig?.system_prompt,
        tools: agentConfig?.tools || [],
      },
      systemPrompt: 'You are a helpful AI assistant powered by Google Gemini. Provide clear, accurate, and helpful responses.',
    });
    
    const result = await agent.execute(message, conversation.messages);
    
    const executionTime = Date.now() - startTime;
    
    // Update conversation history
    conversation.messages.push({
      role: 'user',
      content: message,
    });
    conversation.messages.push({
      role: 'assistant',
      content: result.response,
    });
    
    await state.set('conversations', conversationKey, conversation);
    
    // Store result
    const agentResult: AgentResultState = {
      request_id: requestId,
      session_id: sessionId,
      response: result.response,
      tool_calls: result.tool_calls?.map(tc => ({
        tool_name: tc.name,
        arguments: tc.arguments,
        result: tc.result,
      })),
      metadata: {
        model_used: agentConfig?.model || 'gemini-2.5-flash',
        tokens_used: result.tokens_used,
        execution_time_ms: executionTime,
        agent_type: 'simple',
      },
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    
    await state.set('agent-results', requestId, agentResult);
    
    // Send completed status to stream with response
    await streams.agentResponse.set(sessionId, requestId, {
      request_id: requestId,
      session_id: sessionId,
      status: 'completed',
      response: result.response,
      metadata: {
        model_used: agentConfig?.model || 'gemini-2.5-flash',
        tokens_used: result.tokens_used,
        execution_time_ms: executionTime,
        agent_type: 'simple',
      },
      timestamp: new Date().toISOString(),
    });
    
    // Update request status to completed
    if (request) {
      await state.set('agent-requests', requestId, {
        ...request,
        status: 'completed',
      });
    }
    
    logger.info('Agent request completed', {
      requestId,
      sessionId,
      executionTime,
      responseLength: result.response.length,
    });
    
  } catch (error) {
    logger.error('Failed to process agent request', {
      requestId,
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to process agent request';
    
    // Send error status to stream
    await streams.agentResponse.set(sessionId, requestId, {
      request_id: requestId,
      session_id: sessionId,
      status: 'error',
      error: errorMessage,
      metadata: {
        model_used: agentConfig?.model || 'gemini-2.5-flash',
        agent_type: 'simple',
        execution_time_ms: 0,
      },
      timestamp: new Date().toISOString(),
    });
    
    // Update request with error status
    const request = await state.get<AgentRequestState>('agent-requests', requestId);
    if (request) {
      await state.set('agent-requests', requestId, {
        ...request,
        status: 'error',
        error: errorMessage,
      });
    }
    
    // Store error result
    await state.set('agent-results', requestId, {
      request_id: requestId,
      session_id: sessionId,
      response: '',
      metadata: {
        model_used: agentConfig?.model || 'gemini-2.5-flash',
        execution_time_ms: 0,
        agent_type: 'simple',
      },
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error: errorMessage,
    });
  }
};

