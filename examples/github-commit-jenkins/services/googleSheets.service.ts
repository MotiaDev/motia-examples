import { google } from 'googleapis';

let sheets: any = null;
let auth: any = null;

function getGoogleSheetsClient() {
  if (!sheets) {
    sheets = google.sheets('v4');
  }
  return sheets;
}

function getGoogleAuth() {
  if (!auth) {
    const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS 
      ? JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
      : null;

    auth = credentials
      ? new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })
      : null;
  }
  return auth;
}

export interface SheetRow {
  commitId: string;
  status: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * Append a row to Google Sheets
 * @param spreadsheetId - The Google Sheet ID
 * @param range - The range to append to (e.g., "Log!A:C")
 * @param values - Array of values to append
 */
export async function appendRow(
  spreadsheetId: string,
  range: string,
  values: any[]
): Promise<void> {
  const authClient = getGoogleAuth();
  const sheetsClient = getGoogleSheetsClient();
  
  if (!authClient) {
    throw new Error('Google Sheets credentials not configured');
  }

  try {
    await sheetsClient.spreadsheets.values.append({
      auth: await authClient.getClient(),
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [values],
      },
    } as any);
  } catch (error) {
    console.error('Error appending to Google Sheets:', error);
    throw new Error('Failed to append row to Google Sheets');
  }
}

/**
 * Append commit processing result to the log sheet
 * @param data - The data to log
 */
export async function logCommitResult(data: SheetRow): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID not configured');
  }

  try {
    await appendRow(
      spreadsheetId,
      'Log!A:D',
      [
        data.timestamp,
        data.commitId,
        data.status,
        JSON.stringify(data.metadata || {}),
      ]
    );
  } catch (error) {
    console.error('Error logging commit result:', error);
    throw new Error('Failed to log commit result');
  }
}

/**
 * Read rows from Google Sheets
 * @param spreadsheetId - The Google Sheet ID
 * @param range - The range to read (e.g., "Log!A:D")
 * @returns Array of row values
 */
export async function readRows(
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const authClient = getGoogleAuth();
  const sheetsClient = getGoogleSheetsClient();
  
  if (!authClient) {
    throw new Error('Google Sheets credentials not configured');
  }

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      auth: await authClient.getClient(),
      spreadsheetId,
      range,
    } as any);

    return response.data.values || [];
  } catch (error) {
    console.error('Error reading from Google Sheets:', error);
    throw new Error('Failed to read from Google Sheets');
  }
}

/**
 * Create a new sheet in the spreadsheet
 * @param spreadsheetId - The Google Sheet ID
 * @param sheetTitle - The title for the new sheet
 */
export async function createSheet(
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> {
  const authClient = getGoogleAuth();
  const sheetsClient = getGoogleSheetsClient();
  
  if (!authClient) {
    throw new Error('Google Sheets credentials not configured');
  }

  try {
    await sheetsClient.spreadsheets.batchUpdate({
      auth: await authClient.getClient(),
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetTitle,
              },
            },
          },
        ],
      },
    } as any);
  } catch (error) {
    console.error('Error creating sheet:', error);
    throw new Error('Failed to create sheet');
  }
}

/**
 * Initialize the log sheet with headers if it doesn't exist
 * @param spreadsheetId - The Google Sheet ID
 */
export async function initializeLogSheet(spreadsheetId: string): Promise<void> {
  try {
    // Check if Log sheet exists
    const sheets = await getSheets(spreadsheetId);
    const logSheetExists = sheets.some(sheet => sheet === 'Log');

    if (!logSheetExists) {
      await createSheet(spreadsheetId, 'Log');
      
      // Add headers
      await appendRow(
        spreadsheetId,
        'Log!A1:D1',
        ['Timestamp', 'Commit ID', 'Status', 'Metadata']
      );
    }
  } catch (error) {
    console.error('Error initializing log sheet:', error);
    throw new Error('Failed to initialize log sheet');
  }
}

/**
 * Get list of all sheets in a spreadsheet
 * @param spreadsheetId - The Google Sheet ID
 * @returns Array of sheet titles
 */
async function getSheets(spreadsheetId: string): Promise<string[]> {
  const authClient = getGoogleAuth();
  const sheetsClient = getGoogleSheetsClient();
  
  if (!authClient) {
    throw new Error('Google Sheets credentials not configured');
  }

  try {
    const response = await sheetsClient.spreadsheets.get({
      auth: await authClient.getClient(),
      spreadsheetId,
    } as any);

    return response.data.sheets?.map(sheet => sheet.properties?.title || '') || [];
  } catch (error) {
    console.error('Error getting sheets:', error);
    throw new Error('Failed to get sheets');
  }
}

