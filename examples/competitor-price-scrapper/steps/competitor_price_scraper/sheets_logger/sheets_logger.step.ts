import { z } from 'zod'
import { EventConfig, Handlers } from 'motia'

// Input schema
const inputSchema = z.object({
  type: z.literal('ANALYSIS_COMPLETE'),
  payload: z.object({
    summary: z.string(),
    priceComparisons: z.array(z.object({
      productName: z.string(),
      competitorPrice: z.number(),
      priceDifference: z.number().optional(),
      recommendation: z.string().optional()
    })).optional(),
    insights: z.array(z.string()),
    timestamp: z.string()
  })
})

export const config: EventConfig = {
  type: 'event',
  name: 'SheetsLogger',
  description: 'Logs analysis results to Google Sheets',
  subscribes: ['sheets-logger'],
  emits: ['slack-alert'],
  input: inputSchema,
  flows: ['competitor-price-scraper']
}

export const handler: Handlers['SheetsLogger'] = async (input, { emit, logger, state }) => {
  // Check if Google Sheets logging is enabled
  const isEnabled = process.env.ENABLE_SHEETS_LOGGING === 'true'

  if (!isEnabled) {
    logger.info('Google Sheets logging is disabled for testing')
    return
  }

  try {
    // Import Google Sheets helper
    const { appendToSheet } = await import('../../../lib/google-sheets')

    const { payload } = input

    // Format price comparisons for sheet
    const priceComparisonsText = payload.priceComparisons
      ? payload.priceComparisons
          .map(pc => `${pc.productName}: $${pc.competitorPrice}`)
          .join('; ')
      : 'No price data'

    // Prepare log entry
    const competitorName = await state.get('competitor-scraper', 'competitorName') || 'Unknown'

    logger.info('Logging to Google Sheets', {
      spreadsheetName: 'Competitor Price Scraper',
      sheetName: 'Log'
    })

    // Append to sheet
    await appendToSheet({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
      range: 'Log!A:F',
      values: [[
        payload.timestamp,
        'Analysis Complete',
        payload.summary,
        payload.insights?.join('\n') || '',
        priceComparisonsText,
        competitorName
      ]]
    })

    logger.info('Successfully logged to Google Sheets')
  } catch (error) {
    logger.error('Failed to log to Google Sheets', { error })
    
    // Non-critical error - emit warning to Slack but don't fail workflow
    await emit({
      topic: 'slack-alert',
      data: {
        type: 'WARNING',
        payload: {
          step: 'sheets-logger',
          message: 'Failed to log to Google Sheets',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }
    })
  }
}