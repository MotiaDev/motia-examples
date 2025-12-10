import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export class WebSearchService {
  private searchUrl: string;
  private apiKey: string;

  /**
   * Creates a new WebSearchService instance
   * @param apiKey API key for search service
   * @param searchUrl Base URL for search engine API
   */
  constructor(apiKey: string = process.env.SERPER_API_KEY || '', searchUrl: string = 'https://google.serper.dev/search') {
    this.searchUrl = searchUrl;
    this.apiKey = apiKey;
  }

  /**
   * Performs a web search with the specified query
   * @param query Search query
   * @returns Array of search results
   */
  public async search(query: string): Promise<SearchResult[]> {
    try {
      // Check if we have an API key
      if (!this.apiKey) {
        console.warn('No API key provided for search service. Using mock data.');
        return this.getMockSearchResults(query);
      }

      const response = await axios.post(this.searchUrl, {
        q: query,
        gl: 'us',
        hl: 'en',
        num: 10
      }, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Check if we have organic search results
      if (response.data && response.data.organic && Array.isArray(response.data.organic)) {
        // Parse and return SerperDev results
        return this.parseSerperResults(response.data);
      } else {
        // Fallback to mock data if API doesn't return expected format
        console.warn('API response format not recognized, using fallback data');
        return this.getMockSearchResults(query);
      }
    } catch (error) {
      console.error('Web search error:', error);
      // Fallback to mock data on error
      return this.getMockSearchResults(query);
    }
  }

  /**
   * Parses SerperDev API response into SearchResult format
   * @param data Response from SerperDev API
   * @returns Formatted search results
   */
  private parseSerperResults(data: any): SearchResult[] {
    const results: SearchResult[] = [];
    
    // Add organic search results
    if (data.organic && Array.isArray(data.organic)) {
      data.organic.forEach((result: any) => {
        results.push({
          title: result.title || 'Untitled',
          snippet: result.snippet || 'No description available',
          url: result.link || '#'
        });
      });
    }
    
    // Add "People also ask" results if available
    if (data.peopleAlsoAsk && Array.isArray(data.peopleAlsoAsk)) {
      data.peopleAlsoAsk.forEach((item: any) => {
        results.push({
          title: item.question || 'Question',
          snippet: item.snippet || item.answer || 'No answer available',
          url: item.link || '#'
        });
      });
    }
    
    // Add knowledge graph info if available
    if (data.knowledgeGraph) {
      const kg = data.knowledgeGraph;
      if (kg.title && (kg.description || kg.snippet)) {
        results.push({
          title: kg.title,
          snippet: kg.description || kg.snippet || 'Knowledge graph result',
          url: kg.siteLinks?.[0]?.link || kg.website || '#'
        });
      }
    }
    
    return results;
  }

  /**
   * Generates mock search results for demonstration
   * This is now used as fallback if API calls fail
   * @param query Search query
   * @returns Array of mock search results
   */
  private getMockSearchResults(query: string): SearchResult[] {
    // Return simulated results
    return [
      {
        title: `Financial Analysis: ${query}`,
        snippet: `Latest financial analysis and insights about ${query} from experts.`,
        url: `https://example.com/finance/${encodeURIComponent(query)}`
      },
      {
        title: `Market News: ${query}`,
        snippet: `Recent market developments related to ${query} and impact on investors.`,
        url: `https://example.com/market-news/${encodeURIComponent(query)}`
      },
      {
        title: `Investment Guide: ${query}`,
        snippet: `Expert investment guide and recommendations regarding ${query}.`,
        url: `https://example.com/investment/${encodeURIComponent(query)}`
      },
      {
        title: `${query} Stock Price`,
        snippet: `Current stock price, historical data, and predictions for ${query}.`,
        url: `https://example.com/stock/${encodeURIComponent(query)}`
      },
      {
        title: `${query} Company Profile`,
        snippet: `Comprehensive company profile, leadership, products, and market position of ${query}.`,
        url: `https://example.com/company/${encodeURIComponent(query)}`
      }
    ];
  }
} 