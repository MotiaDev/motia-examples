import { FinanceDataService } from './FinanceDataService';
import { OpenAIService } from './OpenAIService';
import { WebSearchService } from './WebSearchService';
import { StateService, IStateOperations } from './StateService';

/**
 * Factory for creating service instances
 * Makes it easy to get services in steps while enabling unit testing with mocks
 */
export class ServiceFactory {
  private static financeDataService: FinanceDataService;
  private static webSearchService: WebSearchService;
  private static openAIService: OpenAIService;

  /**
   * Gets a FinanceDataService instance
   * @returns FinanceDataService
   */
  public static getFinanceDataService(): FinanceDataService {
    if (!this.financeDataService) {
      this.financeDataService = new FinanceDataService();
    }
    return this.financeDataService;
  }

  /**
   * Gets a WebSearchService instance
   * @param searchUrl Optional custom search URL
   * @returns WebSearchService
   */
  public static getWebSearchService(searchUrl?: string): WebSearchService {
    if (!this.webSearchService) {
      this.webSearchService = new WebSearchService(searchUrl);
    }
    return this.webSearchService;
  }

  /**
   * Gets an OpenAIService instance
   * @param apiKey Optional OpenAI API key
   * @returns OpenAIService
   */
  public static getOpenAIService(apiKey?: string): OpenAIService {
    if (!this.openAIService) {
      this.openAIService = new OpenAIService(apiKey);
    }
    return this.openAIService;
  }

  /**
   * Creates a new StateService instance
   * @param state Motia state operations from context
   * @param defaultScope Default scope for state operations (typically traceId)
   * @returns StateService
   */
  public static createStateService(state: any, defaultScope: string): StateService {
    return new StateService(state, defaultScope);
  }

  /**
   * Reset all singleton services
   * Useful for testing
   */
  public static reset(): void {
    this.financeDataService = undefined as unknown as FinanceDataService;
    this.webSearchService = undefined as unknown as WebSearchService;
    this.openAIService = undefined as unknown as OpenAIService;
  }
} 