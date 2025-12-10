import type { FlowContext, Logger } from 'motia';
import { GoogleService } from '../services/google.service';
import { DiscordService } from '../services/discord.service';

/**
 * Creates a standardized mock context for testing steps
 */
export function createTestContext(options: TestContextOptions = {}): TestContext {
  const traceId = options.traceId || 'test-trace-id';
  
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn(),
    emitLog: jest.fn(),
    ...options.logger
  } as unknown as Logger;
  
  const stateGetFn = options.stateGetImplementation || 
    jest.fn().mockImplementation((scope: string, key: string) => {
      return Promise.resolve(null);
    });
  
  const state = {
    get: stateGetFn,
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined),
    ...options.state
  };
  
  const emit = jest.fn().mockResolvedValue(undefined);
  
  return { 
    emit, 
    state, 
    logger, 
    traceId,
    done: jest.fn(),
    asFlowContext: (): FlowContext => ({ emit, state, logger, traceId } as unknown as FlowContext)
  };
}

/**
 * Default email response for testing
 */
export const DEFAULT_EMAIL_RESPONSE = {
  subject: 'Test Email Subject',
  from: 'sender@example.com',
  messageId: 'mock-message-id',
  threadId: 'mock-thread-id',
  snippet: 'This is a test email snippet',
  labelIds: ['INBOX', 'UNREAD']
};

/**
 * Configures Google service mock with customizable implementations
 * Note: jest.mock() must be called at the top level of the test file
 */
export function configureGoogleServiceMock(mockImplementation = {}): void {
  // Reset the mock
  if (GoogleService) {
    (GoogleService as jest.Mock).mockReset();
  }
  
  const defaultMock = {
    getEmail: jest.fn().mockResolvedValue(DEFAULT_EMAIL_RESPONSE),
    sendEmail: jest.fn().mockResolvedValue(undefined),
    updateLabels: jest.fn().mockResolvedValue({
      labelsToApply: ['Important', 'Work'],
      labelIds: ['label1', 'label2']
    }),
    modifyMessage: jest.fn().mockResolvedValue({ id: 'msg123', labelIds: ['label1', 'label2'] }),
    findOrCreateLabel: jest.fn().mockResolvedValue({ id: 'label-123', name: 'Test_Label' }),
    archiveMessage: jest.fn().mockResolvedValue({ id: 'msg123', labelIds: ['archive-label-123'] })
  };

  const mockInstance = { ...defaultMock, ...mockImplementation };
  
  // Configure the mock implementation for this test
  (GoogleService as jest.Mock).mockImplementation(() => mockInstance);
  
  return;
}

/**
 * Gets the currently configured Google service mock instance
 */
export function getGoogleServiceMock(): any {
  // We need to call the constructor to get the instance that will be returned
  return (GoogleService as jest.Mock).mock.results[0]?.value || (GoogleService as jest.Mock)();
}

/**
 * Configures Discord service mock with customizable implementations
 * Note: jest.mock() must be called at the top level of the test file
 */
export function configureDiscordServiceMock(mockImplementation = {}): void {
  // Reset the mock
  if (DiscordService) {
    (DiscordService as jest.Mock).mockReset();
  }
  
  const defaultMock = {
    send: jest.fn().mockResolvedValue('Test summary content')
  };

  const mockInstance = { ...defaultMock, ...mockImplementation };
  
  // Configure the mock implementation for this test
  (DiscordService as jest.Mock).mockImplementation(() => mockInstance);
  
  return;
}

/**
 * Gets the currently configured Discord service mock instance
 */
export function getDiscordServiceMock(): any {
  // We need to call the constructor to get the instance that will be returned
  return (DiscordService as jest.Mock).mock.results[0]?.value || (DiscordService as jest.Mock)();
}

/**
 * Common test data generators
 */
export const testData = {
  createEmailInput: (overrides = {}) => ({
    messageId: 'test-message-id',
    threadId: 'test-thread-id',
    subject: 'Test Subject',
    from: 'test@example.com',
    category: {
      category: 'PRIMARY',
      confidence: 0.9,
      alternative: null,
      promotion_score: null
    },
    urgency: {
      urgency: 'HIGH',
      score: 0.8,
      factors: { timeFactors: 0.8, senderFactors: 0.8 }
    },
    importance: {
      importance: 'HIGH',
      score: 0.9,
      factors: { contentFactors: 0.9, senderFactors: 0.9 }
    },
    shouldArchive: false,
    ...overrides
  })
};

/**
 * Types for the test utilities
 */
export interface TestContextOptions {
  traceId?: string;
  logger?: Partial<Logger>;
  state?: Partial<Record<string, jest.Mock>>;
  stateGetImplementation?: jest.Mock;
}

export interface TestContext {
  emit: jest.Mock;
  state: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
    clear: jest.Mock;
    cleanup: jest.Mock;
    [key: string]: jest.Mock;
  };
  logger: Logger;
  traceId: string;
  done: jest.Mock;
  asFlowContext: () => FlowContext;
} 