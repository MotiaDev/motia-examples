/**
 * Core types for ReAct Research Assistant
 */

// Research Query Types
export interface ResearchQuery {
  queryId: string
  question: string
  context?: ResearchContext
  status: ResearchStatus
  createdAt: string
  updatedAt: string
}

export interface ResearchContext {
  industry?: string
  timeframe?: string
  preferredSources?: string[]
  maxIterations?: number
  budget?: {
    maxTokens?: number
    maxToolCalls?: number
  }
}

export type ResearchStatus = 
  | 'pending'
  | 'reasoning'
  | 'acting'
  | 'observing'
  | 'synthesizing'
  | 'completed'
  | 'failed'
  | 'max_iterations_reached'

// ReAct Loop Types
export interface ReActIteration {
  iterationNumber: number
  thought: string
  action?: ReActAction
  observation?: string
  timestamp: string
}

export interface ReActAction {
  tool: ToolName
  input: Record<string, unknown>
  reasoning: string
}

export type ToolName = 
  | 'web_search'
  | 'financial_data'
  | 'company_info'
  | 'news_search'
  | 'final_answer'

// Tool Definitions
export interface ToolDefinition {
  name: ToolName
  description: string
  parameters: Record<string, ToolParameter>
  required: string[]
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[]
}

// Tool Results
export interface ToolResult {
  tool: ToolName
  success: boolean
  data?: unknown
  error?: string
  executionTimeMs: number
}

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  publishedDate?: string
  score?: number
}

export interface FinancialDataResult {
  symbol: string
  dataType: 'quote' | 'fundamentals' | 'historical'
  data: Record<string, unknown>
  timestamp: string
}

export interface CompanyInfoResult {
  name: string
  description: string
  industry: string
  executives?: Array<{ name: string; title: string }>
  headquarters?: string
  founded?: string
  employees?: number
}

// LLM Types
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
  model: string
  finishReason: 'stop' | 'length' | 'tool_calls'
}

export interface ReActLLMOutput {
  type: 'thought_action' | 'final_answer'
  thought: string
  action?: {
    tool: ToolName
    input: Record<string, unknown>
  }
  finalAnswer?: {
    answer: string
    citations: Citation[]
    confidence: number
  }
}

export interface Citation {
  source: string
  url?: string
  quote?: string
  accessedAt: string
}

// Research Result
export interface ResearchResult {
  queryId: string
  question: string
  answer: string
  citations: Citation[]
  reasoningTrace: ReActIteration[]
  metadata: {
    totalIterations: number
    totalToolCalls: number
    totalTokens: number
    executionTimeMs: number
    model: string
  }
  completedAt: string
}

// State Keys
export const STATE_GROUPS = {
  QUERIES: 'research_queries',
  ITERATIONS: 'research_iterations',
  RESULTS: 'research_results',
  TOOL_CALLS: 'research_tool_calls',
} as const

// Stream Names
export const STREAM_NAMES = {
  RESEARCH_PROGRESS: 'researchProgress',
} as const

