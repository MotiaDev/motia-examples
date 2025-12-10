import { config } from 'dotenv';
config();

interface NIMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class NIMClient {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.NVIDIA_NIM_API_KEY || '';
    this.baseURL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    
    if (!this.apiKey) {
      throw new Error('NVIDIA_NIM_API_KEY is required in .env file');
    }
  }

  async chat(prompt: string, model: string = 'moonshotai/kimi-k2-instruct'): Promise<string> {
    try {
      console.log(`🔗 Making request to: ${this.baseURL}/chat/completions`);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
          temperature: 0.7
        })
      });

      console.log(`📊 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error (${response.status}):`, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log(`📝 Raw response:`, responseText.substring(0, 200) + '...');

      const data: NIMResponse = JSON.parse(responseText);
      return data.choices[0]?.message?.content || 'No response content';
      
    } catch (error) {
      console.error('🚨 Full error details:', error);
      throw error;
    }
  }
}

export const nim = new NIMClient();
