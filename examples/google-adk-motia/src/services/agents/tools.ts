import type { ToolDefinition } from '../../types/agent.types';

/**
 * Built-in tool definitions for Google ADK agents
 */

export const SEARCH_TOOL: ToolDefinition = {
  name: 'google_search',
  description: 'Search the web using Google Search. Returns relevant web results.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      num_results: {
        type: 'number',
        description: 'Number of results to return (default: 5)',
      },
    },
    required: ['query'],
  },
  type: 'builtin',
};

export const CODE_EXECUTION_TOOL: ToolDefinition = {
  name: 'execute_code',
  description: 'Execute Python code safely in a sandboxed environment. Returns the output.',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'The Python code to execute',
      },
      timeout: {
        type: 'number',
        description: 'Execution timeout in seconds (default: 30)',
      },
    },
    required: ['code'],
  },
  type: 'builtin',
};

export const WEB_SCRAPE_TOOL: ToolDefinition = {
  name: 'web_scrape',
  description: 'Scrape content from a web page URL. Returns the extracted text.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to scrape',
      },
      selector: {
        type: 'string',
        description: 'CSS selector to extract specific content (optional)',
      },
    },
    required: ['url'],
  },
  type: 'builtin',
};

/**
 * Custom function tool definitions
 */

export const CALCULATOR_TOOL: ToolDefinition = {
  name: 'calculator',
  description: 'Perform mathematical calculations. Supports basic arithmetic and common functions.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)")',
      },
    },
    required: ['expression'],
  },
  type: 'function',
};

export const WEATHER_TOOL: ToolDefinition = {
  name: 'get_weather',
  description: 'Get current weather information for a location.',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city and country (e.g., "New York, USA")',
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature units (default: celsius)',
      },
    },
    required: ['location'],
  },
  type: 'function',
};

export const DATE_TIME_TOOL: ToolDefinition = {
  name: 'get_datetime',
  description: 'Get current date and time, or convert between timezones.',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'The timezone (e.g., "America/New_York", "UTC")',
      },
      format: {
        type: 'string',
        description: 'Date format (default: ISO 8601)',
      },
    },
    required: [],
  },
  type: 'function',
};

/**
 * Tool execution functions
 */

export async function executeGoogleSearch(query: string, numResults: number = 5): Promise<any> {
  // In production, this would call Google Search API or use a search service
  return {
    query,
    results: [
      {
        title: 'Example Result',
        url: 'https://example.com',
        snippet: 'This is a placeholder result for demonstration.',
      },
    ],
  };
}

export async function executeCode(code: string, timeout: number = 30): Promise<any> {
  // In production, this would execute code in a sandboxed environment
  return {
    output: 'Code execution result (placeholder)',
    exitCode: 0,
  };
}

export async function scrapeWebPage(url: string, selector?: string): Promise<any> {
  // In production, this would scrape the actual web page
  return {
    url,
    content: 'Scraped content placeholder',
    selector: selector || 'body',
  };
}

export function calculate(expression: string): number {
  try {
    // SECURITY WARNING: In production, use a proper math expression parser
    // Never use eval() with user input in a real application
    return eval(expression);
  } catch (error) {
    throw new Error(`Invalid expression: ${expression}`);
  }
}

export async function getWeather(location: string, units: string = 'celsius'): Promise<any> {
  // In production, this would call a weather API
  return {
    location,
    temperature: units === 'celsius' ? 22 : 72,
    units,
    condition: 'Sunny',
    humidity: 65,
  };
}

export function getDateTime(timezone?: string, format?: string): string {
  const date = new Date();
  
  if (timezone) {
    return date.toLocaleString('en-US', { timeZone: timezone });
  }
  
  return format === 'iso' ? date.toISOString() : date.toString();
}

/**
 * Tool executor - executes tool calls and returns results
 */
export async function executeTool(
  toolName: string,
  args: Record<string, any>
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    let result: any;

    switch (toolName) {
      case 'google_search':
        result = await executeGoogleSearch(args.query, args.num_results);
        break;
      
      case 'execute_code':
        result = await executeCode(args.code, args.timeout);
        break;
      
      case 'web_scrape':
        result = await scrapeWebPage(args.url, args.selector);
        break;
      
      case 'calculator':
        result = calculate(args.expression);
        break;
      
      case 'get_weather':
        result = await getWeather(args.location, args.units);
        break;
      
      case 'get_datetime':
        result = getDateTime(args.timezone, args.format);
        break;
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}

/**
 * Get all available tools
 */
export function getAllTools(): ToolDefinition[] {
  return [
    SEARCH_TOOL,
    CODE_EXECUTION_TOOL,
    WEB_SCRAPE_TOOL,
    CALCULATOR_TOOL,
    WEATHER_TOOL,
    DATE_TIME_TOOL,
  ];
}

/**
 * Get tools by type
 */
export function getToolsByType(type: ToolDefinition['type']): ToolDefinition[] {
  return getAllTools().filter(tool => tool.type === type);
}

