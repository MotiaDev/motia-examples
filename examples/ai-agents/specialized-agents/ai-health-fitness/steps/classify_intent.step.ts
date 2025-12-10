import { EventConfig, Handlers } from 'motia';
import OpenAI from 'openai';
import { z } from 'zod';
import Mustache from 'mustache';
import fs from 'fs/promises';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const INTENTS = ['plan_meal', 'plan_workout', 'log_activity', 'analyze_habits'];

export const config: EventConfig = {
  type: 'event',
  name: 'classify-user-intent',
  description: 'Classify incoming WhatsApp message',
  subscribes: ['message-received'],
  emits: ['planner-request', 'user-activity-extract', 'analyze-user-habits', 'health-chat-message'],
  input: z.object({
    user: z.string(),
    message: z.string()
  }),
  flows: ['health-companion']
};

export const handler: Handlers['classify-user-intent'] = async (input, { emit, logger }) => {
  const { user, message } = input;

  // Sanity check for user/message
  if (!user || !message) {
    logger.error('Missing user or message in event payload', input);
    return;
  }

  let template: string;
  try {
    template = await fs.readFile('prompts/classify-intent.mustache', 'utf-8');
  } catch (err) {
    logger.error('Failed to load prompt template file', { error: err });
    await emit({
      topic: 'health-chat-message',
      data: {
        message: "Sorry, I'm having trouble classifying your message right now.",
        conversationId: undefined,
        assistantMessageId: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 15))
      }
    });
    return;
  }

  const prompt = Mustache.render(template, { intents: INTENTS, message });

  let response;
  try {
    response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You classify user intents for a health assistant.' },
        { role: 'user', content: prompt }
      ]
    });
  } catch (err) {
    logger.error('Error calling OpenAI completion API', { error: err });
    await emit({
      topic: 'health-chat-message',
      data: {
        message: "Sorry, I couldn't understand your message due to a system error.",
        conversationId: undefined,
        assistantMessageId: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 15))
      }
    });
    return;
  }

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    logger.error('No intent returned from OpenAI', response);
    await emit({
      topic: 'health-chat-message',
      data: {
        message: "Sorry, I couldn't classify your message this time.",
        conversationId: undefined,
        assistantMessageId: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 15))
      }
    });
    return;
  }

  const intent = content.trim().toLowerCase();

  logger.info(`AI classified intent: "${intent}" for user: ${user}`);

  // Validate intent, fallback if unexpected
  if (!INTENTS.includes(intent)) {
    logger.warn(`Unrecognized intent from AI: "${intent}", falling back to health-chat-message.`, { user, intent, message });
    await emit({
      topic: 'health-chat-message',
      data: {
        message,
        conversationId: undefined,
        assistantMessageId: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 15))
      }
    });
    return;
  }

  switch (intent) {
    case 'plan_meal':
    case 'plan_workout':
      await emit({
        topic: 'planner-request',
        data: { user, type: intent === 'plan_meal' ? 'meal' : 'workout', prompt: message }
      });
      break;
    case 'log_activity':
      await emit({ topic: 'user-activity-extract', data: { user, message } });
      break;
    case 'analyze_habits':
      await emit({ topic: 'analyze-user-habits', data: { user } });
      break;
  }
};
