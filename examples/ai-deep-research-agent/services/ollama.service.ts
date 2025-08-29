import { Ollama } from 'ollama'

export class OllamaService {
  private client: Ollama
  private model: string

  constructor(host?: string) {
    this.client = new Ollama({
      host: host || process.env.OLLAMA_HOST || 'http://localhost:11434',
    })
    this.model = process.env.OLLAMA_MODEL || 'llama3.1'
  }

  /**
   * Generate search queries for a given topic
   * @param topic The topic to generate queries for
   * @param count The number of queries to generate
   * @returns Array of search queries
   */
  async generateSearchQueries(topic: string, count: number): Promise<string[]> {
    const systemPrompt = `You are a helpful research assistant tasked with generating search queries to explore a given topic in-depth.
    Generate ${count} different search queries that will help gather comprehensive information about the topic.
    Each query should focus on a different aspect or perspective of the topic.
    Return ONLY a valid JSON array of strings with no additional text.`

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Topic: ${topic}` }
      ],
      format: 'json',
      options: {
        temperature: 0.7,
      },
    })

    const content = response.message.content
    if (!content) {
      throw new Error('Failed to generate search queries: No content returned')
    }

    try {
      // Parse the response to get the search queries
      const parsedResponse = JSON.parse(content)
      console.log('Ollama generateSearchQueries parsed response:', {
        type: typeof parsedResponse,
        hasQueries: !!parsedResponse?.queries,
        isArray: Array.isArray(parsedResponse),
        keys: parsedResponse ? Object.keys(parsedResponse) : 'none'
      })
      return parsedResponse.queries || parsedResponse || []
    } catch (error) {
      // Fallback: try to extract queries from text response
      console.warn('Failed to parse JSON response, attempting fallback extraction', {
        error: error instanceof Error ? error.message : String(error),
        contentPreview: content?.slice(0, 200)
      })
      const lines = content.split('\n').filter(line => line.trim())
      return lines.slice(0, count)
    }
  }

  /**
   * Analyze extracted content to generate research insights
   * @param originalQuery The original research query
   * @param extractedContents Array of content objects extracted from web search
   * @param depth Current research depth
   * @param maxDepth Maximum research depth
   * @returns Analysis object with summary, key findings, sources, and optional follow-up queries
   */
  async analyzeContent(
    originalQuery: string,
    extractedContents: Array<{
      url: string;
      title: string;
      content: string;
      query: string;
    }>,
    depth: number,
    maxDepth: number
  ): Promise<any> {
    // Prepare content for analysis
    let contentForAnalysis = extractedContents.map(content => {
      return `
SOURCE: ${content.title}
URL: ${content.url}
RELATED TO QUERY: ${content.query}
CONTENT:
${content.content.slice(0, 5000)} // Limit content size to avoid token limits
`;
    }).join('\n\n');

    // Truncate if too large to fit in context window
    if (contentForAnalysis.length > 100000) {
      contentForAnalysis = contentForAnalysis.slice(0, 100000) + '... (content truncated)';
    }

    // System prompt for analysis
    const systemPrompt = `You are a research assistant analyzing web content to create a comprehensive summary on "${originalQuery}".
    
    Analyze the provided content from multiple sources and:
    
    1. Create a detailed summary of the findings
    2. Identify key insights and important facts
    3. List the sources used
    
    If this is at depth ${depth} of a total allowed depth of ${maxDepth}, also identify areas that need further research.
    
    Format your response as a valid JSON object with the following structure:
    {
      "summary": "Comprehensive summary of findings",
      "keyFindings": ["Key finding 1", "Key finding 2", ...],
      "sources": [{"title": "Source title", "url": "Source URL"}, ...],
      "followUpQueries": ["Query 1", "Query 2", ...] // Only include if further research is needed
    }`;

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contentForAnalysis }
      ],
      format: 'json',
      options: {
        temperature: 0.5,
      },
    })

    const content = response.message.content
    if (!content) {
      throw new Error('Failed to generate analysis: No content returned')
    }

    try {
      // Parse and return the response
      const parsed = JSON.parse(content)
      console.log('Ollama analyzeContent parsed response:', {
        type: typeof parsed,
        hasSummary: !!parsed?.summary,
        hasKeyFindings: !!parsed?.keyFindings,
        hasSources: !!parsed?.sources,
        hasFollowUpQueries: !!parsed?.followUpQueries,
        keys: parsed ? Object.keys(parsed) : 'none'
      })
      return parsed
    } catch (error) {
      console.error('Failed to parse Ollama analysis response:', {
        error: error instanceof Error ? error.message : String(error),
        contentLength: content?.length,
        contentPreview: content?.slice(0, 200) + '...'
      })
      throw new Error(`Failed to parse analysis response: ${error instanceof Error ? error.message : String(error)}. Content preview: ${content?.slice(0, 200)}`)
    }
  }

  /**
   * Generate a final research report from analyses at different depths
   * @param originalQuery The original research query
   * @param analyses Array of analyses from different research depths
   * @returns Final research report object
   */
  async generateResearchReport(originalQuery: string, analyses: any[]): Promise<any> {
    const analysesContent = JSON.stringify(analyses, null, 2)

    const systemPrompt = `You are a research assistant tasked with compiling a comprehensive report on "${originalQuery}".
    
    You have been provided with analyses from different depths of research. Your task is to:
    
    1. Synthesize all the information into a cohesive report
    2. Organize the content into logical sections
    3. Highlight the most important findings and insights
    4. Include all relevant sources
    
    Format your response as a valid JSON object with the following structure:
    {
      "title": "Research Report Title",
      "overview": "Executive summary of the entire research",
      "sections": [
        {"title": "Section Title", "content": "Section content..."},
        ...
      ],
      "keyTakeaways": ["Key takeaway 1", "Key takeaway 2", ...],
      "sources": [{"title": "Source title", "url": "Source URL"}, ...],
      "originalQuery": "The original research query",
      "metadata": {
        "depthUsed": 2,
        "completedAt": "ISO date string"
      }
    }`

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: analysesContent }
      ],
      format: 'json',
      options: {
        temperature: 0.5,
      },
    })

    const content = response.message.content
    if (!content) {
      throw new Error('Failed to generate final report: No content returned')
    }

    try {
      const parsed = JSON.parse(content)
      
      // Log the parsed response for debugging
      console.log('Ollama generateResearchReport parsed response:', {
        type: typeof parsed,
        hasTitle: !!parsed?.title,
        hasOverview: !!parsed?.overview,
        hasSections: !!parsed?.sections,
        hasKeyTakeaways: !!parsed?.keyTakeaways,
        hasSources: !!parsed?.sources,
        keys: parsed ? Object.keys(parsed) : 'none'
      })
      
      return parsed
    } catch (error) {
      console.error('Failed to parse Ollama response:', {
        error: error instanceof Error ? error.message : String(error),
        contentLength: content?.length,
        contentPreview: content?.slice(0, 200) + '...',
        contentType: typeof content
      })
      throw new Error(`Failed to parse final report response: ${error instanceof Error ? error.message : String(error)}. Content preview: ${content?.slice(0, 200)}`)
    }
  }
}
