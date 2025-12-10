import OpenAI from 'openai';

export interface AnalysisInput {
  query?: string;
  webResources?: Array<{
    title: string;
    description: string;
  }>;
  financialData?: Array<{
    symbol: string;
    company: string;
    sector: string;
    currentPrice: number | string;
    priceChange: { percentage: string };
    marketCap: string;
    peRatio: number | string;
    analystRating: string;
    recentNews?: Array<{
      title: string;
      source: string;
    }>;
  }>;
}

export interface AnalysisResult {
  summary: string;
  detailedAnalysis: string;
  timestamp: string;
}

export class OpenAIService {
  private apiKey: string;

  /**
   * Creates a new OpenAIService instance
   * @param apiKey OpenAI API key, defaults to environment variable
   */
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found');
    }
  }

  /**
   * Performs financial analysis using OpenAI
   * @param data Analysis input data
   * @returns Analysis result
   */
  public async performAnalysis(data: AnalysisInput): Promise<AnalysisResult> {
    try {
      const openai = new OpenAI({ apiKey: this.apiKey });
      
      // Build the prompt with the data
      const prompt = this.buildAnalysisPrompt(data);
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional financial analyst. Analyze the financial data provided and give insights, recommendations, and a market outlook. Format your response in markdown with sections.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Extract and parse the response
      const analysisText = completion.choices[0]?.message?.content || 'No analysis generated';
      
      return {
        summary: this.extractSummary(analysisText),
        detailedAnalysis: analysisText,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Builds a prompt for the OpenAI analysis
   * @param data Input data for analysis
   * @returns Formatted prompt string
   */
  private buildAnalysisPrompt(data: AnalysisInput): string {
    const { query, webResources, financialData } = data;
    
    let prompt = `Analyze the following financial information${query ? ` for query: "${query}"` : ''}:\n\n`;
    
    // Add web resources summary
    if (webResources && webResources.length > 0) {
      prompt += "Web Research:\n";
      webResources.forEach((resource, index) => {
        prompt += `${index + 1}. ${resource.title}\n   ${resource.description}\n`;
      });
      prompt += "\n";
    }
    
    // Add financial data
    if (financialData && financialData.length > 0) {
      prompt += "Financial Data:\n";
      financialData.forEach(data => {
        prompt += `Stock: ${data.symbol} (${data.company})\n`;
        prompt += `Sector: ${data.sector}\n`;
        prompt += `Price: ${data.currentPrice} (${data.priceChange.percentage})\n`;
        prompt += `Market Cap: ${data.marketCap}\n`;
        prompt += `P/E Ratio: ${data.peRatio}\n`;
        prompt += `Analyst Rating: ${data.analystRating}\n`;
        
        if (data.recentNews && data.recentNews.length > 0) {
          prompt += "Recent News:\n";
          data.recentNews.forEach((news, index) => {
            prompt += `  - ${news.title} (${news.source})\n`;
          });
        }
        prompt += "\n";
      });
    }
    
    prompt += `
Based on this information, please provide:
1. A comprehensive market analysis
2. Investment recommendations
3. Risk assessment
4. Future outlook
5. Alternative investment considerations

Format your response using markdown.`;
    
    return prompt;
  }

  /**
   * Extracts a concise summary from a detailed analysis
   * @param analysis Full analysis text
   * @returns Brief summary
   */
  private extractSummary(analysis: string): string {
    // Take the first paragraph or first 150 characters
    const firstParagraph = analysis.split('\n\n')[0].trim();
    if (firstParagraph.length <= 150) {
      return firstParagraph;
    }
    return firstParagraph.substring(0, 147) + '...';
  }
} 