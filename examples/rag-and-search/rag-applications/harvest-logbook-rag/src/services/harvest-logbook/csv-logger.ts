/**
 * CSV Logger Service
 * Simple local CSV logging for testing (alternative to Google Sheets)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SheetLogEntry } from './types';

export interface CSVLoggerConfig {
  filePath?: string;
  directory?: string;
}

export class CSVLogger {
  private filePath: string;
  private directory: string;

  constructor(config: CSVLoggerConfig = {}) {
    this.directory = config.directory || path.join(process.cwd(), 'logs');
    this.filePath = config.filePath || path.join(this.directory, 'harvest_logbook.csv');
  }

  /**
   * Ensure directory and CSV file exist with headers
   */
  async initialize(): Promise<void> {
    try {
      // Create logs directory if it doesn't exist
      await fs.mkdir(this.directory, { recursive: true });

      // Check if file exists
      try {
        await fs.access(this.filePath);
      } catch {
        // File doesn't exist, create it with headers
        const headers = 'Timestamp,Query,Response,Sources\n';
        await fs.writeFile(this.filePath, headers, 'utf-8');
      }
    } catch (error) {
      console.error('Failed to initialize CSV logger:', error);
      throw error;
    }
  }

  /**
   * Escape CSV field (handle quotes and commas)
   */
  private escapeCSV(field: string): string {
    if (!field) return '""';
    
    // Replace quotes with double quotes and wrap in quotes if contains comma, quote, or newline
    if (field.includes('"') || field.includes(',') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return `"${field}"`;
  }

  /**
   * Append a log entry to the CSV file
   */
  async logEntry(entry: SheetLogEntry): Promise<void> {
    await this.initialize();

    const row = [
      this.escapeCSV(entry.timestamp),
      this.escapeCSV(entry.query),
      this.escapeCSV(entry.response),
      this.escapeCSV(entry.sources || '')
    ].join(',') + '\n';

    try {
      await fs.appendFile(this.filePath, row, 'utf-8');
    } catch (error) {
      console.error('Failed to write to CSV:', error);
      throw error;
    }
  }

  /**
   * Append multiple entries
   */
  async logEntries(entries: SheetLogEntry[]): Promise<void> {
    await this.initialize();

    const rows = entries.map(entry => 
      [
        this.escapeCSV(entry.timestamp),
        this.escapeCSV(entry.query),
        this.escapeCSV(entry.response),
        this.escapeCSV(entry.sources || '')
      ].join(',')
    ).join('\n') + '\n';

    await fs.appendFile(this.filePath, rows, 'utf-8');
  }

  /**
   * Get the CSV file path
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Read all entries from CSV (for debugging/testing)
   */
  async readEntries(): Promise<SheetLogEntry[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const lines = content.split('\n').slice(1); // Skip header
      
      return lines
        .filter(line => line.trim())
        .map(line => {
          // Simple CSV parsing (works for escaped fields)
          const matches = line.match(/("(?:[^"]|"")*"|[^,]*)/g) || [];
          const fields = matches.map(field => 
            field.startsWith('"') && field.endsWith('"')
              ? field.slice(1, -1).replace(/""/g, '"')
              : field
          );

          return {
            timestamp: fields[0] || '',
            query: fields[1] || '',
            response: fields[2] || '',
            sources: fields[3] || ''
          };
        });
    } catch (error) {
      console.error('Failed to read CSV:', error);
      return [];
    }
  }

  /**
   * Clear all entries (for testing)
   */
  async clear(): Promise<void> {
    const headers = 'Timestamp,Query,Response,Sources\n';
    await fs.writeFile(this.filePath, headers, 'utf-8');
  }
}

// Singleton instance factory
let csvLoggerInstance: CSVLogger | null = null;

export function getCSVLogger(): CSVLogger {
  if (!csvLoggerInstance) {
    const directory = process.env.LOG_DIRECTORY || path.join(process.cwd(), 'logs');
    const fileName = process.env.LOG_FILE_NAME || 'harvest_logbook.csv';
    const filePath = path.join(directory, fileName);
    
    csvLoggerInstance = new CSVLogger({ filePath, directory });
  }
  return csvLoggerInstance;
}
