import type { CronConfig, Handlers } from 'motia';

export const config: CronConfig = {
  name: 'PollGmail',
  type: 'cron',
  description: 'Polls Gmail for new emails every minute and emits them for AI analysis',
  cron: '* * * * *', // Every minute
  emits: ['analyze-email'],
  flows: ['gmail-telegram-flow']
};

export const handler: Handlers['PollGmail'] = async ({ emit, logger, state }) => {
  logger.info('Polling Gmail for new emails');

  // Get the last processed timestamp from state
  const lastProcessedTime = await state.get<string>('gmail-polling', 'lastProcessedTime');
  const now = new Date();

  // For demo purposes, we'll simulate fetching emails
  // In production, you'd use Gmail API with OAuth
  // The actual Gmail integration would use the GMAIL_FETCH_EMAILS tool from Composio
  // or direct Gmail API calls

  const mockEmails = [
    {
      messageId: `msg-${Date.now()}-1`,
      from: 'server-monitor@company.com',
      subject: 'CRITICAL: Production Server CPU at 95%',
      snippet: 'The production server cpu-01 has reached critical CPU usage levels. Immediate attention required.',
      timestamp: now.toISOString(),
      labels: ['INBOX', 'UNREAD']
    },
    {
      messageId: `msg-${Date.now()}-2`,
      from: 'newsletter@marketing.com',
      subject: 'Weekly Newsletter: Top Tech Trends',
      snippet: 'Check out this week\'s top technology trends and insights from industry experts.',
      timestamp: now.toISOString(),
      labels: ['INBOX', 'UNREAD']
    },
    {
      messageId: `msg-${Date.now()}-3`,
      from: 'security@company.com',
      subject: 'Security Alert: Unusual Login Detected',
      snippet: 'We detected an unusual login attempt from IP 192.168.1.100 at 3:45 AM.',
      timestamp: now.toISOString(),
      labels: ['INBOX', 'UNREAD', 'IMPORTANT']
    }
  ];

  // In production, filter emails after lastProcessedTime
  // For now, we'll process all mock emails
  
  for (const email of mockEmails) {
    logger.info('Emitting email for AI analysis', { 
      messageId: email.messageId, 
      subject: email.subject 
    });

    await emit({
      topic: 'analyze-email',
      data: {
        messageId: email.messageId,
        from: email.from,
        subject: email.subject,
        snippet: email.snippet,
        timestamp: email.timestamp,
        labels: email.labels
      }
    });
  }

  // Update the last processed timestamp
  await state.set('gmail-polling', 'lastProcessedTime', now.toISOString());

  logger.info('Gmail polling completed', { 
    emailsProcessed: mockEmails.length,
    lastProcessedTime: now.toISOString()
  });
};

