/**
 * Google Sheets Service
 * Handles logging data to Google Sheets
 */

import { SheetLogEntry } from './types';

export interface GoogleSheetsConfig {
  credentials: any; // Google OAuth2 credentials
  spreadsheetId: string;
  sheetName?: string;
}

export class GoogleSheetsService {
  private accessToken: string | null = null;
  private spreadsheetId: string;
  private sheetName: string;
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  constructor(config: GoogleSheetsConfig) {
    this.spreadsheetId = config.spreadsheetId;
    this.sheetName = config.sheetName || 'Log';
  }

  /**
   * Set access token for API calls
   */
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Append a row to the sheet
   */
  async appendRow(values: any[]): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Access token not set. Call setAccessToken first.');
    }

    const range = `${this.sheetName}!A:Z`;
    
    const response = await fetch(
      `${this.baseUrl}/${this.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          values: [values]
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Sheets API error: ${response.status} - ${error}`);
    }
  }

  /**
   * Log a harvest logbook entry
   */
  async logEntry(entry: SheetLogEntry): Promise<void> {
    const row = [
      entry.timestamp,
      entry.query,
      entry.response,
      entry.sources || ''
    ];

    await this.appendRow(row);
  }

  /**
   * Batch append multiple rows
   */
  async appendRows(rows: any[][]): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Access token not set. Call setAccessToken first.');
    }

    const range = `${this.sheetName}!A:Z`;
    
    const response = await fetch(
      `${this.baseUrl}/${this.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          values: rows
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Sheets API error: ${response.status} - ${error}`);
    }
  }

  /**
   * Initialize sheet with headers if needed
   */
  async ensureHeaders(): Promise<void> {
    const headers = ['Timestamp', 'Query', 'Response', 'Sources'];
    
    try {
      await this.appendRow(headers);
    } catch (error) {
      // Headers might already exist, ignore error
      console.warn('Could not add headers:', error);
    }
  }
}

// Singleton instance factory
let sheetsInstance: GoogleSheetsService | null = null;

export function getGoogleSheetsService(): GoogleSheetsService {
  if (!sheetsInstance) {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Log';
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_ID environment variable is not set');
    }
    
    sheetsInstance = new GoogleSheetsService({
      credentials: {}, // Will be set via OAuth
      spreadsheetId,
      sheetName
    });
  }
  return sheetsInstance;
}
