import { handler } from '../steps/daily-summary.step';
import { DiscordService } from '../services/discord.service';
import { createTestContext, configureDiscordServiceMock, getDiscordServiceMock } from './test-utils';
import type { FlowContext } from 'motia';

jest.mock('../services/discord.service');

describe('Daily Email Summary Step', () => {
  let mockDiscordService: any;
  const mockSummary = 'Test summary content';
  
  beforeEach(() => {
    jest.clearAllMocks();
    configureDiscordServiceMock({
      send: jest.fn().mockResolvedValue(mockSummary)
    });
    mockDiscordService = getDiscordServiceMock();
  });

  it('should generate summary, clear state, and emit event', async () => {
    const autoRespondedEmails = [{ id: '1', subject: 'Test email' }];
    const processedEmails = [{ id: '2', subject: 'Another email' }];
    
    const { emit, logger, state, traceId, done } = createTestContext({
      stateGetImplementation: jest.fn().mockImplementation((scope, key) => {
        if (scope === 'email_analysis' && key === 'auto_responded_emails') {
          return Promise.resolve(autoRespondedEmails);
        }
        if (scope === 'email_analysis' && key === 'processed_emails') {
          return Promise.resolve(processedEmails);
        }
        return Promise.resolve(null);
      })
    });

    await handler({ emit, logger, state, traceId } as unknown as FlowContext);

    expect(DiscordService).toHaveBeenCalledWith(logger, state);
    expect(mockDiscordService.send).toHaveBeenCalledTimes(1);

    expect(state.set).toHaveBeenCalledWith('email_analysis', 'auto_responded_emails', []);
    expect(state.set).toHaveBeenCalledWith('email_analysis', 'processed_emails', []);

    expect(emit).toHaveBeenCalledWith({
      topic: 'gmail.summary.sent',
      data: {
        date: expect.any(String),
        summary: mockSummary,
        sentToDiscord: true
      }
    });

    const emitCall = emit.mock.calls[0][0];
    expect(emitCall.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    done();
  });

  it('should handle errors properly', async () => {
    const testError = new Error('Discord API error');
    
    configureDiscordServiceMock({
      send: jest.fn().mockRejectedValue(testError)
    });
    mockDiscordService = getDiscordServiceMock();
    
    const { emit, logger, state, traceId, done } = createTestContext();
    
    await handler({ emit, logger, state, traceId } as unknown as FlowContext);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error generating daily summary: Discord API error')
    );
    
    expect(emit).not.toHaveBeenCalled();

    done();
  });
}); 