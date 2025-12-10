import { handler } from '../steps/auto-responder.step';
import { GoogleService } from '../services/google.service';
import { createTestContext, testData, configureGoogleServiceMock, getGoogleServiceMock } from './test-utils';

jest.mock('../services/google.service');

describe('Auto Responder Step', () => {
  let mockGoogleService: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    configureGoogleServiceMock();
    mockGoogleService = getGoogleServiceMock();
  });
  
  it('should process an email and send an auto-response', async () => {
    const input = testData.createEmailInput({
      category: {
        category: 'work',
        confidence: 0.9,
        alternative: null,
        promotion_score: null
      }
    });
    
    const { emit, logger, state, traceId, done } = createTestContext();
    
    await handler(input, { emit, logger, state, traceId });
    
    expect(GoogleService).toHaveBeenCalledWith(logger, state);
    
    expect(mockGoogleService.sendEmail).toHaveBeenCalledWith({
      messageId: input.messageId,
      threadId: input.threadId,
      subject: input.subject,
      from: input.from,
      snippet: expect.stringContaining(input.subject),
      labelIds: [],
      category: input.category,
      urgency: input.urgency,
      importance: input.importance,
      shouldArchive: input.shouldArchive
    });
    
    expect(emit).toHaveBeenCalledWith({
      topic: 'gmail.email.replied',
      data: {
        id: input.messageId,
        threadId: input.threadId,
        subject: input.subject,
        responseType: input.category,
        autoReplied: true
      }
    });
    
    expect(state.set).toHaveBeenCalledWith(
      'email_analysis',
      'auto_responded_emails',
      [input.messageId]
    );
    
    expect(logger.info).toHaveBeenCalled();
    
    done();
  });
  
  it('should handle errors gracefully', async () => {
    const input = testData.createEmailInput({
      category: {
        category: 'work',
        confidence: 0.9,
        alternative: null,
        promotion_score: null
      }
    });
    
    const error = new Error('Test error');
    
    // Configure custom mock for this test case
    configureGoogleServiceMock({
      sendEmail: jest.fn().mockRejectedValue(error)
    });
    mockGoogleService = getGoogleServiceMock();
    
    const { emit, logger, state, traceId, done } = createTestContext();
    
    await handler(input, { emit, logger, state, traceId });
    
    expect(mockGoogleService.sendEmail).toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send auto-response'));
    
    done();
  });
}); 