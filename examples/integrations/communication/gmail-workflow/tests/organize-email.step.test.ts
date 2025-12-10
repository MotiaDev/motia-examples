import { handler } from '../steps/organize-email.step';
import { createTestContext, testData, configureGoogleServiceMock, getGoogleServiceMock } from './test-utils';

jest.mock('../services/google.service');

describe('Organize Email Step', () => {
  let mockGoogleService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    configureGoogleServiceMock({
      modifyMessage: jest.fn().mockResolvedValue({ id: 'msg123', labelIds: ['label1', 'label2'] }),
      findOrCreateLabel: jest.fn().mockResolvedValue({ id: 'archive-label-123', name: 'Archived_Promotions' }),
      archiveMessage: jest.fn().mockResolvedValue({ id: 'msg123', labelIds: ['archive-label-123'] })
    });
    
    mockGoogleService = getGoogleServiceMock();
  });

  it('should apply labels and emit organized event', async () => {
    const input = testData.createEmailInput({
      messageId: 'msg123',
      threadId: 'thread456',
      category: {
        category: 'PRIMARY',
        confidence: 0.95,
        alternative: null,
        promotion_score: null
      }
    });

    const mockLabelsResponse = {
      labelsToApply: ['Important', 'Work'],
      labelIds: ['label1', 'label2']
    };

    mockGoogleService.updateLabels.mockResolvedValue(mockLabelsResponse);
    
    const { emit, logger, state, traceId, done } = createTestContext();
    await handler(input, { emit, logger, state, traceId });
    
    expect(mockGoogleService.updateLabels).toHaveBeenCalledWith(expect.objectContaining({
      messageId: input.messageId,
      threadId: input.threadId,
      subject: input.subject,
      from: input.from,
      category: input.category,
      urgency: input.urgency,
      importance: input.importance,
      shouldArchive: input.shouldArchive
    }));
    
    expect(mockGoogleService.modifyMessage).toHaveBeenCalledWith(
      input.messageId,
      mockLabelsResponse.labelIds
    );
    
    expect(emit).toHaveBeenCalledWith({
      topic: 'gmail.email.organized',
      data: {
        messageId: input.messageId,
        appliedLabels: mockLabelsResponse.labelsToApply
      }
    });
    
    expect(emit).not.toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'gmail.email.archived'
      })
    );
    
    done();
  });

  it('should archive promotional emails and emit archived event', async () => {
    const input = testData.createEmailInput({
      messageId: 'promo123',
      threadId: 'thread789',
      subject: 'Special Offer!',
      from: 'marketing@example.com',
      category: {
        category: 'PROMOTIONS',
        confidence: 0.9,
        alternative: 'UPDATES',
        promotion_score: 0.85
      },
      urgency: {
        urgency: 'LOW',
        score: 0.2,
        factors: { timeFactors: 0.2, senderFactors: 0.2 }
      },
      importance: {
        importance: 'LOW',
        score: 0.3,
        factors: { contentFactors: 0.3, senderFactors: 0.3 }
      },
      shouldArchive: true
    });

    const mockLabelsResponse = {
      labelsToApply: ['Promotions'],
      labelIds: ['promo-label']
    };

    const mockArchiveLabel = {
      id: 'archive-label-123',
      name: 'Archived_Promotions'
    };

    mockGoogleService.updateLabels.mockResolvedValue(mockLabelsResponse);
    mockGoogleService.findOrCreateLabel.mockResolvedValue(mockArchiveLabel);
    
    const { emit, logger, state, traceId, done } = createTestContext();
    await handler(input, { emit, logger, state, traceId });
    
    expect(mockGoogleService.updateLabels).toHaveBeenCalledWith(expect.objectContaining({
      messageId: input.messageId,
      category: input.category,
      shouldArchive: true
    }));
    
    expect(mockGoogleService.modifyMessage).toHaveBeenCalledWith(
      input.messageId,
      mockLabelsResponse.labelIds
    );
    
    expect(mockGoogleService.findOrCreateLabel).toHaveBeenCalledWith('Archived_Promotions');
    
    expect(mockGoogleService.archiveMessage).toHaveBeenCalledWith(
      input.messageId,
      mockArchiveLabel.id
    );
    
    expect(emit).toHaveBeenCalledWith({
      topic: 'gmail.email.archived',
      data: {
        messageId: input.messageId,
        threadId: input.threadId,
        category: input.category.category,
        reason: 'promotional_content'
      }
    });
    
    expect(emit).toHaveBeenCalledWith({
      topic: 'gmail.email.organized',
      data: {
        messageId: input.messageId,
        appliedLabels: mockLabelsResponse.labelsToApply
      }
    });
    
    done();
  });

  it('should handle errors gracefully', async () => {
    const input = testData.createEmailInput({
      messageId: 'error123',
      threadId: 'thread456',
      subject: 'Error Test'
    });

    const testError = new Error('Service unavailable');
    mockGoogleService.updateLabels.mockRejectedValue(testError);
    
    const { emit, logger, state, traceId, done } = createTestContext();
    await handler(input, { emit, logger, state, traceId });
    
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to organize email: Service unavailable',
      expect.objectContaining({
        error: testError
      })
    );
    
    expect(emit).not.toHaveBeenCalled();
    
    expect(mockGoogleService.modifyMessage).not.toHaveBeenCalled();
    expect(mockGoogleService.findOrCreateLabel).not.toHaveBeenCalled();
    expect(mockGoogleService.archiveMessage).not.toHaveBeenCalled();
    
    done();
  });
}); 