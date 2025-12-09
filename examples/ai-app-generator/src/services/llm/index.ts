/**
 * LLM Service Index
 * 
 * Provides a unified interface for interacting with different LLM providers.
 */

export * from './types';
export * from './gemini.service';
export * from './claude.service';

import { getGeminiService } from './gemini.service';
import { getClaudeService } from './claude.service';
import { LLMMessage, LLMConfig, LLMResponse, DEFAULT_AGENT_MODELS, AgentModelConfig } from './types';

export type AgentType = keyof AgentModelConfig;

/**
 * Get LLM response for a specific agent role
 */
export async function generateForAgent(
  agent: AgentType,
  messages: LLMMessage[],
  configOverride?: Partial<LLMConfig>
): Promise<LLMResponse> {
  const agentConfig = DEFAULT_AGENT_MODELS[agent];
  
  const config: LLMConfig = {
    model: agentConfig.model,
    maxTokens: getMaxTokensForAgent(agent),
    temperature: getTemperatureForAgent(agent),
    ...configOverride,
  };

  if (agentConfig.provider === 'gemini') {
    const gemini = getGeminiService();
    return gemini.generate(messages, config);
  } else {
    const claude = getClaudeService();
    return claude.generate(messages, config);
  }
}

/**
 * Get appropriate max tokens for each agent type
 * Engineers need more tokens for full code generation without truncation
 */
function getMaxTokensForAgent(agent: AgentType): number {
  const tokenLimits: Record<AgentType, number> = {
    architect: 8192,
    engineer: 16384, // Higher for complete code generation
    testDesigner: 8192,
    designer: 4096,
    projectManager: 4096,
  };
  return tokenLimits[agent];
}

/**
 * Get appropriate temperature for each agent type
 * Lower for code generation (more deterministic), higher for creative tasks
 */
function getTemperatureForAgent(agent: AgentType): number {
  const temperatures: Record<AgentType, number> = {
    architect: 0.7,
    engineer: 0.3, // Lower for more consistent code
    testDesigner: 0.4,
    designer: 0.8, // Higher for creative UI suggestions
    projectManager: 0.5,
  };
  return temperatures[agent];
}

