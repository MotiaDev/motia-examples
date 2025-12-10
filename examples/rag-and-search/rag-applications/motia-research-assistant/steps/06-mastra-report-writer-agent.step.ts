import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";

const MastraReportWriterInputSchema = z.object({
  researchId: z.string(),
  query: z.string(),
  depth: z.enum(["basic", "detailed", "comprehensive"]),
  factCheckAnalysis: z
    .object({
      verification_summary: z.string(),
      overall_reliability: z
        .object({
          score: z.number(),
          level: z.string(),
          rationale: z.string(),
        })
        .passthrough(),
      metadata: z.object({
        researchId: z.string(),
        query: z.string(),
        depth: z.string(),
        originalConfidence: z.number(),
        claimsVerified: z.number(),
        factCheckTimestamp: z.string(),
        agentModel: z.string(),
      }),
    })
    .passthrough(),
  factCheckStats: z.object({
    totalClaims: z.number(),
    verifiedClaims: z.number(),
    partiallyVerified: z.number(),
    unverifiedClaims: z.number(),
    averageConfidence: z.number(),
  }),
  summaryAnalysis: z.any(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "MastraReportWriterStep",
  description:
    "Generate final research reports using Mastra Report Writer Agent",
  subscribes: ["factcheck.completed"],
  emits: ["report.generated"],
  input: MastraReportWriterInputSchema,
  flows: ["motia-research-assistant"],
};

// Create Mastra tool for report structure
const structureReportTool = createTool({
  id: "structure_report",
  description: "Create professional report structure and outline",
  inputSchema: z.object({
    query: z.string(),
    depth: z.string(),
    reliabilityScore: z.number(),
    verifiedClaims: z.number(),
    totalClaims: z.number(),
  }),
  execute: async ({
    context: { query, depth, reliabilityScore, verifiedClaims, totalClaims },
  }) => {
    const reportLengths = {
      basic: { targetWords: 800, sections: 4 },
      detailed: { targetWords: 1500, sections: 6 },
      comprehensive: { targetWords: 2500, sections: 8 },
    };

    const config = reportLengths[depth as keyof typeof reportLengths];

    const outline = [
      "Executive Summary",
      "Key Findings",
      "Market Analysis",
      "Opportunities & Risks",
    ];

    if (depth !== "basic") {
      outline.push("Detailed Insights", "Recommendations");
    }

    if (depth === "comprehensive") {
      outline.push("Methodology", "Data Sources & Reliability");
    }

    return {
      targetWords: config.targetWords,
      recommendedSections: config.sections,
      outline,
      query,
      reliabilityScore,
      verificationRate: verifiedClaims / totalClaims,
      structureReady: true,
    };
  },
});

// Create formatting tool
const formatReportTool = createTool({
  id: "format_report",
  description: "Apply professional formatting and styling to report content",
  inputSchema: z.object({
    content: z.string(),
    title: z.string(),
    wordCount: z.number(),
    sections: z.array(z.string()),
  }),
  execute: async ({ context: { content, title, wordCount, sections } }) => {
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    const metadata = {
      title,
      wordCount,
      estimatedReadingTime: `${readingTime} minutes`,
      sectionsCount: sections.length,
      generatedAt: new Date().toISOString(),
    };

    return {
      formattedContent: content,
      metadata,
      readingTime,
      qualityChecks: {
        hasTitle: title.length > 0,
        appropriateLength: wordCount >= 500,
        hasSections: sections.length >= 3,
      },
      formattingComplete: true,
    };
  },
});

// Create the Mastra Report Writer Agent
const createReportWriterAgent = () => {
  return new Agent({
    name: "ReportWriterExpert",
    instructions: `You are an expert business report writer specializing in professional research reports for executives and decision-makers.

Your job:
1. Create comprehensive, well-structured business reports
2. Write in clear, professional language appropriate for executives
3. Include executive summary, key findings, insights, and recommendations
4. Use data and verified claims to support conclusions
5. Provide actionable business intelligence

Report Structure Requirements:
- Professional executive summary (150-200 words)
- Clear section headers and logical flow
- Data-driven insights with supporting evidence
- Business implications and strategic recommendations
- Conclusion with next steps

Writing Style:
- Professional but accessible tone
- Short paragraphs for readability
- Bullet points for key information
- Quantified insights where possible
- Action-oriented recommendations

Provide your report in this structure:
{
  "title": "Professional report title",
  "subtitle": "Brief descriptor", 
  "content": "Full report content with markdown formatting",
  "metadata": {
    "wordCount": 1500,
    "estimatedReadingTime": "8 minutes",
    "confidenceLevel": "high",
    "dataQuality": "verified"
  }
}`,

    model: openai("gpt-4o"),
    tools: [structureReportTool, formatReportTool],
  });
};

export const handler: Handlers["MastraReportWriterStep"] = async (
  input,
  { logger, emit }
) => {
  const {
    researchId,
    query,
    depth,
    factCheckAnalysis,
    factCheckStats,
    summaryAnalysis,
  } = input;

  logger.info(`MastraReportWriterStep – Starting report generation`, {
    researchId,
    query,
    depth,
    reliabilityScore: factCheckAnalysis.overall_reliability.score,
    verifiedClaims: factCheckStats.verifiedClaims,
  });

  try {
    // Initialize the report writer agent
    const reportWriterAgent = createReportWriterAgent();

    // Prepare comprehensive context for report writing
    const reportContext = {
      originalQuery: query,
      researchDepth: depth,
      executiveSummary: (summaryAnalysis as any).executive_summary,
      keyTakeaways: (summaryAnalysis as any).key_takeaways || [],
      actionableInsights: (summaryAnalysis as any).actionable_insights || [],
      criticalMetrics: (summaryAnalysis as any).critical_metrics || [],
      verificationSummary: factCheckAnalysis.verification_summary,
      reliabilityScore: factCheckAnalysis.overall_reliability.score,
      verifiedClaims: factCheckStats.verifiedClaims,
      totalClaims: factCheckStats.totalClaims,
    };

    logger.info(`Generating ${depth} report with AI`, {
      researchId,
      reliability: reportContext.reliabilityScore,
      verificationRate: (
        reportContext.verifiedClaims / reportContext.totalClaims
      ).toFixed(2),
    });

    // Use the agent to generate the final report
    const reportResult = await reportWriterAgent.generate(
      `Create a comprehensive business research report based on this analysis.

RESEARCH CONTEXT:
Original Query: "${query}"
Research Depth: ${depth}
Reliability Score: ${reportContext.reliabilityScore}
Verified Claims: ${reportContext.verifiedClaims}/${reportContext.totalClaims}

EXECUTIVE SUMMARY:
${reportContext.executiveSummary}

KEY TAKEAWAYS:
${reportContext.keyTakeaways
  .map((t: any, i: number) => `${i + 1}. ${t.finding || t}`)
  .join("\n")}

ACTIONABLE INSIGHTS:
${reportContext.actionableInsights
  .map((a: any, i: number) => `${i + 1}. ${a.recommendation || a}`)
  .join("\n")}

VERIFICATION STATUS:
${reportContext.verificationSummary}

Use your tools to:
1. Structure the report appropriately for ${depth} depth
2. Format professionally with proper sections
3. Create comprehensive business analysis

Generate a complete professional report with title, sections, and actionable recommendations.`
    );

    // Parse AI response
    let finalReport;
    try {
      const jsonMatch = reportResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        finalReport = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: structure the text response
        finalReport = {
          title: `Research Report: ${query}`,
          subtitle: `${
            depth.charAt(0).toUpperCase() + depth.slice(1)
          } Analysis`,
          content: reportResult.text,
          metadata: {
            wordCount: reportResult.text.split(" ").length,
            estimatedReadingTime: `${Math.ceil(
              reportResult.text.split(" ").length / 200
            )} minutes`,
            confidenceLevel:
              reportContext.reliabilityScore >= 0.8
                ? "high"
                : reportContext.reliabilityScore >= 0.6
                ? "medium"
                : "low",
            dataQuality: "processed",
          },
        };
      }
    } catch (parseError) {
      finalReport = {
        title: `Research Report: ${query}`,
        subtitle: `${depth.charAt(0).toUpperCase() + depth.slice(1)} Analysis`,
        content: reportResult.text,
        parsing_note: "Report generated but required manual processing",
        metadata: {
          wordCount: reportResult.text.split(" ").length,
          confidenceLevel: "medium",
          dataQuality: "processed",
        },
      };
    }

    // Enhance metadata
    finalReport.metadata = {
      ...finalReport.metadata,
      researchId,
      query,
      depth,
      generatedAt: new Date().toISOString(),
      agentModel: "gpt-4o",
      reliabilityScore: reportContext.reliabilityScore,
      verifiedClaims: reportContext.verifiedClaims,
      totalClaims: reportContext.totalClaims,
      verificationRate: (
        reportContext.verifiedClaims / reportContext.totalClaims
      ).toFixed(2),
    };

    // Calculate report structure
    const reportStructure = {
      title: finalReport.title,
      subtitle: finalReport.subtitle,
      sections: (finalReport.content.match(/#{1,3}\s+[^\n]+/g) || []).length,
      wordCount: finalReport.metadata.wordCount,
      readingTime: finalReport.metadata.estimatedReadingTime,
    };

    // Calculate quality metrics
    const qualityMetrics = {
      reliabilityScore: reportContext.reliabilityScore,
      verificationRate:
        reportContext.verifiedClaims / reportContext.totalClaims,
      confidenceLevel: finalReport.metadata.confidenceLevel,
      dataQuality: reportContext.reliabilityScore >= 0.7 ? "high" : "medium",
      completeness: reportStructure.wordCount >= 800 ? "complete" : "partial",
    };

    logger.info(`Report generation completed`, {
      researchId,
      ...reportStructure,
      reliability: qualityMetrics.reliabilityScore,
      verificationRate: qualityMetrics.verificationRate,
    });

    await emit({
      topic: "report.generated",
      data: {
        researchId,
        query,
        depth,
        finalReport,
        reportStructure,
        qualityMetrics,
        factCheckAnalysis, // Pass through for coordinator
        summaryAnalysis, // Pass through for coordinator
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error(`Report generation failed`, {
      researchId,
      error: error.message,
    });
    throw error;
  }
};
