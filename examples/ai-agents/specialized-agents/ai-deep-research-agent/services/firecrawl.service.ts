import FirecrawlApp from '@mendable/firecrawl-js';
import { Logger } from 'motia'

export interface SearchResult {
  url: string
  title: string
  snippet: string
}

export interface SearchOptions {
  query: string
  num_results?: number
}

export interface ExtractOptions {
  url: string
}

export interface ExtractedContent {
  url: string
  title: string
  content: string
  query: string
}

export class FirecrawlService {
  private client: FirecrawlApp

  constructor(apiKey?: string) {
    const key = apiKey || process.env.FIRECRAWL_API_KEY || ''
    const apiUrl = process.env.FIRECRAWL_API_URL;
    
    if (!key) {
      throw new Error('Firecrawl API key is not set')
    }
    
    this.client = new FirecrawlApp({apiUrl, apiKey: key})
  }

  async search(options: SearchOptions, logger?: Logger): Promise<SearchResult[]> {
    logger?.info('Executing search query', { query: options.query })
    
    try {
      const response = await this.client.search(options.query);

      if (!response.success) {
        logger?.error('ssss failed', { query: options.query, error: response })
        throw new Error(`Search failed: ${response.error}`)
      }
      
      // Transform the results to match our interface
      const results: SearchResult[] = (response.data || []).map(doc => ({
        url: doc.url || '',
        title: doc.title || '',
        snippet: doc.description || ''
      }));
      
      logger?.info('Search results received', { 
        query: options.query, 
        resultCount: results.length 
      })
      
      return results;
    } catch (error) {
      logger?.error('Error during search', { query: options.query, error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  async extractContent(options: ExtractOptions, logger?: Logger): Promise<string> {
    logger?.info('Extracting content from URL', { url: options.url })
    
    try {
      const response = await this.client.scrapeUrl(options.url, { formats: ['markdown'] });

      if (!response.success) {
        throw new Error(`Scraping failed: ${response.error}`)
      }
      
      const content = response.markdown || '';
      
      logger?.info('Content extracted successfully', { 
        url: options.url, 
        contentLength: content.length 
      })
      
      return content;
    } catch (error) {
      logger?.error('Error during content extraction', { url: options.url, error })
      throw error
    }
  }

  async batchExtractContent(
    urlsToExtract: Array<{ url: string; title: string; query: string }>,
    logger?: Logger
  ): Promise<ExtractedContent[]> {
    const extractedContents: ExtractedContent[] = []

    const urlBatches: Array<Array<{ url: string; title: string; query: string }>> = []

    const concurrencyLimit = parseInt(process.env.FIRECRAWL_CONCURRENCY_LIMIT || '2')

    for (let i = 0; i < urlsToExtract.length; i += concurrencyLimit) {
      urlBatches.push(urlsToExtract.slice(i, i + concurrencyLimit))
    }

    for (const batch of urlBatches) {
      await Promise.all(batch.map(async ({ url, title, query }) => {
        try {
          const content = await this.extractContent({ url }, logger)
          
          extractedContents.push({
            url,
            title,
            content,
            query
          })
        } catch (error) {
          // Continue with other URLs even if one fails
          logger?.error('Error during batch content extraction', { url, error })
        }
      }))
    }

    return extractedContents
  }
} 