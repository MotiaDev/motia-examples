/**
 * LLM Service for ReAct Research Assistant
 * Supports Claude Opus 4.5 and Gemini Pro as configurable backends
 */

import type { LLMMessage, LLMResponse, ReActLLMOutput, ToolDefinition, ToolName } from './types'

export interface LLMConfig {
  provider: 'anthropic' | 'google'
  model: string
  apiKey: string
  maxTokens?: number
  temperature?: number
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information on any topic. Use for general research, finding recent news, or discovering facts.',
    parameters: {
      query: { type: 'string', description: 'The search query to execute' },
      maxResults: { type: 'number', description: 'Maximum number of results to return (1-10)' },
    },
    required: ['query'],
  },
  {
    name: 'financial_data',
    description: 'Get financial data for a company including stock quotes, fundamentals, and historical prices. Use for investment research or financial analysis.',
    parameters: {
      symbol: { type: 'string', description: 'The stock ticker symbol (e.g., AAPL, GOOGL)' },
      dataType: { 
        type: 'string', 
        description: 'Type of financial data to retrieve',
        enum: ['quote', 'fundamentals', 'historical'],
      },
    },
    required: ['symbol', 'dataType'],
  },
  {
    name: 'company_info',
    description: 'Get detailed company information including executives, headquarters, industry, and company description.',
    parameters: {
      companyName: { type: 'string', description: 'The name of the company to look up' },
    },
    required: ['companyName'],
  },
  {
    name: 'news_search',
    description: 'Search for recent news articles on a specific topic or company. Use for current events and recent developments.',
    parameters: {
      query: { type: 'string', description: 'The news search query' },
      timeframe: { type: 'string', description: 'Time range for news (e.g., "24h", "7d", "30d")' },
    },
    required: ['query'],
  },
  {
    name: 'final_answer',
    description: 'Provide the final comprehensive answer to the research question. Use this when you have gathered sufficient information.',
    parameters: {
      answer: { type: 'string', description: 'The comprehensive answer to the question' },
      confidence: { type: 'number', description: 'Confidence level from 0 to 1' },
      citations: { 
        type: 'array', 
        description: 'Array of citation objects with source and url fields',
      },
    },
    required: ['answer', 'confidence', 'citations'],
  },
]

function buildSystemPrompt(context?: { industry?: string; timeframe?: string }): string {
  const contextInfo = context 
    ? `\n\nContext:\n- Industry focus: ${context.industry || 'General'}\n- Timeframe: ${context.timeframe || 'Current'}`
    : ''

  return `You are an expert research assistant implementing the ReAct (Reason + Act) pattern.

Your task is to answer complex, multi-hop questions by dynamically interleaving reasoning and tool calls.

## Process
1. THINK: Reason about what information you need and why
2. ACT: Select and use an appropriate tool to gather information
3. OBSERVE: Analyze the results and determine next steps
4. REPEAT: Continue until you have sufficient information
5. SYNTHESIZE: Provide a comprehensive final answer with citations

## Available Tools
${TOOL_DEFINITIONS.map(t => `- ${t.name}: ${t.description}`).join('\n')}

## Output Format
You must respond with valid JSON in one of these formats:

For reasoning and action:
{
  "type": "thought_action",
  "thought": "Your detailed reasoning about what you need to find out and why",
  "action": {
    "tool": "tool_name",
    "input": { ... tool parameters ... }
  }
}

For final answer:
{
  "type": "final_answer",
  "thought": "Your synthesis reasoning",
  "finalAnswer": {
    "answer": "Comprehensive answer with all relevant information",
    "confidence": 0.85,
    "citations": [
      { "source": "Source Name", "url": "https://...", "quote": "relevant quote" }
    ]
  }
}

## Guidelines
- Always think step-by-step before acting
- Use multiple tools when needed for comprehensive answers
- Cite all sources used in your final answer
- Be accurate and acknowledge uncertainty when appropriate
- Aim for 3-7 iterations for complex questions${contextInfo}`
}

function buildToolsForProvider(provider: 'anthropic' | 'google'): unknown[] {
  if (provider === 'anthropic') {
    return TOOL_DEFINITIONS.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(tool.parameters).map(([key, param]) => [
            key,
            {
              type: param.type,
              description: param.description,
              ...(param.enum ? { enum: param.enum } : {}),
            },
          ])
        ),
        required: tool.required,
      },
    }))
  }
  
  // Google Gemini format
  return TOOL_DEFINITIONS.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(tool.parameters).map(([key, param]) => [
          key,
          {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          },
        ])
      ),
      required: tool.required,
    },
  }))
}

export async function callAnthropicLLM(
  messages: LLMMessage[],
  config: LLMConfig,
  context?: { industry?: string; timeframe?: string }
): Promise<LLMResponse> {
  const systemPrompt = buildSystemPrompt(context)
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model || 'claude-opus-4-5-20251101',
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      system: systemPrompt,
      messages: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string }>
    usage: { input_tokens: number; output_tokens: number }
    model: string
    stop_reason: string
  }

  const textContent = data.content.find(c => c.type === 'text')
  
  return {
    content: textContent?.text || '',
    tokenUsage: {
      prompt: data.usage.input_tokens,
      completion: data.usage.output_tokens,
      total: data.usage.input_tokens + data.usage.output_tokens,
    },
    model: data.model,
    finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
  }
}

export async function callGeminiLLM(
  messages: LLMMessage[],
  config: LLMConfig,
  context?: { industry?: string; timeframe?: string }
): Promise<LLMResponse> {
  const systemPrompt = buildSystemPrompt(context)
  
  // Gemini uses a different format
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-2.0-flash'}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          maxOutputTokens: config.maxTokens || 4096,
          temperature: config.temperature ?? 0.7,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    candidates: Array<{
      content: { parts: Array<{ text: string }> }
      finishReason: string
    }>
    usageMetadata: {
      promptTokenCount: number
      candidatesTokenCount: number
      totalTokenCount: number
    }
  }

  const content = data.candidates[0]?.content?.parts?.[0]?.text || ''
  
  return {
    content,
    tokenUsage: {
      prompt: data.usageMetadata?.promptTokenCount || 0,
      completion: data.usageMetadata?.candidatesTokenCount || 0,
      total: data.usageMetadata?.totalTokenCount || 0,
    },
    model: config.model || 'gemini-2.0-flash',
    finishReason: data.candidates[0]?.finishReason === 'STOP' ? 'stop' : 'length',
  }
}

export async function callLLM(
  messages: LLMMessage[],
  config: LLMConfig,
  context?: { industry?: string; timeframe?: string }
): Promise<LLMResponse> {
  if (config.provider === 'anthropic') {
    return callAnthropicLLM(messages, config, context)
  } else if (config.provider === 'google') {
    return callGeminiLLM(messages, config, context)
  }
  throw new Error(`Unsupported LLM provider: ${config.provider}`)
}

export function parseReActOutput(content: string): ReActLLMOutput {
  // Try to extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No valid JSON found in LLM response')
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    
    if (parsed.type === 'final_answer') {
      return {
        type: 'final_answer',
        thought: parsed.thought || '',
        finalAnswer: {
          answer: parsed.finalAnswer?.answer || '',
          confidence: parsed.finalAnswer?.confidence || 0.5,
          citations: parsed.finalAnswer?.citations || [],
        },
      }
    }
    
    return {
      type: 'thought_action',
      thought: parsed.thought || '',
      action: parsed.action ? {
        tool: parsed.action.tool as ToolName,
        input: parsed.action.input || {},
      } : undefined,
    }
  } catch (error) {
    throw new Error(`Failed to parse LLM output: ${error}`)
  }
}

export function getLLMConfig(): LLMConfig {
  // Default to Anthropic Claude Opus 4.5
  const provider = (process.env.LLM_PROVIDER || 'anthropic') as 'anthropic' | 'google'
  
  if (provider === 'anthropic') {
    return {
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    }
  }
  
  return {
    provider: 'google',
    model: process.env.GOOGLE_MODEL || 'gemini-2.0-flash',
    apiKey: process.env.GOOGLE_API_KEY || '',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  }
}

