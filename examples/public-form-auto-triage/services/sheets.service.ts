import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

let sheets: ReturnType<typeof google.sheets>;

function getSheetsClient() {
  if (!sheets) {
    const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    
    if (!email || !key) {
      throw new Error('Google Sheets credentials not configured. Please set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY in your .env file');
    }
    
    const sheetsClient = new JWT({
      email,
      key: key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    sheets = google.sheets({ version: 'v4', auth: sheetsClient });
  }
  return sheets;
}

export interface AppendRowData {
  spreadsheetId: string;
  sheetName: string;
  values: any[];
}

/**
 * Append a row to a Google Sheet
 */
export async function appendRow(data: AppendRowData): Promise<void> {
  const { spreadsheetId, sheetName, values } = data;

  try {
    const client = getSheetsClient();
    await client.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
  } catch (error: any) {
    throw new Error(`Failed to append to Google Sheets: ${error.message}`);
  }
}

/**
 * Log a triage result to Google Sheets
 */
export async function logTriageResult(result: {
  status: string;
  input?: string;
  timestamp?: string;
  additionalData?: Record<string, any>;
}): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  
  const values = [
    result.timestamp || new Date().toISOString(),
    result.status,
    result.input || '',
    JSON.stringify(result.additionalData || {})
  ];

  await appendRow({
    spreadsheetId,
    sheetName: 'Log',
    values
  });
}

/**
 * Batch append multiple rows
 */
export async function batchAppendRows(
  spreadsheetId: string,
  sheetName: string,
  rows: any[][]
): Promise<void> {
  try {
    const client = getSheetsClient();
    await client.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });
  } catch (error: any) {
    throw new Error(`Failed to batch append to Google Sheets: ${error.message}`);
  }
}

