import { z } from 'zod'
import { ApiRouteConfig, Handlers } from 'motia'

// Define the input schema for competitor price data
const bodySchema = z.object({
  competitorName: z.string().optional(),
  products: z.array(z.object({
    name: z.string(),
    price: z.number(),
    currency: z.string().default('USD'),
    url: z.string().optional(),
    lastUpdated: z.string().optional()
  })).optional(),
  rawData: z.string().optional(), // For raw HTML or text data
  timestamp: z.string().default(() => new Date().toISOString())
})

const responseSchema = z.object({
  data: bodySchema,
  processedAt: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CompetitorPriceWebhook',
  description: 'Webhook endpoint to receive competitor price data',
  path: '/competitor-price-scraper',
  method: 'POST',
  emits: ['text-processor'],
  flows: ['competitor-price-scraper'],
  bodySchema,
  responseSchema: {
    200: responseSchema
  }
}

export const handler: Handlers['CompetitorPriceWebhook'] = async (req, { emit, logger }) => {
  logger.info('Received competitor price data', { 
    competitorName: req.body.competitorName,
    productCount: req.body.products?.length || 0,
    hasRawData: !!req.body.rawData
  })

  // Validate and prepare data for processing
  const processedData = {
    data: req.body,
    processedAt: new Date().toISOString()
  }

  // Emit event for text processing
  await emit({
    topic: 'text-processor',
    data: {
      type: 'COMPETITOR_DATA_RECEIVED',
      payload: processedData
    }
  })

  return {
    status: 200,
    body: processedData
  }
}