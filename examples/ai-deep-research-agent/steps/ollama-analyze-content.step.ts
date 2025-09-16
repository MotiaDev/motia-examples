import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { OllamaService } from '../services/ollama.service'
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
  depth: z.number().int(),
  provider: z.string().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'Ollama Analyze Content',
  description: 'Analyze extracted content using Ollama LLM and generate research summary',
  subscribes: ['ollama-content-extracted'],
  emits: [{
    topic: 'ollama-analysis-completed',
    label: 'Analysis completed',
  }, {
    topic: 'ollama-follow-up-research-needed',
    label: 'Follow-up research needed',
  }],
  input: inputSchema,
  flows: ['ollama-research'],
}

interface ResearchSummary {
  summary: string;
  keyFindings: string[];
  sources: {
    title: string;
    url: string;
  }[];
}

export const handler: Handlers['Ollama Analyze Content'] = async (input, { traceId, logger, state, emit }) => {
  logger.info('Analyzing extracted content using Ollama', {
    contentCount: input.extractedContents.length,
    depth: input.depth
  })

  try {
    // Retrieve research config and Ollama config
    const researchConfig = await state.get<ResearchConfig>(traceId, 'researchConfig');
    const ollamaConfig = await state.get<{host?: string, model?: string}>(traceId, 'ollamaConfig');

    // Use the Ollama service to analyze content
    const ollamaService = new OllamaService(ollamaConfig?.host)
    const parsedResponse = await ollamaService.analyzeContent(
      input.originalQuery,
      input.extractedContents,
      Number(input.depth),
      researchConfig?.depth || 0
    )

    // Validate the response structure
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid analysis response: Expected object but got ' + typeof parsedResponse)
    }

    // Provide default values for missing properties
    const safeResponse = {
      summary: parsedResponse.summary || 'No summary available',
      keyFindings: Array.isArray(parsedResponse.keyFindings) ? parsedResponse.keyFindings : [],
      sources: Array.isArray(parsedResponse.sources) ? parsedResponse.sources : [],
      followUpQueries: Array.isArray(parsedResponse.followUpQueries) ? parsedResponse.followUpQueries : []
    }

    logger.info('Analysis completed using Ollama', { 
      summaryLength: safeResponse.summary.length,
      keyFindingsCount: safeResponse.keyFindings.length,
      sourcesCount: safeResponse.sources.length,
      followUpCount: safeResponse.followUpQueries.length,
      model: ollamaConfig?.model || process.env.OLLAMA_MODEL || 'llama3.1',
      rawResponseType: typeof parsedResponse,
      hasSummary: !!parsedResponse.summary,
      hasKeyFindings: !!parsedResponse.keyFindings,
      hasSources: !!parsedResponse.sources,
      hasFollowUpQueries: !!parsedResponse.followUpQueries
    })

    // Store the analysis in state (use safeResponse to ensure proper structure)
    await state.set(traceId, `analysis-depth-${input.depth}`, safeResponse)

    // Check if we need to continue research
    const needMoreResearch = Number(input.depth) < (researchConfig?.depth || 0) && 
                           safeResponse.followUpQueries.length > 0

    if (needMoreResearch) {
      // Update current depth
      await state.set(traceId, 'researchConfig', {
        ...researchConfig,
        currentDepth: Number(input.depth) + 1
      })

      // Emit event for follow-up research
      await emit({
        topic: 'ollama-follow-up-research-needed',
        data: {
          followUpQueries: safeResponse.followUpQueries,
          requestId: input.requestId,
          originalQuery: input.originalQuery,
          depth: Number(input.depth) + 1,
          provider: 'ollama',
          previousAnalysis: {
            summary: safeResponse.summary,
            keyFindings: safeResponse.keyFindings,
            sources: safeResponse.sources
          }
        }
      })
    } else {
      // Emit event for completion
      await emit({
        topic: 'ollama-analysis-completed',
        data: {
          analysis: {
            summary: safeResponse.summary,
            keyFindings: safeResponse.keyFindings,
            sources: safeResponse.sources
          },
          requestId: input.requestId,
          originalQuery: input.originalQuery,
          depth: input.depth,
          provider: 'ollama',
          isComplete: true
        }
      })
    }
  } catch (error) {
    logger.error('Error analyzing content with Ollama', { error })
    throw error
  }
}
