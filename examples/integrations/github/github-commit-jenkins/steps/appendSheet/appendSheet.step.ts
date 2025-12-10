import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { logCommitResult } from '../../services/googleSheets.service';

const inputSchema = z.object({
  commitId: z.string(),
  status: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'AppendSheet',
  description: 'Log GitHub commit processing results to Google Sheets',
  subscribes: ['append-sheet'],
  emits: [],
  input: inputSchema,
  flows: ['github-commit-jenkins']
};

export const handler: Handlers['AppendSheet'] = async (input, { logger }) => {
  try {
    const { commitId, status, timestamp, metadata } = input;

    logger.info('Appending to Google Sheets', { commitId });

    // Append to Google Sheets
    await logCommitResult({
      commitId,
      status,
      timestamp,
      metadata
    });

    logger.info('Successfully logged to Google Sheets', { commitId });

  } catch (error) {
    logger.error('Failed to append to Google Sheets', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      commitId: input.commitId 
    });
  }
};

