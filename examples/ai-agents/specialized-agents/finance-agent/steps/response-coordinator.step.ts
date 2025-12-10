import { EventConfig, StepHandler } from 'motia';
import { z } from 'zod';


const financeDataSchema = z.object({
  query: z.string(),
  resultCount: z.number(),
  symbols: z.array(z.string()).optional(),
  resultSummary: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional()
});

export const config: EventConfig<typeof financeDataSchema> = {
  type: 'event',
  name: 'ResponseCoordinator',
  description: 'Coordinates and combines results from web search and financial data',
  subscribes: ['web.search.completed', 'finance.data.completed'],
  emits: [{
    topic: 'response.completed',
    label: 'Response completed'
  }],
  input: financeDataSchema,
  flows: ['finance-workflow']
};

export const handler: StepHandler<typeof config> = async (input, { logger, emit, state, traceId }) => {
  logger.info('Response coordination started', { traceId });
  
  try {
    // Track which processes have completed
    let completedTopics = await state.get<string[]>(traceId, 'completed.topics') || [];
    const currentTopic = getCurrentTopic(input);
    
    if (!completedTopics.includes(currentTopic)) {
      completedTopics.push(currentTopic);
      await state.set(traceId, 'completed.topics', completedTopics);
    }
    
    // If both processes haven't completed yet, wait for the other
    const expectedTopics = ['web.search.completed', 'finance.data.completed'];
    if (!expectedTopics.every(topic => completedTopics.includes(topic))) {
      logger.info('Waiting for other processes to complete', { 
        completed: completedTopics,
        waiting: expectedTopics.filter(topic => !completedTopics.includes(topic))
      });
      return;
    }
    
    // Both processes have completed, retrieve data from state
    const originalQuery = await state.get<string>(traceId, 'original.query');
    const webSearchResults = await state.get<any[]>(traceId, 'web.search.results') || [];
    const financeData = await state.get<any[]>(traceId, 'finance.data') || [];
    
    // Format the response
    const formattedResponse = formatCombinedResponse(originalQuery, webSearchResults, financeData);
    
    logger.info('Response coordination completed', { 
      query: originalQuery,
      webResultsCount: webSearchResults.length,
      financeDataCount: financeData.length,
      traceId
    });
    
    // Emit the complete response
    await emit({
      topic: 'response.completed',
      data: {
        query: originalQuery,
        timestamp: new Date().toISOString(),
        response: formattedResponse
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Response coordination failed', { error: errorMessage, traceId });
    
    // Emit error response
    await emit({
      topic: 'response.completed',
      data: {
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Helper function to determine the current topic from the input
function getCurrentTopic(input: any): string {
  if ('resultSummary' in input && 'symbols' in input) {
    return 'finance.data.completed';
  } else {
    return 'web.search.completed';
  }
}

// Helper function to format the combined response
function formatCombinedResponse(query: string | null, webSearchResults: any[], financeData: any[]): any {
  const response: any = {
    query: query || 'Unknown query',
    summary: `Results for "${query || 'Unknown query'}"`,
    webResources: [],
    financialData: []
  };
  
  // Format web search results
  if (webSearchResults.length > 0) {
    response.webResources = webSearchResults.map(result => ({
      title: result.title,
      description: result.snippet,
      url: result.url
    }));
  }
  
  // Format financial data
  if (financeData.length > 0) {
    response.financialData = financeData.map(data => {
      const { symbol, stockData, analystRecommendations, companyInfo, recentNews } = data;
      
      return {
        symbol,
        company: companyInfo.name,
        sector: companyInfo.sector,
        currentPrice: formatCurrency(stockData.price),
        priceChange: {
          value: formatCurrency(stockData.change),
          percentage: `${(stockData.change / stockData.price * 100).toFixed(2)}%`
        },
        marketCap: formatLargeNumber(stockData.marketCap),
        peRatio: stockData.pe.toFixed(2),
        analystRating: formatAnalystRating(analystRecommendations),
        recentNews: recentNews.map((news: any) => ({
          title: news.title,
          date: news.date,
          source: news.source
        }))
      };
    });
  }
  
  return response;
}

// Formatting helper functions
function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatLargeNumber(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  } else if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

function formatAnalystRating(recommendations: any): string {
  const { buy, hold, sell } = recommendations;
  const total = buy + hold + sell;
  
  if (total === 0) return 'No ratings';
  
  const buyPercentage = (buy / total * 100).toFixed(0);
  
  if (buy > hold && buy > sell) {
    return `Buy (${buyPercentage}% of analysts recommend)`;
  } else if (hold > buy && hold > sell) {
    return `Hold (${(hold / total * 100).toFixed(0)}% of analysts recommend)`;
  } else {
    return `Sell (${(sell / total * 100).toFixed(0)}% of analysts recommend)`;
  }
} 