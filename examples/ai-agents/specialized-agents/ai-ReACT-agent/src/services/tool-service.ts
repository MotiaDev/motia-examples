/**
 * Tool Service for ReAct Research Assistant
 * Implements tool execution for web search, financial data, and more
 */

import type { 
  ToolName, 
  ToolResult, 
  WebSearchResult, 
  FinancialDataResult, 
  CompanyInfoResult,
  Citation 
} from './types'

// Tool execution dispatcher
export async function executeTool(
  tool: ToolName,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const startTime = Date.now()
  
  try {
    let data: unknown

    switch (tool) {
      case 'web_search':
        data = await executeWebSearch(input)
        break
      case 'news_search':
        data = await executeNewsSearch(input)
        break
      case 'financial_data':
        data = await executeFinancialData(input)
        break
      case 'company_info':
        data = await executeCompanyInfo(input)
        break
      case 'final_answer':
        // Final answer is handled differently - just return the input
        data = input
        break
      default:
        throw new Error(`Unknown tool: ${tool}`)
    }

    return {
      tool,
      success: true,
      data,
      executionTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      tool,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTimeMs: Date.now() - startTime,
    }
  }
}

// Tavily Web Search
async function executeWebSearch(input: Record<string, unknown>): Promise<WebSearchResult[]> {
  const query = input.query as string
  const maxResults = (input.maxResults as number) || 5
  
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is not set')
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: 'advanced',
      include_answer: true,
      include_raw_content: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tavily API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    results: Array<{
      title: string
      url: string
      content: string
      published_date?: string
      score?: number
    }>
    answer?: string
  }

  return data.results.map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
    publishedDate: r.published_date,
    score: r.score,
  }))
}

// Tavily News Search
async function executeNewsSearch(input: Record<string, unknown>): Promise<WebSearchResult[]> {
  const query = input.query as string
  const timeframe = (input.timeframe as string) || '7d'
  
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is not set')
  }

  // Convert timeframe to days
  const daysMatch = timeframe.match(/(\d+)([dh])/)
  let days = 7
  if (daysMatch) {
    const value = parseInt(daysMatch[1], 10)
    days = daysMatch[2] === 'h' ? Math.ceil(value / 24) : value
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 10,
      search_depth: 'advanced',
      topic: 'news',
      days,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tavily API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    results: Array<{
      title: string
      url: string
      content: string
      published_date?: string
      score?: number
    }>
  }

  return data.results.map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
    publishedDate: r.published_date,
    score: r.score,
  }))
}

// Alpha Vantage Financial Data
async function executeFinancialData(input: Record<string, unknown>): Promise<FinancialDataResult> {
  const symbol = input.symbol as string
  const dataType = (input.dataType as 'quote' | 'fundamentals' | 'historical') || 'quote'
  
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY environment variable is not set')
  }

  let functionName: string
  switch (dataType) {
    case 'quote':
      functionName = 'GLOBAL_QUOTE'
      break
    case 'fundamentals':
      functionName = 'OVERVIEW'
      break
    case 'historical':
      functionName = 'TIME_SERIES_DAILY'
      break
    default:
      functionName = 'GLOBAL_QUOTE'
  }

  const response = await fetch(
    `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&apikey=${apiKey}`
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Alpha Vantage API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as Record<string, unknown>
  
  // Check for API limit message
  if (data['Note'] || data['Information']) {
    throw new Error('Alpha Vantage API rate limit reached. Please try again later.')
  }

  return {
    symbol,
    dataType,
    data,
    timestamp: new Date().toISOString(),
  }
}

// Company Info (using web search as fallback)
async function executeCompanyInfo(input: Record<string, unknown>): Promise<CompanyInfoResult> {
  const companyName = input.companyName as string
  
  // Use Tavily to search for company information
  const searchResults = await executeWebSearch({
    query: `${companyName} company overview CEO headquarters founded`,
    maxResults: 5,
  })

  // Extract basic info from search results
  const combinedSnippet = searchResults.map(r => r.snippet).join(' ')
  
  // Try to find Alpha Vantage symbol and get overview
  const symbolSearch = await executeWebSearch({
    query: `${companyName} stock ticker symbol`,
    maxResults: 1,
  })
  
  let fundamentals: Record<string, unknown> = {}
  const symbolMatch = symbolSearch[0]?.snippet?.match(/\b[A-Z]{1,5}\b/)
  
  if (symbolMatch && process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      const financialResult = await executeFinancialData({
        symbol: symbolMatch[0],
        dataType: 'fundamentals',
      })
      fundamentals = financialResult.data as Record<string, unknown>
    } catch {
      // Ignore errors, continue with basic info
    }
  }

  return {
    name: (fundamentals['Name'] as string) || companyName,
    description: (fundamentals['Description'] as string) || combinedSnippet.slice(0, 500),
    industry: (fundamentals['Industry'] as string) || 'Unknown',
    headquarters: (fundamentals['Address'] as string) || undefined,
    employees: fundamentals['FullTimeEmployees'] 
      ? parseInt(fundamentals['FullTimeEmployees'] as string, 10) 
      : undefined,
  }
}

// Format tool results for LLM context
export function formatToolResultForContext(result: ToolResult): string {
  if (!result.success) {
    return `Tool "${result.tool}" failed with error: ${result.error}`
  }

  switch (result.tool) {
    case 'web_search':
    case 'news_search': {
      const results = result.data as WebSearchResult[]
      return results.map((r, i) => 
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}\n${r.publishedDate ? `Published: ${r.publishedDate}` : ''}`
      ).join('\n\n')
    }
    
    case 'financial_data': {
      const data = result.data as FinancialDataResult
      return `Financial data for ${data.symbol} (${data.dataType}):\n${JSON.stringify(data.data, null, 2)}`
    }
    
    case 'company_info': {
      const info = result.data as CompanyInfoResult
      return `Company: ${info.name}\nIndustry: ${info.industry}\nDescription: ${info.description}${info.headquarters ? `\nHeadquarters: ${info.headquarters}` : ''}${info.employees ? `\nEmployees: ${info.employees.toLocaleString()}` : ''}`
    }
    
    default:
      return JSON.stringify(result.data, null, 2)
  }
}

// Extract citations from tool results
export function extractCitationsFromResults(results: ToolResult[]): Citation[] {
  const citations: Citation[] = []
  
  for (const result of results) {
    if (!result.success) continue
    
    if (result.tool === 'web_search' || result.tool === 'news_search') {
      const searchResults = result.data as WebSearchResult[]
      for (const r of searchResults) {
        citations.push({
          source: r.title,
          url: r.url,
          accessedAt: new Date().toISOString(),
        })
      }
    }
  }
  
  return citations
}

