/**
 * LLM Service Types
 * 
 * Defines interfaces for interacting with LLM providers (Gemini, Claude)
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  estimatedCost: number;
}

export interface LLMProvider {
  name: string;
  generate(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>;
  estimateCost(inputTokens: number, outputTokens: number): number;
}

// Model configurations
export const GEMINI_MODELS = {
  PRO: 'gemini-2.0-flash',
} as const;

export const CLAUDE_MODELS = {
  OPUS: 'claude-sonnet-4-20250514',
  SONNET: 'claude-sonnet-4-20250514',
} as const;

// Pricing per 1M tokens (approximate)
export const MODEL_PRICING = {
  [GEMINI_MODELS.PRO]: { input: 1.25, output: 5.0 },
  [CLAUDE_MODELS.OPUS]: { input: 15.0, output: 75.0 },
  [CLAUDE_MODELS.SONNET]: { input: 3.0, output: 15.0 },
} as const;

// Agent to model mapping
export type AgentModelConfig = {
  architect: { provider: 'gemini' | 'claude'; model: string };
  engineer: { provider: 'gemini' | 'claude'; model: string };
  testDesigner: { provider: 'gemini' | 'claude'; model: string };
  designer: { provider: 'gemini' | 'claude'; model: string };
  projectManager: { provider: 'gemini' | 'claude'; model: string };
};

export const DEFAULT_AGENT_MODELS: AgentModelConfig = {
  architect: { provider: 'gemini', model: GEMINI_MODELS.PRO },
  engineer: { provider: 'claude', model: CLAUDE_MODELS.SONNET },
  testDesigner: { provider: 'claude', model: CLAUDE_MODELS.SONNET },
  designer: { provider: 'gemini', model: GEMINI_MODELS.PRO },
  projectManager: { provider: 'gemini', model: GEMINI_MODELS.PRO },
};

