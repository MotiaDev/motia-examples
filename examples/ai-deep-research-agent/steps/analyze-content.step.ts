import { EventConfig, StepHandler } from '@motiadev/core'
import { z } from 'zod'
import { OpenAIService } from '../services/openai.service'
import { ResearchConfig } from './types/research-config'

type Input = typeof inputSchema

const inputSchema = z.object({
  extractedContents: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      content: z.string(),
      query: z.string()
    })
  ),
  requestId: z.string(),
  originalQuery: z.string(),
  depth: z.number().int()
})

export const config: EventConfig<Input> = {
  type: 'event',
  name: 'Analyze Content',
  description: 'Analyze extracted content and generate research summary',
  subscribes: ['content-extracted'],
  emits: [{
    topic: 'analysis-completed',
    label: 'Analysis completed',
  }, {
    topic: 'follow-up-research-needed',
    label: 'Follow-up research needed',
  }],
  input: inputSchema,
  flows: ['research'],
}

interface ResearchSummary {
  summary: string;
  keyFindings: string[];
  sources: {
    title: string;
    url: string;
  }[];
}

export const handler: StepHandler<typeof config> = async (input, { traceId, logger, state, emit }) => {
  logger.info('Analyzing extracted content', {
    contentCount: input.extractedContents.length,
    depth: input.depth
  })

  try {
    // Retrieve research config to check depth
    const researchConfig = await state.get<ResearchConfig>(traceId, 'researchConfig');

    // Use the OpenAI service to analyze content
    const openAIService = new OpenAIService()
    const parsedResponse = await openAIService.analyzeContent(
      input.originalQuery,
      input.extractedContents,
      input.depth,
      researchConfig?.depth || 0
    )

    logger.info('Analysis completed', { 
      summaryLength: parsedResponse.summary.length,
      keyFindingsCount: parsedResponse.keyFindings.length,
      sourcesCount: parsedResponse.sources.length,
      followUpCount: parsedResponse.followUpQueries?.length || 0
    })

    // Store the analysis in state
    await state.set(traceId, `analysis-depth-${input.depth}`, parsedResponse)

    // Check if we need to continue research
    const needMoreResearch = input.depth < (researchConfig?.depth || 0) && 
                           Array.isArray(parsedResponse.followUpQueries) && 
                           parsedResponse.followUpQueries.length > 0

    if (needMoreResearch) {
      // Update current depth
      await state.set(traceId, 'researchConfig', {
        ...researchConfig,
        currentDepth: input.depth + 1
      })

      // Emit event for follow-up research
      await emit({
        topic: 'follow-up-research-needed',
        data: {
          followUpQueries: parsedResponse.followUpQueries,
          requestId: input.requestId,
          originalQuery: input.originalQuery,
          depth: input.depth + 1,
          previousAnalysis: {
            summary: parsedResponse.summary,
            keyFindings: parsedResponse.keyFindings,
            sources: parsedResponse.sources
          }
        }
      })
    } else {
      // Emit event for completion
      await emit({
        topic: 'analysis-completed',
        data: {
          analysis: {
            summary: parsedResponse.summary,
            keyFindings: parsedResponse.keyFindings,
            sources: parsedResponse.sources
          },
          requestId: input.requestId,
          originalQuery: input.originalQuery,
          depth: input.depth,
          isComplete: true
        }
      })
    }
  } catch (error) {
    logger.error('Error analyzing content', { error })
    throw error
  }
} 