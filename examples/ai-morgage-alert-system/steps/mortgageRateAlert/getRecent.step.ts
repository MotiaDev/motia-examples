import { z } from 'zod'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const config: Handlers['getRecent'] = {
  name: 'getRecent',
  type: 'api',
  method: 'GET',
  path: '/mortgage_rate_alert/recent',
  emits: [],
}

export const handler: Handlers['getRecent'] = async (req, { logger }) => {
  const logFilePath = join(process.cwd(), 'logs', 'mortgage-rate-alert-log.csv')

  logger.info('Fetching recent analyses', { logFilePath })

  if (!existsSync(logFilePath)) {
    logger.warn('Log file not found', { logFilePath })
    return {
      status: 200,
      body: []
    }
  }

  try {
    const fileContent = readFileSync(logFilePath, 'utf-8')
    const lines = fileContent.trim().split('\n').slice(1) // Skip header

    const analyses = lines
      .reverse() // Most recent first
      .slice(0, 10) // Get last 10
      .map((line) => {
        const [timestamp, dataId, query, analysis, contextCount] = line
          .split(',')
          .map((field) => field.trim().replace(/^"|"$/g, ''))

        return {
          timestamp: timestamp || '',
          dataId: dataId || '',
          query: query || '',
          analysis: analysis ? (analysis.substring(0, 200) + (analysis.length > 200 ? '...' : '')) : '',
          contextCount: parseInt(contextCount, 10) || 0,
        }
      })
      .filter(item => item.timestamp && item.dataId) // Filter out invalid entries

    logger.info('Recent analyses fetched', { count: analyses.length })
    
    return {
      status: 200,
      body: analyses
    }
  } catch (error) {
    logger.error('Failed to read log file', { error })
    
    return {
      status: 500,
      body: { error: 'Failed to fetch recent analyses' }
    }
  }
}

