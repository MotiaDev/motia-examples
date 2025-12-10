export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SearchOptions {
  num?: number;
  gl?: string;
  hl?: string;
}

export class SerpAPIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.SERPAPI_KEY || '';
    this.baseUrl = 'https://serpapi.com/search';

    if (!this.apiKey) {
      console.warn('SERPAPI_KEY not set - SerpAPI calls will fail');
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      num = 10,
      gl = 'us',
      hl = 'en',
    } = options;

    const params = new URLSearchParams({
      api_key: this.apiKey,
      q: query,
      engine: 'google',
      num: num.toString(),
      gl,
      hl,
    });

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SerpAPI error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Extract organic results
    const organicResults = data.organic_results || [];

    return organicResults.map((result: any, index: number) => ({
      title: result.title || '',
      link: result.link || '',
      snippet: result.snippet || '',
      position: index + 1,
    }));
  }

  async searchNews(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      num = 10,
      gl = 'us',
      hl = 'en',
    } = options;

    const params = new URLSearchParams({
      api_key: this.apiKey,
      q: query,
      engine: 'google_news',
      num: num.toString(),
      gl,
      hl,
    });

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SerpAPI error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const newsResults = data.news_results || [];

    return newsResults.map((result: any, index: number) => ({
      title: result.title || '',
      link: result.link || '',
      snippet: result.snippet || result.description || '',
      position: index + 1,
    }));
  }
}


