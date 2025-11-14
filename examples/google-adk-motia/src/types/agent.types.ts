import { z } from 'zod';

// ================ Core Agent Schemas ================

export const AgentConfigSchema = z.object({
  model: z.string().default('gemini-2.5-flash'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  max_tokens: z.number().optional(),
  system_prompt: z.string().optional(),
  tools: z.array(z.string()).optional().default([]),
});

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  tool_calls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.any()),
  })).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
});

export const ConversationSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  messages: z.array(MessageSchema),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.any()).optional(),
});

// ================ Tool Schemas ================

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional(),
  }),
  type: z.enum(['function', 'builtin', 'mcp', 'langchain']).default('function'),
});

export const ToolExecutionSchema = z.object({
  tool_name: z.string(),
  arguments: z.record(z.any()),
  result: z.any().optional(),
  error: z.string().optional(),
  execution_time_ms: z.number().optional(),
});

// ================ Agent Request/Response Schemas ================

export const AgentRequestSchema = z.object({
  message: z.string(),
  session_id: z.string().optional(),
  agent_type: z.enum(['simple', 'tool_using', 'multi_agent']).default('simple'),
  config: AgentConfigSchema.optional(),
  context: z.record(z.any()).optional(),
});

export const AgentResponseSchema = z.object({
  request_id: z.string(),
  session_id: z.string(),
  response: z.string(),
  tool_calls: z.array(ToolExecutionSchema).optional(),
  conversation_history: z.array(MessageSchema).optional(),
  metadata: z.object({
    model_used: z.string(),
    tokens_used: z.number().optional(),
    execution_time_ms: z.number(),
    agent_type: z.string(),
  }),
  created_at: z.string(),
});

// ================ Multi-Agent Schemas ================

export const SubAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(), // e.g., 'researcher', 'summarizer', 'critic'
  system_prompt: z.string(),
  tools: z.array(z.string()).optional(),
  config: AgentConfigSchema.optional(),
});

export const MultiAgentRequestSchema = z.object({
  query: z.string(),
  session_id: z.string().optional(),
  workflow_type: z.enum(['sequential', 'parallel', 'loop']).default('sequential'),
  sub_agents: z.array(SubAgentSchema),
  coordinator_prompt: z.string().optional(),
  max_iterations: z.number().optional().default(1),
});

export const MultiAgentResponseSchema = z.object({
  request_id: z.string(),
  workflow_type: z.string(),
  results: z.array(z.object({
    agent_id: z.string(),
    agent_name: z.string(),
    response: z.string(),
    tool_executions: z.array(ToolExecutionSchema).optional(),
    execution_time_ms: z.number(),
  })),
  final_output: z.string(),
  total_execution_time_ms: z.number(),
  created_at: z.string(),
});

// ================ Structured Output Schemas ================

export const StructuredOutputRequestSchema = z.object({
  prompt: z.string(),
  output_schema: z.record(z.any()), // JSON Schema
  session_id: z.string().optional(),
  config: AgentConfigSchema.optional(),
});

export const StructuredOutputResponseSchema = z.object({
  request_id: z.string(),
  structured_data: z.record(z.any()),
  raw_response: z.string().optional(),
  validation_errors: z.array(z.string()).optional(),
  created_at: z.string(),
});

// ================ Memory Schemas ================

export const MemorySchema = z.object({
  session_id: z.string(),
  conversation_id: z.string(),
  type: z.enum(['in_memory', 'persistent']).default('in_memory'),
  storage_path: z.string().optional(),
  max_messages: z.number().optional().default(50),
});

export const SessionSchema = z.object({
  session_id: z.string(),
  user_id: z.string().optional(),
  created_at: z.string(),
  last_activity: z.string(),
  message_count: z.number(),
  metadata: z.record(z.any()).optional(),
});

// ================ Callback Schemas ================

export const CallbackEventSchema = z.object({
  event_type: z.enum(['agent_start', 'agent_end', 'llm_start', 'llm_end', 'tool_start', 'tool_end']),
  agent_id: z.string().optional(),
  tool_name: z.string().optional(),
  data: z.record(z.any()).optional(),
  timestamp: z.string(),
});

// ================ Type Exports ================

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
export type ToolExecution = z.infer<typeof ToolExecutionSchema>;
export type AgentRequest = z.infer<typeof AgentRequestSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type SubAgent = z.infer<typeof SubAgentSchema>;
export type MultiAgentRequest = z.infer<typeof MultiAgentRequestSchema>;
export type MultiAgentResponse = z.infer<typeof MultiAgentResponseSchema>;
export type StructuredOutputRequest = z.infer<typeof StructuredOutputRequestSchema>;
export type StructuredOutputResponse = z.infer<typeof StructuredOutputResponseSchema>;
export type Memory = z.infer<typeof MemorySchema>;
export type Session = z.infer<typeof SessionSchema>;
export type CallbackEvent = z.infer<typeof CallbackEventSchema>;

// ================ Constants ================

export const DEFAULT_MODELS = {
  GEMINI: 'gemini-1.5-pro',
  OPENAI: 'gpt-4',
  ANTHROPIC: 'claude-3-sonnet-20240229',
};

export const BUILTIN_TOOLS = {
  SEARCH: 'google_search',
  CODE_EXECUTION: 'code_execution',
  WEB_SCRAPE: 'web_scrape',
} as const;

export const AGENT_ROLES = {
  RESEARCHER: 'researcher',
  SUMMARIZER: 'summarizer',
  CRITIC: 'critic',
  COORDINATOR: 'coordinator',
  ANALYST: 'analyst',
} as const;

