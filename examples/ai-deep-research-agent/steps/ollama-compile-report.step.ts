import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { OllamaService } from '../services/ollama.service'

type Input = typeof inputSchema

const inputSchema = z.object({
  analysis: z.object({
    summary: z.string(),
    keyFindings: z.array(z.string()),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string()
    }))
  }),
  requestId: z.string(),
  originalQuery: z.string(),
  depth: z.number().int(),
  isComplete: z.boolean(),
  provider: z.string().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'Ollama Compile Research Report',
  description: 'Compile final research report using Ollama LLM with all findings',
  subscribes: ['ollama-analysis-completed'],
  emits: [{
    topic: 'ollama-report-completed',
    label: 'Report completed',
  }],
  input: inputSchema,
  flows: ['ollama-research'],
}

export const handler: Handlers['Ollama Compile Research Report'] = async (input, { traceId, logger, state, emit }) => {
  logger.info('Compiling final research report using Ollama', {
    originalQuery: input.originalQuery,
    depth: input.depth,
    isComplete: input.isComplete
  })

  try {
    // Only compile the final report when research is complete
    if (!input.isComplete) {
      logger.info('Research not yet complete, waiting for further analysis')
      return
    }

    // Retrieve Ollama configuration
    const ollamaConfig = await state.get<{host?: string, model?: string}>(traceId, 'ollamaConfig');

    // Use the Ollama service to generate the report
    const ollamaService = new OllamaService(ollamaConfig?.host)

    // Get all previous analyses from different depths
    const analyses = []

    for (let i = 0; i <= Number(input.depth); i++) {
      const analysis = await state.get(traceId, `analysis-depth-${i}`)
      if (analysis) {
        analyses.push({
          depth: i,
          ...analysis
        })
      }
    }

    logger.info('Retrieved analyses from all depths for Ollama compilation', { 
      analysesCount: analyses.length,
      model: ollamaConfig?.model || process.env.OLLAMA_MODEL || 'llama3.1'
    })

    // Generate the final report using the Ollama service
    const parsedResponse = await ollamaService.generateResearchReport(input.originalQuery, analyses)

    // Validate the response structure
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid report response: Expected object but got ' + typeof parsedResponse)
    }

    // Provide default values for missing properties
    const safeResponse = {
      title: parsedResponse.title || 'Research Report',
      overview: parsedResponse.overview || 'No overview available',
      sections: Array.isArray(parsedResponse.sections) ? parsedResponse.sections : [],
      keyTakeaways: Array.isArray(parsedResponse.keyTakeaways) ? parsedResponse.keyTakeaways : [],
      sources: Array.isArray(parsedResponse.sources) ? parsedResponse.sources : [],
      originalQuery: parsedResponse.originalQuery || input.originalQuery,
      metadata: parsedResponse.metadata || {
        depthUsed: Number(input.depth),
        completedAt: new Date().toISOString()
      }
    }

    logger.info('Final report generated using Ollama', { 
      title: safeResponse.title,
      overviewLength: safeResponse.overview.length,
      sectionsCount: safeResponse.sections.length,
      takeawaysCount: safeResponse.keyTakeaways.length,
      sourcesCount: safeResponse.sources.length,
      rawResponseType: typeof parsedResponse,
      hasTitle: !!parsedResponse.title,
      hasOverview: !!parsedResponse.overview,
      hasSections: !!parsedResponse.sections,
      hasKeyTakeaways: !!parsedResponse.keyTakeaways,
      hasSources: !!parsedResponse.sources
    })

    // Store the final report in state with provider information
    const reportWithMetadata = {
      ...safeResponse,
      metadata: {
        ...safeResponse.metadata,
        provider: 'ollama',
        ollamaConfig: ollamaConfig
      }
    }

    await state.set(traceId, 'finalReport', reportWithMetadata)

    // Emit event for report completion
    await (emit as any)({
      topic: 'ollama-report-completed',
      data: {
        report: reportWithMetadata,
        requestId: input.requestId,
        originalQuery: input.originalQuery
      }
    })
  } catch (error) {
    logger.error('Error compiling final report with Ollama', { error })
    throw error
  }
}
