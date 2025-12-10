import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { ServiceFactory } from '../services/ServiceFactory';

const inputSchema = z.object({
  query: z.string()
});

export const config: EventConfig = {
  type: 'event',
  name: 'FinanceDataAgent',
  description: 'Retrieves financial data related to stocks and companies',
  subscribes: ['query.received'],
  emits: [{
    topic: 'finance.data.completed',
    label: 'Finance data completed'
  }],
  input: inputSchema,
  flows: ['finance-workflow']
};

export const handler: Handlers['FinanceDataAgent'] = async (input, { logger, emit, state, traceId }) => {
  logger.info('Finance data retrieval started', { query: input.query, traceId });
  
  try {
    // Get the finance data service
    const financeDataService = ServiceFactory.getFinanceDataService();
    
    // Create a state service to simplify state operations
    const stateService = ServiceFactory.createStateService(state, traceId);
    
    // Analyze the query to extract potential stock symbols
    const symbols = financeDataService.extractPotentialSymbols(input.query);
    
    if (symbols.length === 0) {
      logger.info('No stock symbols found in query', { query: input.query });
      
      // Emit completion with no results
      await emit({
        topic: 'finance.data.completed',
        data: {
          query: input.query,
          resultCount: 0,
          message: 'No stock symbols identified in the query'
        }
      });
      
      return;
    }
    
    // Process each potential symbol using the service
    const financialData = await Promise.all(
      symbols.map(symbol => financeDataService.getFinancialData(symbol))
    );
    
    // Save financial data to state using our state service
    await stateService.set('finance.data', financialData);
    
    logger.info('Finance data retrieved successfully', { 
      symbols: symbols.join(', '),
      resultCount: financialData.length,
      traceId 
    });
    
    // Emit completion event
    await emit({
      topic: 'finance.data.completed',
      data: {
        query: input.query,
        symbols,
        resultCount: financialData.length,
        resultSummary: `Retrieved data for ${symbols.join(', ')}`
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Finance data retrieval failed', { error: errorMessage, traceId });
    
    // Emit completion event with error
    await emit({
      topic: 'finance.data.completed',
      data: {
        query: input.query,
        error: errorMessage,
        resultCount: 0
      }
    });
  }
};

// Helper functions

function extractPotentialSymbols(query: string): string[] {
  // In a real implementation, this would use NLP or regex to extract potential stock symbols
  // This is a simplified implementation
  
  const commonSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA'];
  
  // Check if any common symbols are mentioned in the query
  return commonSymbols.filter(symbol => 
    query.toUpperCase().includes(symbol) || 
    query.toLowerCase().includes(symbol.toLowerCase())
  );
}

async function getStockData(symbol: string): Promise<any> {
  // In a real implementation, this would use the YFinance API
  // Mock implementation
  return {
    symbol,
    price: Math.random() * 1000,
    change: (Math.random() * 10) - 5,
    volume: Math.floor(Math.random() * 10000000),
    marketCap: Math.floor(Math.random() * 1000000000000),
    pe: Math.random() * 30,
    dividend: Math.random() * 3
  };
}

async function getAnalystRecommendations(symbol: string): Promise<any> {
  // Mock implementation
  return {
    buy: Math.floor(Math.random() * 20),
    hold: Math.floor(Math.random() * 10),
    sell: Math.floor(Math.random() * 5),
    targetPrice: Math.floor(Math.random() * 1000)
  };
}

async function getCompanyInfo(symbol: string): Promise<any> {
  // Mock implementation
  const sectors = ['Technology', 'Finance', 'Healthcare', 'Consumer Goods', 'Energy'];
  
  return {
    name: `${symbol} Corporation`,
    sector: sectors[Math.floor(Math.random() * sectors.length)],
    employees: Math.floor(Math.random() * 100000),
    founded: 1980 + Math.floor(Math.random() * 40),
    headquarters: 'California, USA'
  };
}

async function getCompanyNews(symbol: string): Promise<any[]> {
  // Mock implementation
  return [
    {
      title: `${symbol} Reports Strong Quarterly Earnings`,
      date: new Date().toISOString(),
      source: 'Financial Times',
      url: `https://example.com/news/${symbol.toLowerCase()}/earnings`
    },
    {
      title: `New Product Launch from ${symbol}`,
      date: new Date().toISOString(),
      source: 'Bloomberg',
      url: `https://example.com/news/${symbol.toLowerCase()}/product`
    },
    {
      title: `Analyst Upgrades ${symbol} Stock`,
      date: new Date().toISOString(),
      source: 'Wall Street Journal',
      url: `https://example.com/news/${symbol.toLowerCase()}/upgrade`
    }
  ];
} 