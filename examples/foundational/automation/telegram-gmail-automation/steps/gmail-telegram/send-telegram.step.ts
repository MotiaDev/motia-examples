import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  subject: z.string(),
  snippet: z.string(),
  timestamp: z.string(),
  analysis: z.object({
    urgencyLevel: z.enum(['critical', 'high', 'medium', 'low']),
    category: z.string(),
    summary: z.string(),
    reason: z.string()
  })
});

export const config: EventConfig = {
  name: 'SendTelegramNotification',
  type: 'event',
  description: 'Sends filtered email notifications to Telegram chat',
  subscribes: ['send-telegram-notification'],
  emits: [],
  input: inputSchema,
  flows: ['gmail-telegram-flow']
};

export const handler: Handlers['SendTelegramNotification'] = async (input, { logger, state }) => {
  const { messageId, from, subject, snippet, timestamp, analysis } = input;

  logger.info('Sending Telegram notification', { messageId, subject });

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramBotToken || !telegramChatId) {
    logger.error('Telegram configuration missing', {
      hasBotToken: !!telegramBotToken,
      hasChatId: !!telegramChatId
    });
    return;
  }

  // Format urgency emoji
  const urgencyEmoji = {
    critical: '🚨',
    high: '⚠️',
    medium: '📧',
    low: '📬'
  }[analysis.urgencyLevel];

  // Format the message for Telegram
  const message = `${urgencyEmoji} *${analysis.urgencyLevel.toUpperCase()} PRIORITY EMAIL*

📬 *From:* ${escapeMarkdown(from)}
📋 *Subject:* ${escapeMarkdown(subject)}

📝 *AI Summary:*
${escapeMarkdown(analysis.summary)}

🏷️ *Category:* ${escapeMarkdown(analysis.category)}
🔍 *Why Important:* ${escapeMarkdown(analysis.reason)}

⏰ *Received:* ${formatTimestamp(timestamp)}

---
_Preview:_ ${escapeMarkdown(snippet.substring(0, 200))}${snippet.length > 200 ? '...' : ''}`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      logger.error('Telegram API error', { 
        messageId, 
        status: response.status,
        error: result 
      });
      return;
    }

    logger.info('Telegram notification sent successfully', { 
      messageId, 
      telegramMessageId: result.result?.message_id 
    });

    // Store notification in state for tracking
    await state.set('telegram-notifications', messageId, {
      sentAt: new Date().toISOString(),
      telegramMessageId: result.result?.message_id,
      subject,
      urgencyLevel: analysis.urgencyLevel
    });

  } catch (error) {
    logger.error('Failed to send Telegram notification', { 
      messageId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to escape Markdown special characters
function escapeMarkdown(text: string): string {
  return text
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/`/g, '\\`');
}

// Helper function to format timestamp
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

