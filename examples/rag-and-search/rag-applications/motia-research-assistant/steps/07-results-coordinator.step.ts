import { z } from "zod";
import { EventConfig, Handlers } from "motia";

const ResultsCoordinatorInputSchema = z.object({
  researchId: z.string(),
  query: z.string(),
  depth: z.enum(["basic", "detailed", "comprehensive"]),
  finalReport: z
    .object({
      title: z.string(),
      subtitle: z.string(),
      content: z.string(),
      metadata: z
        .object({
          researchId: z.string(),
          query: z.string(),
          depth: z.string(),
          generatedAt: z.string(),
          agentModel: z.string(),
          reliabilityScore: z.number(),
          verifiedClaims: z.number(),
          totalClaims: z.number(),
          verificationRate: z.string(),
          wordCount: z.number(),
          estimatedReadingTime: z.string(),
          confidenceLevel: z.string(),
        })
        .passthrough(),
    })
    .passthrough(),
  reportStructure: z.object({
    title: z.string(),
    subtitle: z.string(),
    sections: z.number(),
    wordCount: z.number(),
    readingTime: z.string(),
  }),
  qualityMetrics: z.object({
    reliabilityScore: z.number(),
    verificationRate: z.number(),
    confidenceLevel: z.string(),
    dataQuality: z.string(),
    completeness: z.string(),
  }),
  factCheckAnalysis: z.any(),
  summaryAnalysis: z.any(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "ResultsCoordinatorStep",
  description: "Coordinate final results and prepare for storage/delivery",
  subscribes: ["report.generated"],
  emits: ["results.coordinated"],
  input: ResultsCoordinatorInputSchema,
  flows: ["motia-research-assistant"],
};

export const handler: Handlers["ResultsCoordinatorStep"] = async (
  input,
  { logger, emit }
) => {
  const {
    researchId,
    query,
    depth,
    finalReport,
    reportStructure,
    qualityMetrics,
  } = input;

  logger.info(`ResultsCoordinatorStep – Coordinating final results`, {
    researchId,
    query,
    depth,
    wordCount: reportStructure.wordCount,
    reliability: qualityMetrics.reliabilityScore,
  });

  try {
    // Calculate processing metrics
    const endTime = new Date();
    const startTime = new Date(finalReport.metadata.generatedAt);
    const processingTimeSeconds = Math.round(
      (endTime.getTime() - startTime.getTime()) / 1000
    );
    const processingTimeMinutes =
      Math.round((processingTimeSeconds / 60) * 10) / 10;

    // Performance assessment
    const targetTime = 60; // 60 second target
    const metTarget = processingTimeSeconds <= targetTime;

    logger.info(`Processing time assessment`, {
      researchId,
      processingTimeSeconds,
      processingTimeMinutes,
      targetTime,
      metTarget,
    });

    // Quality assessment
    const qualityScore = calculateOverallQuality(
      qualityMetrics,
      reportStructure
    );
    const reliabilityLevel =
      qualityMetrics.reliabilityScore >= 0.8
        ? "high"
        : qualityMetrics.reliabilityScore >= 0.6
        ? "medium"
        : "low";

    // Create comprehensive research summary
    const researchSummary = {
      researchId,
      query,
      depth,
      status: "completed",
      timing: {
        startedAt: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        processingTimeSeconds,
        processingTimeMinutes,
        targetTime,
        metTarget,
      },
      dataCollection: {
        totalSources: finalReport.metadata.totalClaims || 0,
        verifiedSources: finalReport.metadata.verifiedClaims || 0,
        successRate: qualityMetrics.verificationRate,
      },
      quality: {
        overallQuality: qualityScore,
        reliabilityScore: qualityMetrics.reliabilityScore,
        reliabilityLevel,
        confidenceLevel: qualityMetrics.confidenceLevel,
        dataQuality: qualityMetrics.dataQuality,
        completeness: qualityMetrics.completeness,
        verifiedClaims: finalReport.metadata.verifiedClaims,
      },
      report: {
        title: finalReport.title,
        subtitle: finalReport.subtitle,
        wordCount: reportStructure.wordCount,
        sections: reportStructure.sections,
        readingTime: reportStructure.readingTime,
        format: "markdown",
      },
      workflow: {
        stepsCompleted: [
          "query-received",
          "data-collected",
          "research-analyzed",
          "summary-generated",
          "factcheck-completed",
          "report-generated",
          "results-coordinated",
        ],
        completionRate: 1.0,
        currentStep: "results-coordinated",
      },
    };

    // Create deliverables package
    const deliverables = {
      report: {
        format: "markdown",
        title: finalReport.title,
        subtitle: finalReport.subtitle,
        content: finalReport.content,
        metadata: finalReport.metadata,
      },
      executiveSummary: extractExecutiveSummary(finalReport.content),
      keyInsights: extractKeyInsights(input.summaryAnalysis),
      sourceData: {
        verificationRate: qualityMetrics.verificationRate,
        reliabilityScore: qualityMetrics.reliabilityScore,
        totalClaims: finalReport.metadata.totalClaims,
        verifiedClaims: finalReport.metadata.verifiedClaims,
      },
      metadata: {
        generatedAt: endTime.toISOString(),
        processingTime: processingTimeSeconds,
        qualityScore,
        confidenceLevel: qualityMetrics.confidenceLevel,
      },
    };

    // Success metrics evaluation
    const successMetrics = {
      timeTarget: metTarget,
      qualityTarget: qualityScore >= 0.7,
      reliabilityTarget: qualityMetrics.reliabilityScore >= 0.6,
      completenessTarget: qualityMetrics.completeness === "complete",
      overallSuccess:
        metTarget &&
        qualityScore >= 0.7 &&
        qualityMetrics.reliabilityScore >= 0.6,
    };

    // Prepare notification data
    const notificationData = {
      researchId,
      query,
      depth,
      status: "completed",
      success: successMetrics.overallSuccess,
      processingTime: processingTimeSeconds,
      qualityScore,
      reliabilityScore: qualityMetrics.reliabilityScore,
      type: "research_completed",
      timestamp: endTime.toISOString(),
      actions: [
        { text: "View Report", url: `/research/${researchId}/report` },
        { text: "Download PDF", url: `/research/${researchId}/download` },
        { text: "Share Results", url: `/research/${researchId}/share` },
      ],
    };

    logger.info(`Results coordination completed`, {
      researchId,
      overallSuccess: successMetrics.overallSuccess,
      qualityScore,
      processingTime: processingTimeSeconds,
      reliabilityScore: qualityMetrics.reliabilityScore,
      stepsCompleted: researchSummary.workflow.stepsCompleted.length,
    });

    // Emit final coordinated results
    await emit({
      topic: "results.coordinated",
      data: {
        id: researchId,
        query,
        depth,
        status: "completed",
        createdAt: startTime.toISOString(),
        traceId: `trace_${researchId}`,
        finalReport,
        reportStats: reportStructure,
        researchSummary,
        deliverables,
        notificationData,
        successMetrics,
        workflow: {
          currentStep: "result-storage",
          completedSteps: researchSummary.workflow.stepsCompleted,
          nextStep: "result-storage",
        },
      },
    });

    logger.info(`Coordination event emitted`, {
      researchId,
      nextStep: "result-storage",
      readyForDelivery: true,
    });
  } catch (error: any) {
    logger.error(`Results coordination failed`, {
      researchId,
      error: error.message,
    });
    throw error;
  }
};

// Helper function to calculate overall quality score
function calculateOverallQuality(
  qualityMetrics: any,
  reportStructure: any
): number {
  const weights = {
    reliability: 0.4, // 40% - How reliable are the sources
    verification: 0.3, // 30% - How many claims were verified
    completeness: 0.2, // 20% - Report completeness
    structure: 0.1, // 10% - Report structure quality
  };

  const scores = {
    reliability: qualityMetrics.reliabilityScore,
    verification: qualityMetrics.verificationRate,
    completeness: qualityMetrics.completeness === "complete" ? 1.0 : 0.7,
    structure: Math.min(reportStructure.sections / 5, 1.0), // Target 5+ sections
  };

  const overallScore = Object.entries(weights).reduce(
    (total, [key, weight]) => {
      return total + scores[key as keyof typeof scores] * weight;
    },
    0
  );

  return Math.round(overallScore * 100) / 100; // Round to 2 decimal places
}

// Helper function to extract executive summary
function extractExecutiveSummary(content: string): string {
  // Look for executive summary section
  const execSummaryMatch = content.match(
    /#{1,3}\s*Executive\s+Summary[^\n]*\n([\s\S]*?)(?=#{1,3}|$)/i
  );
  if (execSummaryMatch) {
    return execSummaryMatch[1].trim().substring(0, 500);
  }

  // Fallback: use first 2-3 paragraphs
  const paragraphs = content.split("\n\n").filter((p) => p.trim().length > 50);
  return paragraphs.slice(0, 2).join("\n\n").substring(0, 500);
}

// Helper function to extract key insights
function extractKeyInsights(
  summaryAnalysis: any
): Array<{ insight: string; confidence: number; source: string }> {
  const insights: Array<{
    insight: string;
    confidence: number;
    source: string;
  }> = [];

  // From key takeaways
  if (summaryAnalysis.key_takeaways) {
    summaryAnalysis.key_takeaways.forEach((takeaway: any, index: number) => {
      insights.push({
        insight:
          takeaway.finding || takeaway.insight || `Key finding ${index + 1}`,
        confidence: takeaway.confidence || 0.8,
        source: "key_takeaways",
      });
    });
  }

  // From actionable insights
  if (summaryAnalysis.actionable_insights) {
    summaryAnalysis.actionable_insights.forEach(
      (action: any, index: number) => {
        insights.push({
          insight:
            action.recommendation ||
            action.insight ||
            `Recommendation ${index + 1}`,
          confidence: 0.85,
          source: "actionable_insights",
        });
      }
    );
  }

  // From critical metrics
  if (summaryAnalysis.critical_metrics) {
    summaryAnalysis.critical_metrics.forEach((metric: any, index: number) => {
      insights.push({
        insight:
          `${metric.metric}: ${metric.value}` || `Critical metric ${index + 1}`,
        confidence: 0.9,
        source: "critical_metrics",
      });
    });
  }

  return insights.slice(0, 10); // Limit to top 10 insights
}
