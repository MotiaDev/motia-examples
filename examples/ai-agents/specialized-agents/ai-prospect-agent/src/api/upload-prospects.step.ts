/**
 * Upload Prospects API Step
 * Handles CSV uploads and triggers batch processing pipeline
 */
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { parse } from 'csv-parse/sync'
import { v4 as uuidv4 } from 'uuid'
import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

// Inline middleware
const coreMiddleware: ApiMiddleware = async (req, ctx, next) => {
  try {
    return await next()
  } catch (error: any) {
    if (error instanceof ZodError) {
      ctx.logger.warn('Validation error', { errors: error.errors })
      return { status: 400, body: { error: 'Validation failed', details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })) } }
    }
    ctx.logger.error('Request failed', { error: error.message })
    return { status: 500, body: { error: 'Internal Server Error', message: error.message } }
  }
}

const prospectRowSchema = z.object({
  company_name: z.string(),
  domain: z.string(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  title: z.string(),
  industry: z.string(),
  region: z.string(),
  company_size: z.coerce.number(),
  stage: z.string(),
  estimated_revenue_millions: z.coerce.number(),
  funding_status: z.string(),
  last_funding_date: z.string().optional(),
  actively_hiring: z.string(),
  website_updated: z.string(),
  linkedin_url: z.string().optional(),
})

const bodySchema = z.object({
  csv_data: z.string().describe('Raw CSV data with prospect information'),
  filename: z.string().optional().describe('Original filename'),
})

export const config: ApiRouteConfig = {
  name: 'UploadProspects',
  type: 'api',
  path: '/api/prospects/upload',
  method: 'POST',
  description: 'Upload a CSV of prospects to start research pipeline',
  emits: ['prospect.batch.created', 'prospect.research.queued'],
  flows: ['prospect-research'],
  middleware: [coreMiddleware],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      batch_id: z.string(),
      total_prospects: z.number(),
      message: z.string(),
    }),
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ row: z.number().optional(), message: z.string() })).optional(),
    }),
  },
}

export const handler: Handlers['UploadProspects'] = async (req, { emit, logger, state }) => {
  const { csv_data, filename } = bodySchema.parse(req.body)

  logger.info('Processing prospect CSV upload', { filename })

  let records: any[]
  try {
    records = parse(csv_data, { columns: true, skip_empty_lines: true, trim: true })
  } catch (error: any) {
    logger.error('CSV parsing failed', { error: error.message })
    return { status: 400, body: { error: 'Invalid CSV format', details: [{ message: error.message }] } }
  }

  if (records.length === 0) {
    return { status: 400, body: { error: 'CSV file is empty' } }
  }

  const batchId = uuidv4()
  const validProspects: any[] = []
  const errors: { row: number; message: string }[] = []

  for (let i = 0; i < records.length; i++) {
    try {
      const validated = prospectRowSchema.parse(records[i])
      validProspects.push({ ...validated, id: uuidv4(), batch_id: batchId })
    } catch (error: any) {
      errors.push({
        row: i + 2,
        message: error instanceof z.ZodError 
          ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          : error.message,
      })
    }
  }

  if (validProspects.length === 0) {
    return { status: 400, body: { error: 'No valid prospects found', details: errors.slice(0, 10) } }
  }

  logger.info('CSV validation complete', { valid: validProspects.length, invalid: errors.length })

  // Store batch in state
  await state.set('batches', batchId, {
    id: batchId,
    filename: filename || 'upload.csv',
    total_prospects: validProspects.length,
    processed_count: 0,
    status: 'processing',
    prospects: validProspects,
    created_at: new Date().toISOString(),
  })

  // Emit batch created event
  await emit({
    topic: 'prospect.batch.created',
    data: { batch_id: batchId, total_prospects: validProspects.length },
  })

  // Queue each prospect for research
  const BATCH_SIZE = 10
  for (let i = 0; i < validProspects.length; i += BATCH_SIZE) {
    const batch = validProspects.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map((prospect, idx) =>
        emit({
          topic: 'prospect.research.queued',
          data: { batch_id: batchId, prospect_index: i + idx, prospect },
        })
      )
    )
  }

  logger.info('Research jobs queued', { batchId, count: validProspects.length })

  return {
    status: 200,
    body: {
      success: true,
      batch_id: batchId,
      total_prospects: validProspects.length,
      message: `Successfully queued ${validProspects.length} prospects for research${errors.length > 0 ? ` (${errors.length} rows had errors)` : ''}`,
    },
  }
}
