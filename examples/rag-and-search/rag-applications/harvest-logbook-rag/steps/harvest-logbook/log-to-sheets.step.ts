/**
 * Log to Sheets Event Step
 * Logs queries and responses to Google Sheets
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { HarvestLogbookService } from '../../src/services/harvest-logbook';

const inputSchema = z.object({
  entryId: z.string(),
  query: z.string(),
  response: z.string(),
  sources: z.array(z.string()).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'LogToSheets',
  description: 'Logs harvest logbook queries and responses to Google Sheets',
  subscribes: ['log-to-sheets'],
  emits: [],
  input: inputSchema,
  flows: ['harvest-logbook']
};

export const handler: Handlers['LogToSheets'] = async (input, { logger }) => {
  try {
    const { entryId, query, response, sources } = input;

    // Determine logging destination based on environment
    const useCSV = process.env.USE_CSV_LOGGER === 'true' || !process.env.GOOGLE_SHEETS_ID;
    const destination = useCSV ? 'CSV' : 'Google Sheets';

    logger.info(`Logging to ${destination}`, {
      entryId,
      queryLength: query.length,
      responseLength: response.length
    });

    // Log to CSV or Google Sheets
    await HarvestLogbookService.logToSheets(
      query,
      response,
      sources
    );

    logger.info(`Successfully logged to ${destination}`, { entryId });
  } catch (error) {
    logger.error('Failed to log query response', {
      entryId: input.entryId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Don't throw - logging failures shouldn't break the main flow
  }
};
