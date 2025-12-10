import { EventConfig, StepHandler } from 'motia';
import { z } from 'zod';
import { GoogleService, EmailResponse } from '../services/google.service';

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
    score: z.number(),
    factors: z.record(z.number()).optional()
  }),
  importance: z.object({
    importance: z.string(),
    score: z.number(),
    factors: z.record(z.number()).optional()
  }),
  shouldArchive: z.boolean().optional().default(false)
})

export const config: EventConfig<typeof inputSchema> = {
  type: 'event',
  name: 'Organize Email',
  description: 'Organizes emails based on analysis, applies labels, and archives if necessary',
  subscribes: ['gmail.email.analyzed'],
  emits: ['gmail.email.organized', 'gmail.email.archived'],
  input: inputSchema,
  flows: ['gmail-flow'],
}

export const handler: StepHandler<typeof config> = async (input, {emit, logger, state}) => {
  try {
    const googleService = new GoogleService(logger, state);
    
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
    
    const {labelsToApply, labelIds} = await googleService.updateLabels(emailData);

    if (labelIds && labelIds.length > 0) {
      await googleService.modifyMessage(input.messageId, labelIds);
      logger.info(`Applied labels to email: ${labelsToApply.join(', ')}`);
    }

    if (input.shouldArchive === true) {
      const archiveLabel = await googleService.findOrCreateLabel('Archived_Promotions');
      
      if (archiveLabel && archiveLabel.id) {
        await googleService.archiveMessage(input.messageId, archiveLabel.id);
        logger.info(`Archived promotional email: ${input.messageId}`);
        
        // Emit archive event
        await emit({
          topic: 'gmail.email.archived',
          data: {
            messageId: input.messageId,
            threadId: input.threadId,
            category: input.category.category,
            reason: 'promotional_content'
          }
        });
      }
    }
    
    await emit({
      topic: 'gmail.email.organized',
      data: {
        messageId: input.messageId,
        appliedLabels: labelsToApply || []
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to organize email: ${errorMessage}`, {error})
  }
}
