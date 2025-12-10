import { handler, config } from '../steps/fetch-email.step';
import { GoogleService, EmailResponse } from '../services/google.service';
import { 
  createTestContext, 
  configureGoogleServiceMock, 
  getGoogleServiceMock,
  DEFAULT_EMAIL_RESPONSE 
} from './test-utils';

jest.mock('../services/google.service');

describe('Email Fetcher Step', () => {
  let mockGoogleService: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    configureGoogleServiceMock();
    mockGoogleService = getGoogleServiceMock();
  });
  
  it('should fetch email content and emit an event with the data', async () => {
    const input = {
      messageId: 'test-message-id',
      historyId: 12345
    };
    
    const { emit, logger, state, traceId, done } = createTestContext();
    
    await handler(input, { emit, logger, state, traceId });
    
    expect(GoogleService).toHaveBeenCalledWith(logger, state);
    expect(mockGoogleService.getEmail).toHaveBeenCalledWith(input.historyId.toString());
    
    expect(emit).toHaveBeenCalledWith({
      topic: 'gmail.email.fetched',
      data: DEFAULT_EMAIL_RESPONSE
    });
    
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Emitting fetched email`));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Email fetch completed successfully`));
    
    done();
  });
  
  it('should handle errors gracefully', async () => {
    const input = {
      messageId: 'test-message-id',
      historyId: 12345
    };
    
    const error = new Error('Test error');
    
    configureGoogleServiceMock({
      getEmail: jest.fn().mockRejectedValue(error)
    });
    mockGoogleService = getGoogleServiceMock();
    
    const { emit, logger, state, traceId, done } = createTestContext();
    
    await handler(input, { emit, logger, state, traceId });
    
    expect(mockGoogleService.getEmail).toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error fetching email content'));
    
    done();
  });
  
  it('should validate the configuration', () => {
    expect(config.type).toBe('event');
    expect(config.name).toBe('Email Fetcher');
    expect(config.subscribes).toContain('gmail.email.received');
    expect(config.emits).toContain('gmail.email.fetched');
    expect(config.flows).toContain('gmail-flow');
    expect(config.input).toBeDefined();
  });
}); 