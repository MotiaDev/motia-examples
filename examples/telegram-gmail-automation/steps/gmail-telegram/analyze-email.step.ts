import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import OpenAI from 'openai';

const inputSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  subject: z.string(),
  snippet: z.string(),
  timestamp: z.string(),
  labels: z.array(z.string())
});

export const config: EventConfig = {
  name: 'AnalyzeEmail',
  type: 'event',
  description: 'Uses OpenAI to analyze email content for urgency and importance',
  subscribes: ['analyze-email'],
  emits: [
    { topic: 'send-telegram-notification', label: 'Important Email' },
    { topic: 'skip-notification', label: 'Not Important', conditional: true }
  ],
  input: inputSchema,
  flows: ['gmail-telegram-flow']
};

interface EmailAnalysis {
  isImportant: boolean;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  summary: string;
  reason: string;
}

export const handler: Handlers['AnalyzeEmail'] = async (input, { emit, logger }) => {
  const { messageId, from, subject, snippet, timestamp, labels } = input;

  logger.info('Analyzing email with OpenAI', { messageId, subject });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const prompt = `Analyze the following email and determine if it requires immediate attention or notification.

Email Details:
- From: ${from}
- Subject: ${subject}
- Preview: ${snippet}
- Labels: ${labels.join(', ')}

Analyze this email and respond with a JSON object containing:
1. isImportant (boolean): Whether this email requires immediate attention
2. urgencyLevel: "critical", "high", "medium", or "low"
3. category: The type of email (e.g., "security_alert", "server_monitoring", "newsletter", "personal", "spam", "work", etc.)
4. summary: A brief 1-2 sentence summary of the email
5. reason: Why you classified it this way

Consider these as important/urgent:
- Security alerts and warnings
- Server/infrastructure issues
- Critical business communications
- Urgent requests from known contacts
- System failures or errors

Consider these as NOT important:
- Newsletters and marketing emails
- Social media notifications
- Promotional content
- Routine updates that don't require action

Respond ONLY with the JSON object, no additional text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an email analysis assistant that helps filter important emails from noise. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    
    // Parse the JSON response
    let analysis: EmailAnalysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('Failed to parse OpenAI response', { responseText, error: parseError });
      // Default to important if we can't parse (fail-safe)
      analysis = {
        isImportant: true,
        urgencyLevel: 'medium',
        category: 'unknown',
        summary: snippet.substring(0, 100),
        reason: 'Could not analyze email, forwarding as precaution'
      };
    }

    logger.info('Email analysis complete', { 
      messageId, 
      isImportant: analysis.isImportant,
      urgencyLevel: analysis.urgencyLevel,
      category: analysis.category
    });

    if (analysis.isImportant && (analysis.urgencyLevel === 'critical' || analysis.urgencyLevel === 'high')) {
      // Send to Telegram
      await emit({
        topic: 'send-telegram-notification',
        data: {
          messageId,
          from,
          subject,
          snippet,
          timestamp,
          analysis: {
            urgencyLevel: analysis.urgencyLevel,
            category: analysis.category,
            summary: analysis.summary,
            reason: analysis.reason
          }
        }
      });

      logger.info('Email marked for Telegram notification', { messageId, subject });
    } else {
      // Skip notification but log the decision
      logger.info('Email filtered out - not important enough', { 
        messageId, 
        subject,
        urgencyLevel: analysis.urgencyLevel,
        category: analysis.category,
        reason: analysis.reason
      });
    }

  } catch (error) {
    logger.error('OpenAI analysis failed', { 
      messageId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // On error, forward the email anyway (fail-safe)
    await emit({
      topic: 'send-telegram-notification',
      data: {
        messageId,
        from,
        subject,
        snippet,
        timestamp,
        analysis: {
          urgencyLevel: 'medium' as const,
          category: 'error-fallback',
          summary: 'AI analysis failed - forwarding as precaution',
          reason: 'OpenAI analysis encountered an error'
        }
      }
    });
  }
};

