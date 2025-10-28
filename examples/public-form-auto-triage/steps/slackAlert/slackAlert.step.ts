import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { sendErrorAlert } from '../../services/slack.service';

const inputSchema = z.object({
  requestId: z.string(),
  stage: z.string(),
  error: z.string(),
  timestamp: z.string()
});

export const config: EventConfig = {
  type: 'event',
  name: 'SlackAlert',
  description: 'Sends error alerts to Slack when processing fails',
  subscribes: ['processing.failed'],
  emits: [],
  input: inputSchema,
  flows: ['public-form-triage']
};

export const handler = async (input: z.infer<typeof inputSchema>, { logger, state, trace_id }: any) => {
  const { requestId, stage, error, timestamp } = input;

  try {
    logger.info('Sending error alert to Slack', { requestId, stage });

    // Retrieve submission details for context
    const submission = await state.get('form-submissions', requestId);
    
    const context = submission 
      ? `Request ID: ${requestId}\nStage: ${stage}\nContent Preview: ${submission.content?.substring(0, 200)}...`
      : `Request ID: ${requestId}\nStage: ${stage}`;

    // Send alert to Slack
    await sendErrorAlert({
      message: error,
      context,
      traceId: trace_id,
      timestamp
    });

    logger.info('Error alert sent to Slack', { requestId });

    // Store alert history
    await state.set('alert-history', requestId, {
      stage,
      error,
      timestamp,
      sentAt: new Date().toISOString(),
      traceId: trace_id
    });

  } catch (alertError: any) {
    logger.error('Failed to send Slack alert', { 
      requestId,
      originalError: error,
      alertError: alertError.message,
      stack: alertError.stack
    });

    // Don't throw - we don't want to fail if alert sending fails
    // The error has already occurred in the main workflow
  }
};

