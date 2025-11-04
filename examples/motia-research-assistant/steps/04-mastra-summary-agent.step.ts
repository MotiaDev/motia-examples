import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";

const MastraSummaryInputSchema = z.object({
  researchId: z.string(),
  query: z.string(),
  depth: z.enum(["basic", "detailed", "comprehensive"]),
  researchAnalysis: z
    .object({
      executive_summary: z.string(),
      confidence_score: z.number(),
      metadata: z.object({
        researchId: z.string(),
        query: z.string(),
        depth: z.string(),
        sourcesAnalyzed: z.number(),
        analysisTimestamp: z.string(),
        agentModel: z.string(),
      }),
    })
    .passthrough(),
  searchResults: z.array(z.any()),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "MastraSummaryStep",
  description: "Generate executive summaries using Mastra Summary Agent",
  subscribes: ["research.analyzed"],
  emits: ["summary.generated"],
  input: MastraSummaryInputSchema,
  flows: ["motia-research-assistant"],
};

// Create Mastra tool for summary generation
const createSummaryTool = createTool({
  id: "create_summary",
  description: "Create executive summary from research analysis",
  inputSchema: z.object({
    analysis: z.string(),
    query: z.string(),
    depth: z.string(),
    targetLength: z.enum(["brief", "standard", "detailed"]),
  }),
  execute: async ({ context: { analysis, query, depth, targetLength } }) => {
    const lengthLimits = {
      brief: 150,
      standard: 300,
      detailed: 500,
    };

    const wordCount = analysis.split(" ").length;
    const sentences = analysis.split(".").filter((s) => s.trim().length > 0);

    return {
      originalLength: wordCount,
      targetWords: lengthLimits[targetLength],
      sentenceCount: sentences.length,
      query,
      depth,
      readyForSummary: true,
    };
  },
});

// Create the Mastra Summary Agent
const createSummaryAgent = () => {
  return new Agent({
    name: "SummarySpecialist",
    instructions: `You are an expert business analyst who creates clear, actionable summaries from research analysis.

Your job:
1. Create executive summaries for business decision-makers
2. Extract 3-5 key takeaways with business implications
3. Identify actionable insights and recommendations
4. Highlight critical metrics and data points
5. Assess risks and opportunities

Provide your summary in JSON format:
{
  "executive_summary": "2-3 paragraph business overview",
  "key_takeaways": [
    {
      "finding": "Key insight",
      "implication": "Business impact",
      "confidence": 0.9
    }
  ],
  "actionable_insights": [
    {
      "recommendation": "Specific action",
      "priority": "high|medium|low",
      "rationale": "Why this matters"
    }
  ],
  "critical_metrics": [
    {
      "metric": "What was measured",
      "value": "The data point",
      "significance": "Why it's important"
    }
  ],
  "confidence_assessment": {
    "overall_confidence": 0.85,
    "data_quality": "high|medium|low"
  }
}`,

    model: openai("gpt-4o"),
    tools: [createSummaryTool],
  });
};

export const handler: Handlers["MastraSummaryStep"] = async (
  input,
  { logger, emit }
) => {
  const { researchId, query, depth, researchAnalysis } = input;

  logger.info(`MastraSummaryStep – Starting summary generation`, {
    researchId,
    query,
    depth,
    confidence: researchAnalysis.confidence_score,
  });

  try {
    // Initialize the summary agent
    const summaryAgent = createSummaryAgent();

    // Determine target summary length based on depth
    const targetLength =
      depth === "basic"
        ? "brief"
        : depth === "detailed"
        ? "standard"
        : "detailed";

    logger.info(`Generating ${targetLength} summary with AI`, {
      researchId,
      targetLength,
    });

    // Use the agent to generate summary
    const summaryResult = await summaryAgent.generate(
      `Create a business summary for this research analysis.

Original Query: "${query}"
Research Depth: ${depth}
Analysis Confidence: ${researchAnalysis.confidence_score}

Research Analysis:
${researchAnalysis.executive_summary}

Additional Analysis Data:
${JSON.stringify(researchAnalysis, null, 2)}

Use the create_summary tool first, then provide the complete JSON summary focusing on business impact and actionable insights.

Target length: ${targetLength}`
    );

    // Parse AI response
    let summaryAnalysis;
    try {
      const jsonMatch = summaryResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summaryAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        summaryAnalysis = {
          executive_summary: summaryResult.text,
          key_takeaways: [
            {
              finding: "Analysis completed",
              implication: "Research data processed successfully",
              confidence: researchAnalysis.confidence_score,
            },
          ],
          confidence_assessment: {
            overall_confidence: researchAnalysis.confidence_score,
            data_quality: "medium",
          },
        };
      }
    } catch (parseError) {
      summaryAnalysis = {
        executive_summary: summaryResult.text,
        parsing_note: "Summary generated but required manual processing",
        confidence_assessment: {
          overall_confidence: researchAnalysis.confidence_score,
          data_quality: "medium",
        },
      };
    }

    // Add metadata
    summaryAnalysis.metadata = {
      researchId,
      query,
      depth,
      targetLength,
      summaryTimestamp: new Date().toISOString(),
      agentModel: "gpt-4o",
      originalConfidence: researchAnalysis.confidence_score,
    };

    // Calculate summary statistics
    const summaryStats = {
      executiveSummaryWords:
        summaryAnalysis.executive_summary?.split(" ").length || 0,
      keyTakeawaysCount: summaryAnalysis.key_takeaways?.length || 0,
      actionableInsightsCount: summaryAnalysis.actionable_insights?.length || 0,
      criticalMetricsCount: summaryAnalysis.critical_metrics?.length || 0,
    };

    logger.info(`Summary generation completed`, {
      researchId,
      ...summaryStats,
      confidence: summaryAnalysis.confidence_assessment?.overall_confidence,
    });

    await emit({
      topic: "summary.generated",
      data: {
        researchId,
        query,
        depth,
        summaryAnalysis,
        summaryStats,
        researchAnalysis, // Pass through for next step
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error(`Summary generation failed`, {
      researchId,
      error: error.message,
    });
    throw error;
  }
};
