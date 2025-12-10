import {EventConfig, StepHandler} from 'motia';
import {EmailResponse, GoogleService} from '../services/google.service';
import {z} from 'zod';

const inputSchema = z.object({
  messageId: z.string(),
  threadId: z.string(),
  subject: z.string(),
  from: z.string(),
  category: z.object({
    category: z.string(),
    confidence: z.number(),
    alternative: z.string().optional().nullable(),
    promotion_score: z.number().optional().nullable()
  }),
  urgency: z.object({
    urgency: z.string(),
    score: z.number()
  }),
  importance: z.object({
    importance: z.string(),
    score: z.number()
  }),
  shouldArchive: z.boolean().optional().default(false)
})


// Define the step configuration
export const config: EventConfig<typeof inputSchema> = {
  type: 'event',
  name: 'Auto Responder Email',
  description: 'Automatically replies to emails based on their category and urgency',
  subscribes: ['gmail.email.analyzed'],
  emits: ['gmail.email.replied'],
  input: inputSchema,
  flows: ['gmail-flow']
};

export const handler: StepHandler<typeof config> = async (input, {emit, logger, state}) => {
  try {

    const emailData: EmailResponse = {
      messageId: input.messageId,
      threadId: input.threadId,
      subject: input.subject,
      from: input.from,
      snippet: input.subject + " " + (input.category?.category || ""), // Use subject as snippet if needed
      labelIds: [],
      category: input.category,
      urgency: input.urgency,
      importance: input.importance,
      shouldArchive: input.shouldArchive
    };

    const googleService = new GoogleService(logger, state);
    await googleService.sendEmail(emailData);

    logger.info('Auto-response sent');

    await emit({
      topic: 'gmail.email.replied',
      data: {
        id: input.messageId,
        threadId: input.threadId,
        subject: input.subject,
        responseType: input.category,
        autoReplied: true
      }
    });
    await state.set('email_analysis', 'auto_responded_emails', [input.messageId]);

  } catch (error) {
    if (error instanceof Error && error.message.includes('Skipping response')) {
      logger.info(`Skipping auto-response: ${error.message}`);
    } else {
      logger.error(`Error generating auto-response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}; 