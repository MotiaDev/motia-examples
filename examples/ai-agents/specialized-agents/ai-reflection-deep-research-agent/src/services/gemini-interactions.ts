/**
 * Gemini Interactions API Service
 * 
 * Unified interface for interacting with Gemini models and agents
 * using the new Interactions API for stateful conversations,
 * function calling, and deep research capabilities.
 * 
 * Note: The Interactions API is in Beta. Types are simplified
 * as the official SDK types may not be fully available yet.
 */

import { GoogleGenAI } from '@google/genai'

// Type definitions for Interactions API (Beta)
type Interaction = any
type InteractionContent = any

export type GeminiModel = 'gemini-3-pro-preview' | 'gemini-2.5-flash' | 'gemini-2.5-pro'
export type GeminiAgent = 'deep-research-pro-preview-12-2025'

export interface InteractionOptions {
  model?: GeminiModel
  agent?: GeminiAgent
  previousInteractionId?: string
  tools?: InteractionTool[]
  responseFormat?: Record<string, unknown>
  generationConfig?: GenerationConfig
  stream?: boolean
  background?: boolean
  store?: boolean
}

export interface InteractionTool {
  type: 'function' | 'google_search' | 'code_execution' | 'url_context' | 'mcp_server'
  name?: string
  description?: string
  parameters?: Record<string, unknown>
  url?: string
}

export interface GenerationConfig {
  temperature?: number
  maxOutputTokens?: number
  thinkingLevel?: 'low' | 'medium' | 'high'
}

export interface FunctionCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface FunctionResult {
  type: 'function_result'
  name: string
  callId: string
  result: unknown
}

export interface GeminiResponse {
  id: string
  text: string
  status: 'completed' | 'in_progress' | 'requires_action' | 'failed' | 'cancelled'
  functionCalls?: FunctionCall[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface StreamChunk {
  eventType: 'content.delta' | 'interaction.complete'
  delta?: {
    type: 'text' | 'thought'
    text?: string
    thought?: string
  }
  interaction?: Interaction
}

class GeminiInteractionsService {
  private client: GoogleGenAI

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY
    if (!key) {
      throw new Error('GEMINI_API_KEY is required. Set it as an environment variable or pass it to the constructor.')
    }
    this.client = new GoogleGenAI({ apiKey: key })
  }

  /**
   * Create a new interaction with the Gemini API
   * Supports text, multimodal inputs, function calling, and agents
   */
  async createInteraction(
    input: string | InteractionContent[],
    options: InteractionOptions = {}
  ): Promise<GeminiResponse> {
    const {
      model = 'gemini-3-pro-preview',
      agent,
      previousInteractionId,
      tools,
      responseFormat,
      generationConfig,
      background = false,
      store = true,
    } = options

    const interactionParams: Record<string, unknown> = {
      input,
      store,
    }

    // Use either model or agent, not both
    if (agent) {
      interactionParams.agent = agent
      interactionParams.background = background
    } else {
      interactionParams.model = model
    }

    if (previousInteractionId) {
      interactionParams.previous_interaction_id = previousInteractionId
    }

    if (tools && tools.length > 0) {
      interactionParams.tools = tools
    }

    if (responseFormat) {
      interactionParams.response_format = responseFormat
    }

    if (generationConfig) {
      interactionParams.generation_config = {
        temperature: generationConfig.temperature,
        max_output_tokens: generationConfig.maxOutputTokens,
        thinking_level: generationConfig.thinkingLevel,
      }
    }

    const interaction = await this.client.interactions.create(interactionParams as any)

    return this.mapInteractionToResponse(interaction)
  }

  /**
   * Create a streaming interaction for real-time responses
   */
  async *createStreamingInteraction(
    input: string | InteractionContent[],
    options: Omit<InteractionOptions, 'stream'> = {}
  ): AsyncGenerator<StreamChunk> {
    const {
      model = 'gemini-3-pro-preview',
      previousInteractionId,
      tools,
      responseFormat,
      generationConfig,
    } = options

    const interactionParams: Record<string, unknown> = {
      model,
      input,
      stream: true,
    }

    if (previousInteractionId) {
      interactionParams.previous_interaction_id = previousInteractionId
    }

    if (tools && tools.length > 0) {
      interactionParams.tools = tools
    }

    if (responseFormat) {
      interactionParams.response_format = responseFormat
    }

    if (generationConfig) {
      interactionParams.generation_config = {
        temperature: generationConfig.temperature,
        max_output_tokens: generationConfig.maxOutputTokens,
        thinking_level: generationConfig.thinkingLevel,
      }
    }

    const stream = await this.client.interactions.create(interactionParams as any)

    for await (const chunk of stream as any) {
      yield {
        eventType: chunk.event_type,
        delta: chunk.delta ? {
          type: chunk.delta.type,
          text: chunk.delta.text,
          thought: chunk.delta.thought,
        } : undefined,
        interaction: chunk.interaction,
      }
    }
  }

  /**
   * Continue a conversation by providing function results
   */
  async provideFunctionResults(
    previousInteractionId: string,
    results: FunctionResult[],
    options: Omit<InteractionOptions, 'previousInteractionId'> = {}
  ): Promise<GeminiResponse> {
    const input = results.map(r => ({
      type: 'function_result' as const,
      name: r.name,
      call_id: r.callId,
      result: r.result,
    }))

    return this.createInteraction(input, {
      ...options,
      previousInteractionId,
    })
  }

  /**
   * Get a previously stored interaction by ID
   */
  async getInteraction(interactionId: string): Promise<GeminiResponse> {
    const interaction = await this.client.interactions.get(interactionId)
    return this.mapInteractionToResponse(interaction)
  }

  /**
   * Poll for completion of a background interaction (for agents like Deep Research)
   */
  async pollForCompletion(
    interactionId: string,
    options: {
      pollIntervalMs?: number
      maxWaitMs?: number
      onProgress?: (status: string) => void
    } = {}
  ): Promise<GeminiResponse> {
    const { pollIntervalMs = 10000, maxWaitMs = 600000, onProgress } = options
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      const interaction = await this.client.interactions.get(interactionId)
      const status = (interaction as any).status

      if (onProgress) {
        onProgress(status)
      }

      if (status === 'completed') {
        return this.mapInteractionToResponse(interaction)
      }

      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Interaction ${status}: ${interactionId}`)
      }

      await this.sleep(pollIntervalMs)
    }

    throw new Error(`Interaction timed out after ${maxWaitMs}ms: ${interactionId}`)
  }

  /**
   * Create an interaction with structured output (JSON schema)
   */
  async createStructuredInteraction<T>(
    input: string | InteractionContent[],
    schema: Record<string, unknown>,
    options: Omit<InteractionOptions, 'responseFormat'> = {}
  ): Promise<{ id: string; data: T; status: string }> {
    const response = await this.createInteraction(input, {
      ...options,
      responseFormat: schema,
    })

    try {
      // Try to parse the JSON response
      let text = response.text.trim()
      
      // Handle markdown code blocks if present
      if (text.startsWith('```json')) {
        text = text.slice(7)
      } else if (text.startsWith('```')) {
        text = text.slice(3)
      }
      if (text.endsWith('```')) {
        text = text.slice(0, -3)
      }
      text = text.trim()
      
      const data = JSON.parse(text) as T
      return {
        id: response.id,
        data,
        status: response.status,
      }
    } catch (error) {
      // Log truncated response for debugging
      const preview = response.text.slice(0, 500)
      throw new Error(`Failed to parse structured response (possibly truncated). Preview: ${preview}...`)
    }
  }

  /**
   * Use Deep Research agent for comprehensive research tasks
   */
  async deepResearch(
    query: string,
    options: {
      pollIntervalMs?: number
      maxWaitMs?: number
      onProgress?: (status: string) => void
    } = {}
  ): Promise<GeminiResponse> {
    const initialInteraction = await this.createInteraction(query, {
      agent: 'deep-research-pro-preview-12-2025',
      background: true,
    })

    return this.pollForCompletion(initialInteraction.id, options)
  }

  /**
   * Create interaction with Google Search grounding
   */
  async createGroundedInteraction(
    input: string,
    options: Omit<InteractionOptions, 'tools'> = {}
  ): Promise<GeminiResponse> {
    return this.createInteraction(input, {
      ...options,
      tools: [{ type: 'google_search' }],
    })
  }

  /**
   * Create interaction with code execution capability
   */
  async createCodeExecutionInteraction(
    input: string,
    options: Omit<InteractionOptions, 'tools'> = {}
  ): Promise<GeminiResponse> {
    return this.createInteraction(input, {
      ...options,
      tools: [{ type: 'code_execution' }],
    })
  }

  private mapInteractionToResponse(interaction: Interaction): GeminiResponse {
    const outputs = (interaction as any).outputs || []
    let text = ''
    const functionCalls: FunctionCall[] = []

    for (const output of outputs) {
      if (output.type === 'text') {
        text = output.text || ''
      } else if (output.type === 'function_call') {
        functionCalls.push({
          id: output.id,
          name: output.name,
          arguments: output.arguments,
        })
      }
    }

    const usage = (interaction as any).usage

    return {
      id: (interaction as any).id,
      text,
      status: (interaction as any).status || 'completed',
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      usage: usage ? {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      } : undefined,
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
let geminiService: GeminiInteractionsService | null = null

export function getGeminiService(apiKey?: string): GeminiInteractionsService {
  if (!geminiService) {
    geminiService = new GeminiInteractionsService(apiKey)
  }
  return geminiService
}

export { GeminiInteractionsService }

