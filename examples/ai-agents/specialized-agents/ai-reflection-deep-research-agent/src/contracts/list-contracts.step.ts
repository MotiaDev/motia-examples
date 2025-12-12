/**
 * List Contracts API Step
 * 
 * GET /contracts
 * 
 * List all contracts with their analysis status.
 * Supports pagination and filtering.
 */

import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import { StoredContract } from '../types/contract'

const contractSummarySchema = z.object({
  id: z.string(),
  fileName: z.string().optional(),
  status: z.string(),
  createdAt: z.string(),
  customerName: z.string().optional(),
  contractType: z.string().optional(),
  hasResult: z.boolean(),
})

const responseSchema = z.object({
  contracts: z.array(contractSummarySchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})

export const config: ApiRouteConfig = {
  name: 'ListContracts',
  type: 'api',
  path: '/contracts',
  method: 'GET',
  description: 'List all contracts with their analysis status',
  emits: [],
  flows: ['contract-analysis'],
  middleware: [errorHandlerMiddleware],
  queryParams: [
    { name: 'status', description: 'Filter by status (pending, completed, failed)' },
    { name: 'limit', description: 'Number of results to return (default: 20)' },
    { name: 'offset', description: 'Offset for pagination (default: 0)' },
  ],
  responseSchema: {
    200: responseSchema,
  },
}

export const handler: Handlers['ListContracts'] = async (req, { logger, state }) => {
  const statusFilter = req.queryParams.status as string | undefined
  const limit = parseInt(req.queryParams.limit as string) || 20
  const offset = parseInt(req.queryParams.offset as string) || 0

  logger.info('Listing contracts', { statusFilter, limit, offset })

  // Get all contracts from state
  const allContracts = await state.getGroup<StoredContract>('contracts')

  // Filter by status if specified
  let filteredContracts = allContracts
  if (statusFilter) {
    filteredContracts = allContracts.filter(c => c.status === statusFilter)
  }

  // Sort by creation date (newest first)
  filteredContracts.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // Apply pagination
  const paginatedContracts = filteredContracts.slice(offset, offset + limit)

  // Map to summary format
  const contractSummaries = paginatedContracts.map(contract => ({
    id: contract.id,
    fileName: contract.fileName,
    status: contract.status,
    createdAt: contract.createdAt,
    customerName: contract.context?.customerName,
    contractType: contract.context?.contractType,
    hasResult: !!contract.refinedAnalysisId,
  }))

  logger.info('Returning contracts list', {
    total: filteredContracts.length,
    returned: contractSummaries.length,
  })

  return {
    status: 200,
    body: {
      contracts: contractSummaries,
      total: filteredContracts.length,
      limit,
      offset,
    },
  }
}


