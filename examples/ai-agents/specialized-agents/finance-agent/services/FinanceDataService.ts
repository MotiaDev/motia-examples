import axios from 'axios';
import * as dotenv from 'dotenv';
import yahooFinance from 'yahoo-finance2';

// Load environment variables
dotenv.config();

// API configuration
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const API_TIMEOUT = 10000; // 10 seconds timeout for all API requests

// Configure axios defaults
axios.defaults.timeout = API_TIMEOUT;

// Module-specific Yahoo options
const yahooModuleOptions = { 
  validateResult: false as const // Explicitly set type to false, not boolean
};

// Interfaces for the data
export interface StockData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  marketCap: number;
  pe: number;
  dividend: number;
}

export interface AnalystRecommendation {
  buy: number;
  hold: number;
  sell: number;
  targetPrice: number;
}

export interface CompanyInfo {
  name: string;
  sector: string;
  employees: number;
  founded: number;
  headquarters: string;
}

export interface CompanyNews {
  title: string;
  date: string;
  source: string;
  url: string;
}

export interface FinancialData {
  symbol: string;
  stockData: StockData;
  analystRecommendations: AnalystRecommendation;
  companyInfo: CompanyInfo;
  recentNews: CompanyNews[];
}

// Type definitions for API responses
interface AlphaVantageQuote {
  'Global Quote'?: {
    '01. symbol': string;
    '05. price': string;
    '06. volume': string;
    '09. change': string;
    [key: string]: string;
  };
}

interface AlphaVantageCompanyOverview {
  Name?: string;
  Sector?: string;
  FullTimeEmployees?: string;
  IPOYear?: string;
  Address?: string;
  [key: string]: string | undefined;
}

interface AlphaVantageNewsItem {
  title: string;
  time_published: string;
  source: string;
  url: string;
  [key: string]: any;
}

interface AlphaVantageNewsFeed {
  feed?: AlphaVantageNewsItem[];
  [key: string]: any;
}

interface YahooSummaryDetail {
  marketCap?: number;
  trailingPE?: number;
  dividendYield?: number;
  [key: string]: any;
}

interface YahooAssetProfile {
  longName?: string;
  sector?: string;
  fullTimeEmployees?: number;
  foundedYear?: number;
  city?: string;
  country?: string;
  [key: string]: any;
}

interface YahooNewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  [key: string]: any;
}

export class FinanceDataService {
  /**
   * Extracts potential stock symbols from a query string
   * @param query User query string
   * @returns Array of potential stock symbols found in the query
   */
  public extractPotentialSymbols(query: string): string[] {
    // Regular expression to match potential stock symbols
    // Matches 1-5 uppercase letters, optionally followed by a dot and 1-2 letters (for foreign stocks)
    const symbolRegex = /\b[A-Z]{1,5}(?:\.[A-Z]{1,2})?\b/g;
    
    // Common financial companies and their symbols for direct matching
    const knownCompanies = new Map([
      ['APPLE', 'AAPL'],
      ['MICROSOFT', 'MSFT'], 
      ['GOOGLE', 'GOOGL'],
      ['ALPHABET', 'GOOGL'],
      ['AMAZON', 'AMZN'],
      ['META', 'META'],
      ['FACEBOOK', 'META'],
      ['TESLA', 'TSLA'],
      ['NVIDIA', 'NVDA'],
      ['NETFLIX', 'NFLX'],
      ['IBM', 'IBM'],
      ['INTEL', 'INTC'],
      ['AMD', 'AMD'],
      ['COCA-COLA', 'KO'],
      ['DISNEY', 'DIS'],
      ['WALMART', 'WMT'],
      ['NIKE', 'NKE'],
      ['MCDONALDS', 'MCD'],
      ['STARBUCKS', 'SBUX'],
      ['COSTCO', 'COST'],
      ['VISA', 'V'],
      ['MASTERCARD', 'MA'],
      ['PAYPAL', 'PYPL'],
      ['UBER', 'UBER'],
      ['LYFT', 'LYFT'],
      ['AIRBNB', 'ABNB'],
      ['PINTEREST', 'PINS'],
      ['SNAPCHAT', 'SNAP'],
      ['TWITTER', 'TWTR'],
      ['SPOTIFY', 'SPOT']
    ]);
    
    // Known valid stock tickers (including most popular ones)
    const knownTickers = new Set([
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX',
      'IBM', 'INTC', 'AMD', 'KO', 'DIS', 'WMT', 'NKE', 'MCD', 'SBUX', 'COST',
      'V', 'MA', 'PYPL', 'UBER', 'LYFT', 'ABNB', 'PINS', 'SNAP', 'TWTR', 'SPOT',
      'JPM', 'BAC', 'GS', 'MS', 'C', 'WFC', 'BRK.A', 'BRK.B', 'JNJ', 'PG',
      'UNH', 'HD', 'VZ', 'T', 'PFE', 'MRK', 'XOM', 'CVX', 'BA', 'CAT'
    ]);
    
    // Filter out common English words and phrases that might match the pattern
    // Extended list to cover more financial terms and common words that might look like symbols
    const commonWords = new Set([
      'A', 'I', 'ME', 'MY', 'IT', 'IS', 'BE', 'AM', 'PM', 'THE', 'AND', 'OR', 'IF', 'IN', 'ON', 'AT', 'TO', 'OF', 'BY',
      'FOR', 'AS', 'SO', 'BUT', 'OUT', 'UP', 'FAQ', 'CEO', 'CFO', 'CTO', 'COO', 'SVP', 'VP', 'USA', 'UK', 'EU',
      'WHAT', 'WHO', 'WHY', 'HOW', 'WHEN', 'WHERE', 'WHICH', 'THAT', 'THESE', 'THOSE', 'THEY', 'THIS', 'WILL', 'ABOUT',
      'FROM', 'WITH', 'SHOW', 'GET', 'CAN', 'MAY', 'HAS', 'HAD', 'WAS', 'WERE', 'BEEN', 'NEW', 'OLD', 'BIG', 'TOP', 'DOW',
      'STOCK', 'STOCKS', 'PRICE', 'PRICES', 'MARKET', 'MARKETS', 'TRADE', 'TRADES', 'TRADING', 'BUY', 'SELL',
      'GAIN', 'GAINS', 'LOSS', 'LOSSES', 'PROFIT', 'PROFITS', 'DIVIDEND', 'DIVIDENDS', 'YIELD', 'YIELDS',
      'FUND', 'FUNDS', 'ETF', 'ETFS', 'BOND', 'BONDS', 'VALUE', 'GROWTH', 'INCOME', 'RETURN', 'RETURNS',
      'HIGH', 'LOW', 'OPEN', 'CLOSE', 'VOLUME', 'INFO', 'NEWS', 'DATA', 'REPORT', 'TELL', 'MOST', 'BEST',
      'YES', 'NO', 'NOW', 'THEN', 'HERE', 'THERE', 'YOUR', 'MY', 'HIS', 'HER', 'THEIR', 'OUR'
    ]);
    
    // First priority: Check for direct company name matches
    const upperQuery = query.toUpperCase();
    const companyMatches = Array.from(knownCompanies.entries())
      .filter(([company]) => upperQuery.includes(company))
      .map(([_, symbol]) => symbol);
    
    if (companyMatches.length > 0) {
      return companyMatches;
    }
    
    // Second priority: Extract all potential symbol matches
    const matches = query.toUpperCase().match(symbolRegex) || [];
    
    // Third priority: Check if any extracted symbols are known tickers
    const knownMatches = matches.filter(symbol => knownTickers.has(symbol));
    
    if (knownMatches.length > 0) {
      return knownMatches;
    }
    
    // Last resort: Filter common words and return remaining potential symbols
    const filteredSymbols = matches
      .filter(match => !commonWords.has(match)) // Remove common words
      .filter(symbol => symbol.length >= 2);    // Symbols should be at least 2 characters
    
    return Array.from(new Set(filteredSymbols));
  }

  /**
   * Retrieves comprehensive financial data for a symbol
   * @param symbol Stock symbol
   * @returns Promise with financial data
   */
  public async getFinancialData(symbol: string): Promise<FinancialData> {
    try {
      return {
        symbol,
        stockData: await this.getStockData(symbol),
        analystRecommendations: await this.getAnalystRecommendations(symbol),
        companyInfo: await this.getCompanyInfo(symbol),
        recentNews: await this.getCompanyNews(symbol)
      };
    } catch (error) {
      console.error(`Error retrieving financial data for ${symbol}:`, error);
      // Return data with defaults if any part fails
      return {
        symbol,
        stockData: {
          symbol,
          price: 0,
          change: 0,
          volume: 0,
          marketCap: 0,
          pe: 0,
          dividend: 0
        },
        analystRecommendations: {
          buy: 0,
          hold: 0,
          sell: 0,
          targetPrice: 0
        },
        companyInfo: {
          name: `${symbol}`,
          sector: 'Unknown',
          employees: 0,
          founded: 0,
          headquarters: 'Unknown'
        },
        recentNews: []
      };
    }
  }

  /**
   * Gets stock price and related metrics from Alpha Vantage and Yahoo Finance
   * @param symbol Stock symbol
   * @returns Promise with stock data
   */
  private async getStockData(symbol: string): Promise<StockData> {
    try {
      // First, try to get data from Alpha Vantage
      const response = await axios.get<AlphaVantageQuote>(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol,
          apikey: ALPHA_VANTAGE_API_KEY
        }
      });

      const quote = response.data['Global Quote'];
      
      if (quote && quote['01. symbol']) {
        // If we have Alpha Vantage data, use it for price and change
        const price = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change']);
        const volume = parseInt(quote['06. volume'], 10);
        
        // Get additional data from Yahoo Finance
        try {
          const yahooData = await yahooFinance.quoteSummary(symbol, {
            modules: ['price', 'summaryDetail', 'defaultKeyStatistics'],
            ...yahooModuleOptions
          });
          
          // Use type assertion for Yahoo Finance API response
          const summaryDetail = (yahooData.summaryDetail || {}) as any;
          
          return {
            symbol,
            price,
            change,
            volume,
            marketCap: summaryDetail.marketCap || 0,
            pe: summaryDetail.trailingPE || 0,
            dividend: summaryDetail.dividendYield ? summaryDetail.dividendYield * 100 : 0
          };
        } catch (yahooError) {
          console.error(`Error fetching Yahoo data for ${symbol}:`, yahooError);
          // Return what we have from Alpha Vantage with defaults for the missing data
          return {
            symbol,
            price,
            change,
            volume,
            marketCap: 0,
            pe: 0,
            dividend: 0
          };
        }
      }
      
      // Fallback to Yahoo Finance if Alpha Vantage failed
      try {
        // Yahoo quote uses different options format
        const yahooQuote = await yahooFinance.quote(symbol, {}, yahooModuleOptions) as any;
        
        // Check that we have a valid quote result before accessing properties
        if (yahooQuote && yahooQuote.regularMarketPrice !== undefined) {
          return {
            symbol,
            price: yahooQuote.regularMarketPrice || 0,
            change: yahooQuote.regularMarketChange || 0,
            volume: yahooQuote.regularMarketVolume || 0,
            marketCap: yahooQuote.marketCap || 0,
            pe: yahooQuote.trailingPE || 0,
            dividend: yahooQuote.dividendYield || 0
          };
        }
        
        // If we get here, it means the symbol is not valid or not found
        console.warn(`Invalid or unknown stock symbol: ${symbol}`);
      } catch (yahooError) {
        console.error(`Error fetching Yahoo quote for ${symbol}:`, yahooError);
      }
      
      // If all APIs fail, return a default object with zeros
      return {
        symbol,
        price: 0,
        change: 0,
        volume: 0,
        marketCap: 0,
        pe: 0,
        dividend: 0
      };
    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error);
      // Return a default object instead of throwing
      return {
        symbol,
        price: 0,
        change: 0,
        volume: 0,
        marketCap: 0,
        pe: 0,
        dividend: 0
      };
    }
  }

  /**
   * Gets analyst recommendations for a stock from Yahoo Finance
   * @param symbol Stock symbol
   * @returns Promise with analyst recommendations
   */
  private async getAnalystRecommendations(symbol: string): Promise<AnalystRecommendation> {
    try {
      // Use type assertion for Yahoo Finance API response
      const quoteSummary = await yahooFinance.quoteSummary(symbol, {
        modules: ['recommendationTrend', 'financialData'],
        ...yahooModuleOptions
      }) as any;
      
      let buyCount = 0;
      let holdCount = 0;
      let sellCount = 0;
      let targetPrice = 0;
      
      if (quoteSummary?.recommendationTrend?.trend?.[0]) {
        const trend = quoteSummary.recommendationTrend.trend[0];
        buyCount = (trend.strongBuy || 0) + (trend.buy || 0);
        holdCount = trend.hold || 0;
        sellCount = (trend.sell || 0) + (trend.strongSell || 0);
      }
      
      if (quoteSummary?.financialData?.targetMeanPrice) {
        targetPrice = quoteSummary.financialData.targetMeanPrice;
      }
      
      return {
        buy: buyCount,
        hold: holdCount,
        sell: sellCount,
        targetPrice
      };
      
    } catch (error) {
      console.error(`Error fetching analyst recommendations for ${symbol}:`, error);
      // Fallback to default values if API calls fail
      return {
        buy: 0,
        hold: 0,
        sell: 0,
        targetPrice: 0
      };
    }
  }

  /**
   * Gets company information from Alpha Vantage and Yahoo Finance
   * @param symbol Stock symbol
   * @returns Promise with company information
   */
  private async getCompanyInfo(symbol: string): Promise<CompanyInfo> {
    try {
      // Try Alpha Vantage Company Overview endpoint
      const response = await axios.get<AlphaVantageCompanyOverview>(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'OVERVIEW',
          symbol,
          apikey: ALPHA_VANTAGE_API_KEY
        }
      });
      
      if (response.data && response.data.Name) {
        return {
          name: response.data.Name,
          sector: response.data.Sector || 'Unknown',
          employees: parseInt(response.data.FullTimeEmployees || '0', 10),
          founded: parseInt(response.data.IPOYear || '0', 10),
          headquarters: response.data.Address || 'Unknown'
        };
      }
      
      // Fallback to Yahoo Finance
      try {
        // Use type assertion for Yahoo Finance API response
        const assetProfile = await yahooFinance.quoteSummary(symbol, {
          modules: ['assetProfile'],
          ...yahooModuleOptions
        }) as any;
        
        if (assetProfile?.assetProfile) {
          const profile = assetProfile.assetProfile;
          
          return {
            name: profile.longName || `${symbol} Corporation`,
            sector: profile.sector || 'Unknown',
            employees: profile.fullTimeEmployees || 0,
            founded: profile.foundedYear || new Date().getFullYear(),
            headquarters: profile.city && profile.country ? 
              `${profile.city}, ${profile.country}` : 'Unknown'
          };
        }
      } catch (yahooError) {
        console.error(`Error fetching Yahoo profile for ${symbol}:`, yahooError);
      }
      
      // If all APIs fail, return a generic response
      return {
        name: `${symbol} Corporation`,
        sector: 'Unknown',
        employees: 0,
        founded: 0,
        headquarters: 'Unknown'
      };
    } catch (error) {
      console.error(`Error fetching company info for ${symbol}:`, error);
      // Fallback to generic data
      return {
        name: `${symbol} Corporation`,
        sector: 'Unknown',
        employees: 0,
        founded: 0,
        headquarters: 'Unknown'
      };
    }
  }

  /**
   * Gets recent news articles about a company from Alpha Vantage
   * @param symbol Stock symbol
   * @returns Promise with company news articles
   */
  private async getCompanyNews(symbol: string): Promise<CompanyNews[]> {
    try {
      // Try to get news from Alpha Vantage
      const response = await axios.get<AlphaVantageNewsFeed>(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'NEWS_SENTIMENT',
          tickers: symbol,
          limit: 5,
          apikey: ALPHA_VANTAGE_API_KEY
        }
      });
      
      if (response.data && response.data.feed && response.data.feed.length > 0) {
        return response.data.feed.map((item: AlphaVantageNewsItem) => ({
          title: item.title,
          date: item.time_published,
          source: item.source,
          url: item.url
        }));
      }
      
      // If Alpha Vantage fails, try Yahoo Finance
      try {
        const newsData = await yahooFinance.search(symbol, { newsCount: 5 }, yahooModuleOptions) as any;
        
        if (newsData && newsData.news && newsData.news.length > 0) {
          return newsData.news.map((item: any) => ({
            title: item.title,
            date: new Date(item.providerPublishTime * 1000).toISOString(),
            source: item.publisher,
            url: item.link
          }));
        }
      } catch (yahooError) {
        console.error(`Error fetching Yahoo news for ${symbol}:`, yahooError);
      }
      
      // If all APIs fail, return default data
      return [
        {
          title: `${symbol} Recent News`,
          date: new Date().toISOString(),
          source: 'Financial Times',
          url: `https://example.com/news/${symbol.toLowerCase()}/news`
        }
      ];
    } catch (error) {
      console.error(`Error fetching company news for ${symbol}:`, error);
      // Fallback to generic data
      return [
        {
          title: `${symbol} Recent News`,
          date: new Date().toISOString(),
          source: 'Financial Times',
          url: `https://example.com/news/${symbol.toLowerCase()}/news`
        }
      ];
    }
  }
}