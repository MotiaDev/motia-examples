/** AI Model Configuration for Tic Tac Toe Tournament */

export type ModelProvider = 'anthropic' | 'google' | 'openai'
export type ModelCategory = 'premium' | 'high-performance' | 'fast' | 'preview' | 'pro' | 'flash'
export type ReasoningMode = 'standard' | 'extended' | 'preview-enhanced'

export interface ModelMetadata {
  id: string
  provider: ModelProvider
  category: ModelCategory
  reasoningMode: ReasoningMode
  latencyProfile: 'low' | 'medium' | 'high'
  displayName: string
  description?: string
}

export const CLAUDE_MODELS: ModelMetadata[] = [
  { id: 'claude-opus-4-5-20251101', provider: 'anthropic', category: 'premium', reasoningMode: 'extended', latencyProfile: 'high', displayName: 'Claude Opus 4.5', description: 'Maximum intelligence with extended thinking' },
  { id: 'claude-opus-4-5', provider: 'anthropic', category: 'premium', reasoningMode: 'extended', latencyProfile: 'high', displayName: 'Claude Opus 4.5 (Latest)' },
  { id: 'claude-3-7-sonnet-latest', provider: 'anthropic', category: 'high-performance', reasoningMode: 'extended', latencyProfile: 'medium', displayName: 'Claude 3.7 Sonnet (Latest)' },
  { id: 'claude-3-7-sonnet-20250219', provider: 'anthropic', category: 'high-performance', reasoningMode: 'extended', latencyProfile: 'medium', displayName: 'Claude 3.7 Sonnet' },
  { id: 'claude-sonnet-4-20250514', provider: 'anthropic', category: 'high-performance', reasoningMode: 'extended', latencyProfile: 'medium', displayName: 'Claude Sonnet 4' },
  { id: 'claude-sonnet-4-0', provider: 'anthropic', category: 'high-performance', reasoningMode: 'standard', latencyProfile: 'medium', displayName: 'Claude Sonnet 4.0' },
  { id: 'claude-4-sonnet-20250514', provider: 'anthropic', category: 'high-performance', reasoningMode: 'extended', latencyProfile: 'medium', displayName: 'Claude 4 Sonnet' },
  { id: 'claude-sonnet-4-5', provider: 'anthropic', category: 'high-performance', reasoningMode: 'extended', latencyProfile: 'medium', displayName: 'Claude Sonnet 4.5' },
  { id: 'claude-sonnet-4-5-20250929', provider: 'anthropic', category: 'high-performance', reasoningMode: 'extended', latencyProfile: 'medium', displayName: 'Claude Sonnet 4.5 (Sept 2025)' },
  { id: 'claude-3-5-haiku-latest', provider: 'anthropic', category: 'fast', reasoningMode: 'standard', latencyProfile: 'low', displayName: 'Claude 3.5 Haiku (Latest)' },
  { id: 'claude-3-5-haiku-20241022', provider: 'anthropic', category: 'fast', reasoningMode: 'standard', latencyProfile: 'low', displayName: 'Claude 3.5 Haiku' }
]

export const GEMINI_MODELS: ModelMetadata[] = [
  { id: 'gemini-3-pro-preview', provider: 'google', category: 'pro', reasoningMode: 'preview-enhanced', latencyProfile: 'medium', displayName: 'Gemini 3 Pro Preview' },
  { id: 'gemini-3-pro-image-preview', provider: 'google', category: 'pro', reasoningMode: 'preview-enhanced', latencyProfile: 'medium', displayName: 'Gemini 3 Pro Image Preview' },
  { id: 'gemini-2.5-flash', provider: 'google', category: 'flash', reasoningMode: 'standard', latencyProfile: 'low', displayName: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-preview-09-2025', provider: 'google', category: 'flash', reasoningMode: 'preview-enhanced', latencyProfile: 'low', displayName: 'Gemini 2.5 Flash Preview' },
  { id: 'gemini-2.5-pro', provider: 'google', category: 'pro', reasoningMode: 'extended', latencyProfile: 'medium', displayName: 'Gemini 2.5 Pro' }
]

export const OPENAI_MODELS: ModelMetadata[] = [
  { id: 'gpt-5.1', provider: 'openai', category: 'premium', reasoningMode: 'extended', latencyProfile: 'high', displayName: 'GPT-5.1' },
  { id: 'gpt-5', provider: 'openai', category: 'premium', reasoningMode: 'extended', latencyProfile: 'high', displayName: 'GPT-5' },
  { id: 'gpt-4.1', provider: 'openai', category: 'high-performance', reasoningMode: 'standard', latencyProfile: 'medium', displayName: 'GPT-4.1' },
  { id: 'gpt-4o', provider: 'openai', category: 'high-performance', reasoningMode: 'standard', latencyProfile: 'medium', displayName: 'GPT-4o' },
  { id: 'gpt-4o-mini', provider: 'openai', category: 'fast', reasoningMode: 'standard', latencyProfile: 'low', displayName: 'GPT-4o Mini' },
  { id: 'o3', provider: 'openai', category: 'premium', reasoningMode: 'extended', latencyProfile: 'high', displayName: 'O3' },
  { id: 'o3-mini', provider: 'openai', category: 'high-performance', reasoningMode: 'extended', latencyProfile: 'medium', displayName: 'O3 Mini' },
  { id: 'o1', provider: 'openai', category: 'high-performance', reasoningMode: 'extended', latencyProfile: 'medium', displayName: 'O1' },
  { id: 'o1-mini', provider: 'openai', category: 'fast', reasoningMode: 'extended', latencyProfile: 'low', displayName: 'O1 Mini' }
]

export const ALL_MODELS: ModelMetadata[] = [...CLAUDE_MODELS, ...GEMINI_MODELS, ...OPENAI_MODELS]

export function getModelsByProvider(provider: ModelProvider): ModelMetadata[] {
  return ALL_MODELS.filter(m => m.provider === provider)
}

export function getModelById(id: string): ModelMetadata | undefined {
  return ALL_MODELS.find(m => m.id === id)
}

export function getModelsByCategory(category: ModelCategory): ModelMetadata[] {
  return ALL_MODELS.filter(m => m.category === category)
}

export interface TeamConfig {
  name: string
  provider: ModelProvider
  models: string[]
  displayName: string
}

export const DEFAULT_TEAMS: Record<string, TeamConfig> = {
  anthropic: {
    name: 'Team Anthropic',
    provider: 'anthropic',
    models: ['claude-sonnet-4-5', 'claude-3-5-haiku-latest'],
    displayName: '🟣 Team Claude'
  },
  google: {
    name: 'Team Google',
    provider: 'google',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    displayName: '🔵 Team Gemini'
  },
  openai: {
    name: 'Team OpenAI',
    provider: 'openai',
    models: ['gpt-4o', 'gpt-4o-mini'],
    displayName: '🟢 Team OpenAI'
  }
}
