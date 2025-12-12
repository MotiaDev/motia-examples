/**
 * Analyze Contract API Step
 * 
 * POST /contracts/analyze
 * 
 * Entry point for contract analysis. Accepts document upload,
 * validates input, extracts text, stores in state, and triggers
 * the multi-agent reflection pipeline.
 */

import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import { extractText, normalizeText, detectDocumentType } from '../services/document-processor'
import {
  ContractAnalysisRequest,
  ContractContext,
  StoredContract,
  AnalysisStatus,
} from '../types/contract'

const bodySchema = z.object({
  document: z.string().min(1, 'Document content is required'),
  documentType: z.enum(['pdf', 'docx', 'text']).default('text'),
  fileName: z.string().optional(),
  context: z.object({
    customerName: z.string().optional(),
    dealValue: z.number().optional(),
    dealCurrency: z.string().default('USD'),
    contractType: z.enum([
      'msa', 'nda', 'sow', 'saas_agreement', 'vendor_agreement',
      'customer_agreement', 'employment_contract', 'consulting_agreement',
      'partnership_agreement', 'licensing_agreement', 'purchase_agreement',
      'lease_agreement', 'other',
    ]).optional(),
    jurisdiction: z.string().optional(),
    urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    additionalNotes: z.string().optional(),
  }).optional(),
  useDeepResearch: z.boolean().default(false),
})

const responseSchema = z.object({
  id: z.string(),
  status: z.string(),
  message: z.string(),
  createdAt: z.string(),
  estimatedCompletionSeconds: z.number(),
})

const errorSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.array(z.object({
    path: z.string(),
    message: z.string(),
  })).optional(),
})

export const config: ApiRouteConfig = {
  name: 'AnalyzeContract',
  type: 'api',
  path: '/contracts/analyze',
  method: 'POST',
  description: 'Upload a contract for AI-powered analysis using multi-agent reflection pipeline',
  emits: [
    { topic: 'contract.requested', label: 'Trigger analysis pipeline' },
  ],
  flows: ['contract-analysis'],
  middleware: [errorHandlerMiddleware],
  bodySchema,
  responseSchema: {
    202: responseSchema,
    400: errorSchema,
    500: errorSchema,
  },
}

export const handler: Handlers['AnalyzeContract'] = async (req, { emit, logger, state, streams }) => {
  const startTime = Date.now()

  // Validate request body
  const validatedBody = bodySchema.parse(req.body)
  const { document, documentType, fileName, context, useDeepResearch } = validatedBody

  // Generate unique contract ID
  const contractId = randomUUID()

  logger.info('Starting contract analysis', {
    contractId,
    documentType,
    fileName,
    customerName: context?.customerName,
    dealValue: context?.dealValue,
    useDeepResearch,
  })

  // Update progress stream - starting
  const progressId = randomUUID()
  await streams.analysisProgress.set(contractId, progressId, {
    id: progressId,
    contractId,
    status: 'extracting_text',
    step: 'Document Processing',
    message: 'Extracting text from document...',
    timestamp: new Date().toISOString(),
    progress: 5,
  })

  // Extract text from document
  let extractedText: string
  try {
    const detectedType = detectDocumentType(fileName) || documentType
    const result = await extractText(document, detectedType, { extractMetadata: true })
    extractedText = normalizeText(result.text)

    logger.info('Text extracted successfully', {
      contractId,
      textLength: extractedText.length,
      pageCount: result.pageCount,
    })
  } catch (error) {
    logger.error('Failed to extract text from document', {
      contractId,
      error: (error as Error).message,
    })

    // Update progress stream - failed
    await streams.analysisProgress.set(contractId, progressId, {
      id: progressId,
      contractId,
      status: 'failed',
      step: 'Document Processing',
      message: `Failed to extract text: ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
      progress: 0,
    })

    return {
      status: 400,
      body: {
        error: 'Failed to process document',
        code: 'DOCUMENT_PROCESSING_ERROR',
        details: [{ path: 'document', message: (error as Error).message }],
      },
    }
  }

  // Store contract in state
  const storedContract: StoredContract = {
    id: contractId,
    fileName,
    originalDocument: document,
    extractedText,
    context: context as ContractContext | undefined,
    createdAt: new Date().toISOString(),
    status: 'extracting_text' as AnalysisStatus,
  }

  await state.set('contracts', contractId, storedContract)

  // Update progress stream
  await streams.analysisProgress.set(contractId, progressId, {
    id: progressId,
    contractId,
    status: 'pending',
    step: 'Queue',
    message: 'Contract queued for analysis. Starting Generator...',
    timestamp: new Date().toISOString(),
    progress: 10,
  })

  // Emit event to trigger the Generator step
  await emit({
    topic: 'contract.requested',
    data: {
      contractId,
      useDeepResearch,
      context: context || {},
    },
  })

  const processingTime = Date.now() - startTime

  logger.info('Contract analysis initiated', {
    contractId,
    processingTimeMs: processingTime,
    textLength: extractedText.length,
  })

  // Estimate completion time based on document length and urgency
  const baseTime = 60 // base 60 seconds
  const textFactor = Math.min(extractedText.length / 10000, 2) // up to 2x for long docs
  const urgencyFactor = context?.urgency === 'urgent' ? 0.8 : 1
  const estimatedSeconds = Math.round(baseTime * (1 + textFactor) * urgencyFactor)

  return {
    status: 202,
    body: {
      id: contractId,
      status: 'processing',
      message: 'Contract analysis initiated. Subscribe to progress stream for real-time updates.',
      createdAt: new Date().toISOString(),
      estimatedCompletionSeconds: estimatedSeconds,
    },
  }
}


