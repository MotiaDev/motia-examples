import type { AgentRequest, AgentResponse, Conversation, Session } from './agent.types';

// ================ State Types ================

export interface AgentRequestState extends AgentRequest {
  requestId: string;
  timestamp: string;
  status: 'processing' | 'completed' | 'error';
  created_at: string;
  error?: string;
}

export interface AgentResultState extends AgentResponse {
  request_id: string;
  completed_at: string;
}

export interface ConversationState extends Conversation {
  last_message: string;
  active: boolean;
}

export interface SessionState extends Session {
  conversations: string[]; // conversation IDs
  active_conversation_id?: string;
}

export interface ToolResultState {
  tool_name: string;
  request_id: string;
  result: any;
  error?: string;
  execution_time_ms: number;
  created_at: string;
}

// ================ State Group IDs ================

export const STATE_GROUPS = {
  AGENT_REQUESTS: 'agent-requests',
  AGENT_RESULTS: 'agent-results',
  CONVERSATIONS: 'conversations',
  SESSIONS: 'sessions',
  TOOL_RESULTS: 'tool-results',
  MULTI_AGENT_RESULTS: 'multi-agent-results',
} as const;

