import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  requestId: z.string(),
  query: z.string().optional(),
  response: z.string().optional(),
  timestamp: z.string(),
  status: z.string(),
  metadata: z.record(z.any()).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'SheetsAppend',
  description: 'Appends data to Google Sheets for logging',
  subscribes: ['sheets.append'],
  emits: [],
  input: inputSchema,
  flows: ['currency-rate-monitor']
};

export const handler: Handlers['SheetsAppend'] = async (input, { logger }) => {
  const { requestId, query, response, timestamp, status, metadata } = input;
  
  logger.info('Appending data to Google Sheets', { requestId, status });

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;

    if (!spreadsheetId || !accessToken) {
      throw new Error('Google Sheets credentials not configured');
    }

    // Prepare row data
    const rowData = [
      timestamp,
      requestId,
      query || '',
      response || '',
      status,
      JSON.stringify(metadata || {})
    ];

    // Append to Google Sheets
    const response_api = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Log:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          values: [rowData]
        })
      }
    );

    if (!response_api.ok) {
      const errorText = await response_api.text();
      throw new Error(`Google Sheets API error: ${response_api.statusText} - ${errorText}`);
    }

    const result = await response_api.json();

    logger.info('Successfully appended to Google Sheets', { 
      requestId,
      updatedRange: result.updates?.updatedRange 
    });
  } catch (error) {
    logger.error('Google Sheets append failed', { 
      requestId,
      error: (error as Error).message 
    });
    throw error;
  }
};

