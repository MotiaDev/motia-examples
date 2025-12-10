import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

const inputSchema = z.object({
  dataId: z.string(),
  query: z.string(),
  analysis: z.string(),
  contextCount: z.number(),
  timestamp: z.string()
});

export const config: EventConfig = {
  name: 'LogResults',
  type: 'event',
  description: 'Log analysis results to CSV file',
  subscribes: ['log-results'],
  emits: [],
  input: inputSchema,
  flows: ['mortgage-rate-alert']
};

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

interface LogData {
  timestamp: string
  dataId: string
  query: string
  analysis: string
  contextCount: number
}

async function appendToCsv(logData: LogData, logDir: string): Promise<void> {
  await fs.mkdir(logDir, { recursive: true });
  
  const logFile = path.join(logDir, 'mortgage-rate-alert-log.csv');
  
  let fileExists = false;
  try {
    await fs.access(logFile);
    fileExists = true;
  } catch {
    // File doesn't exist
  }
  
  const row = [
    logData.timestamp,
    logData.dataId,
    escapeCsvField(logData.query),
    escapeCsvField(logData.analysis),
    logData.contextCount.toString()
  ].join(',');
  
  if (!fileExists) {
    const headers = 'timestamp,dataId,query,analysis,contextCount\n';
    await fs.writeFile(logFile, headers + row + '\n', 'utf-8');
  } else {
    await fs.appendFile(logFile, row + '\n', 'utf-8');
  }
}

export const handler: Handlers['LogResults'] = async (input, { logger }) => {
  const { dataId, query, analysis, contextCount, timestamp } = input;
  
  logger.info('Logging analysis results', { dataId });
  
  try {
    const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
    
    await appendToCsv(
      { dataId, query, analysis, contextCount, timestamp },
      logDir
    );
    
    logger.info('Results logged to CSV', { 
      dataId, 
      logDir 
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to log results', { 
      dataId, 
      error: errorMessage
    });
  }
};

