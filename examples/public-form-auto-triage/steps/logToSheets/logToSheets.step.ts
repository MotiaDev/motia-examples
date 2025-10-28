import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { logTriageResult } from '../../services/sheets.service';

const inputSchema = z.object({
  requestId: z.string(),
  result: z.string(),
  tokensUsed: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  userInfo: z.object({
    email: z.string().optional(),
    name: z.string().optional(),
    id: z.string().optional()
  }).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'LogToSheets',
  description: 'Logs successful triage results to Google Sheets',
  subscribes: ['processing.complete'],
  emits: [],
  input: inputSchema,
  flows: ['public-form-triage']
};

export const handler: Handlers['LogToSheets'] = async (input, { logger, state }) => {
  const { requestId, result, tokensUsed, metadata, userInfo } = input;

  try {
    logger.info('Logging to Google Sheets', { requestId });

    // Retrieve original submission for additional context
    const submission = await state.get('form-submissions', requestId);

    // Log the triage result
    await logTriageResult({
      status: result,
      input: submission?.content?.substring(0, 500) || '',
      timestamp: new Date().toISOString(),
      additionalData: {
        requestId,
        tokensUsed,
        metadata,
        userInfo,
        contentLength: submission?.content?.length || 0
      }
    });

    logger.info('Successfully logged to Google Sheets', { requestId });

    // Optionally clean up state after successful logging
    // await state.delete('form-submissions', requestId);
    // await state.delete('processed-texts', requestId);

  } catch (error: any) {
    logger.error('Failed to log to Google Sheets', { 
      requestId,
      error: error.message,
      stack: error.stack
    });

    // Don't throw - we don't want to fail the workflow if logging fails
    // The main processing is already complete
  }
};

