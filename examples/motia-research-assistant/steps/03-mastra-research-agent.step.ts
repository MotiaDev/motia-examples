import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";

const MastraResearchInputSchema = z.object({
  researchId: z.string(),
  query: z.string(),
  depth: z.enum(["basic", "detailed", "comprehensive"]),
  searchResults: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      content: z.string(),
      source: z.string(),
      score: z.number(),
    })
  ),
  totalResults: z.number(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "MastraResearchStep",
  description: "Analyze collected data using Mastra Research Agent",
  subscribes: ["data.collected"],
  emits: ["research.analyzed"],
  input: MastraResearchInputSchema,
  flows: ["motia-research-assistant"],
};

// Create Mastra tool for analysis
const analyzeDataTool = createTool({
  id: "analyze_data",
  description: "Analyze search results and extract key insights",
  inputSchema: z.object({
    sources: z.array(
      z.object({
        title: z.string(),
        content: z.string(),
        source: z.string(),
        url: z.string(),
      })
    ),
    query: z.string(),
    depth: z.string(),
  }),
  execute: async ({ context: { sources, query, depth } }) => {
    // Actually process the sources
    const processedSources = sources.map((source) => {
      // Extract key sentences
      const sentences = source.content
        .split(".")
        .filter((s) => s.trim().length > 20);
      const keySentences = sentences.slice(0, 3);

      // Calculate relevance score based on query terms
      const queryTerms = query.toLowerCase().split(" ");
      const contentLower = source.content.toLowerCase();
      const relevanceScore =
        queryTerms.reduce((score, term) => {
          const occurrences = (contentLower.match(new RegExp(term, "g")) || [])
            .length;
          return score + occurrences;
        }, 0) / queryTerms.length;

      return {
        title: source.title,
        source: source.source,
        url: source.url,
        keySentences,
        relevanceScore,
        contentLength: source.content.length,
        summary: keySentences.join(". ") + ".",
      };
    });

    // Sort by relevance
    const sortedSources = processedSources.sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );

    // Extract common themes
    const allContent = sources
      .map((s) => s.content)
      .join(" ")
      .toLowerCase();
    const commonTerms = extractCommonTerms(allContent, query);

    return {
      processedSources: sortedSources,
      totalSources: sources.length,
      topSources: sortedSources.slice(0, 5),
      commonThemes: commonTerms,
      averageRelevance:
        sortedSources.reduce((sum, s) => sum + s.relevanceScore, 0) /
        sortedSources.length,
      analysisComplete: true,
    };
  },
});

// Helper function to extract common terms
function extractCommonTerms(content: string, query: string) {
  const words = content.match(/\b\w{4,}\b/g) || [];
  const frequency: Record<string, number> = {};

  words.forEach((word) => {
    if (!query.toLowerCase().includes(word.toLowerCase())) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });

  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

// Create the Mastra Research Agent
const createResearchAgent = () => {
  return new Agent({
    name: "ResearchAnalyst",
    instructions: `You are an expert research analyst. Analyze the provided search results and create a comprehensive analysis.

Your job:
1. Review all search results for key information
2. Extract the most important findings
3. Identify trends and patterns
4. Assess source credibility
5. Create structured insights

Provide your analysis in JSON format:
{
  "executive_summary": "Brief overview of key findings",
  "key_insights": [
    {
      "finding": "Specific insight",
      "evidence": "Supporting information",
      "sources": ["source1", "source2"]
    }
  ],
  "trends": ["identified trends"],
  "confidence_score": 0.85
}`,

    model: openai("gpt-4o"),
    tools: [analyzeDataTool],
  });
};

export const handler: Handlers["MastraResearchStep"] = async (
  input,
  { logger, emit }
) => {
  const { researchId, query, searchResults, depth } = input;

  logger.info(`MastraResearchStep – Starting AI analysis`, {
    researchId,
    query,
    sourcesCount: searchResults.length,
  });

  try {
    // Initialize the research agent
    const researchAgent = createResearchAgent();

    // Prepare sources for analysis
    const sources = searchResults.slice(0, 20).map((result) => ({
      title: result.title,
      content: result.content.substring(0, 1500), // Limit content length
      source: result.source,
      url: result.url,
    }));

    logger.info(`Analyzing ${sources.length} sources with AI`, {
      researchId,
    });

    // Use the agent to analyze the data
    const analysisResult = await researchAgent.generate(
      `Analyze these search results for the query: "${query}"
      
      Research Depth: ${depth}
      Sources to analyze: ${sources.length}
      
      Use the analyze_data tool first to process the sources, then provide comprehensive analysis based on the processed results.`
    );

    // Parse AI response
    let researchAnalysis;
    try {
      const jsonMatch = analysisResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        researchAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        researchAnalysis = {
          executive_summary: analysisResult.text,
          analysis_completed: true,
          confidence_score: 0.7,
        };
      }
    } catch (parseError) {
      researchAnalysis = {
        executive_summary: analysisResult.text,
        analysis_completed: true,
        confidence_score: 0.7,
        parsing_note: "AI response required manual processing",
      };
    }

    // Add metadata
    researchAnalysis.metadata = {
      researchId,
      query,
      depth,
      sourcesAnalyzed: sources.length,
      analysisTimestamp: new Date().toISOString(),
      agentModel: "gpt-4o",
    };

    logger.info(`AI analysis completed`, {
      researchId,
      confidence: researchAnalysis.confidence_score,
      sourcesAnalyzed: sources.length,
    });

    await emit({
      topic: "research.analyzed",
      data: {
        researchId,
        query,
        depth,
        researchAnalysis,
        searchResults, // Pass through original results
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error(`Mastra research analysis failed`, {
      researchId,
      error: error.message,
    });
    throw error;
  }
};
