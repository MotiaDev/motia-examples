import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { OpenAIService } from '../services/openai.service'

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
  isComplete: z.boolean()
})

export const config: EventConfig = {
  type: 'event',
  name: 'Compile Research Report',
  description: 'Compile final research report with all findings',
  subscribes: ['analysis-completed'],
  emits: [{
    topic: 'report-completed',
    label: 'Report completed',
  }],
  input: inputSchema,
  flows: ['research'],
}

export const handler: Handlers['Compile Research Report'] = async (input, { traceId, logger, state, emit }) => {
  logger.info('Compiling final research report', {
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

    // Use the OpenAI service to generate the report
    const openAIService = new OpenAIService()

    // Get all previous analyses from different depths
    const analyses = []

    for (let i = 0; i <= input.depth; i++) {
      const analysis = await state.get(traceId, `analysis-depth-${i}`)
      if (analysis) {
        analyses.push({
          depth: i,
          ...analysis
        })
      }
    }

    logger.info('Retrieved analyses from all depths', { 
      analysesCount: analyses.length 
    })

    // Generate the final report using the OpenAI service
    const parsedResponse = await openAIService.generateResearchReport(input.originalQuery, analyses)

    logger.info('Final report generated', { 
      title: parsedResponse.title,
      overviewLength: parsedResponse.overview.length,
      sectionsCount: parsedResponse.sections.length,
      takeawaysCount: parsedResponse.keyTakeaways.length,
      sourcesCount: parsedResponse.sources.length
    })

    // Store the final report in state
    await state.set(traceId, 'finalReport', parsedResponse)

    // Emit event for report completion
    await emit({
      topic: 'report-completed',
      data: {
        report: parsedResponse,
        requestId: input.requestId,
        originalQuery: input.originalQuery
      }
    })
  } catch (error) {
    logger.error('Error compiling final report', { error })
    throw error
  }
} 