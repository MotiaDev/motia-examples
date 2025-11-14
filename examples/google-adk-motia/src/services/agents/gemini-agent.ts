import type { AgentConfig, Message, ToolDefinition } from '../../types/agent.types';

export interface GeminiAgentParams {
  config: AgentConfig;
  tools?: ToolDefinition[];
  systemPrompt?: string;
}

export interface AgentExecutionResult {
  response: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
    result?: any;
  }>;
  tokens_used?: number;
  execution_time_ms: number;
}

/**
 * Gemini Agent Service
 * 
 * Integrates with Google's Gemini API to power agent capabilities.
 * This service handles:
 * - Message processing with Gemini models
 * - Tool calling and function execution
 * - Conversation history management
 * - Structured output generation
 */
export class GeminiAgentService {
  private config: AgentConfig;
  private tools: ToolDefinition[];
  private systemPrompt?: string;
  private apiKey: string;

  constructor(params: GeminiAgentParams) {
    this.config = params.config;
    this.tools = params.tools || [];
    this.systemPrompt = params.systemPrompt;
    
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Execute agent with a message and conversation history
   */
  async execute(
    message: string,
    conversationHistory: Message[] = []
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      // In a real implementation, this would call Google's Gemini API
      // For now, we'll create a mock response structure
      
      const messages = this.prepareMessages(message, conversationHistory);
      
      // This is where the actual Gemini API call would happen
      const response = await this.callGeminiAPI(messages);
      
      const executionTime = Date.now() - startTime;

      return {
        response: response.text,
        tool_calls: response.tool_calls,
        tokens_used: response.tokens_used,
        execution_time_ms: executionTime,
      };
    } catch (error) {
      throw new Error(
        `Gemini agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Prepare messages for Gemini API
   */
  private prepareMessages(message: string, history: Message[]): any[] {
    const messages: any[] = [];

    // Add system prompt if provided
    if (this.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.systemPrompt,
      });
    }

    // Add conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    return messages;
  }

  /**
   * Call Gemini API with real implementation
   */
  private async callGeminiAPI(messages: any[]): Promise<{
    text: string;
    tool_calls?: any[];
    tokens_used?: number;
  }> {
    // Import dynamically to avoid loading issues
    const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = await import('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(this.apiKey);
    
    // Configure safety settings
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    // Get the generative model
    const model = genAI.getGenerativeModel({ 
      model: this.config.model || 'gemini-2.5-flash',
      safetySettings,
      generationConfig: {
        temperature: this.config.temperature || 0.7,
        maxOutputTokens: this.config.max_tokens || 8192,
      },
      systemInstruction: this.systemPrompt,
    });

    // Prepare tools for function calling if available
    const tools = this.tools.length > 0 ? [{
      functionDeclarations: this.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }))
    }] : undefined;

    console.log(`🤖 Calling Gemini API (${this.config.model || 'gemini-2.5-flash'})`);
    console.log(`   - Messages: ${messages.length}`);
    console.log(`   - Tools: ${this.tools.length}`);

    try {
      // Convert messages to Gemini format
      const contents = messages
        .filter(msg => msg.role !== 'system') // System message handled by systemInstruction
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));

      // Make the API call
      const result = await model.generateContent({
        contents,
        tools,
      });

      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ Gemini API responded with ${text.length} characters`);

      // Check for function calls
      const tool_calls = response.functionCalls()?.map(fc => ({
        id: `call_${Date.now()}`,
        name: fc.name,
        arguments: fc.args as Record<string, any>,
      }));

      // Estimate tokens (rough estimate: 1 token ≈ 4 characters)
      const tokens_used = Math.ceil((text.length + JSON.stringify(messages).length) / 4);

      return {
        text,
        tool_calls,
        tokens_used,
      };
    } catch (error: any) {
      console.error('❌ Gemini API Error:', error);
      
      if (error.message?.includes('API key')) {
        throw new Error('Invalid API key. Please check your GEMINI_API_KEY in the .env file. Get your key from: https://aistudio.google.com/app/apikey');
      }
      
      if (error.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please check your Gemini API usage limits.');
      }
      
      if (error.message?.includes('SAFETY')) {
        throw new Error('Content was blocked by safety filters. Please try rephrasing your message.');
      }
      
      throw error;
    }
  }

  /**
   * Execute a tool/function call
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // In a real implementation, this would execute the actual tool function
    // For now, return a mock result
    return {
      success: true,
      result: `Tool ${toolName} executed with args: ${JSON.stringify(args)}`,
    };
  }
}

/**
 * Create a Gemini agent instance
 */
export function createGeminiAgent(params: GeminiAgentParams): GeminiAgentService {
  return new GeminiAgentService(params);
}

