import { z } from "zod";
import { EventConfig, Handlers } from "motia";

const ResultStorageInputSchema = z.object({
  id: z.string(),
  query: z.string(),
  depth: z.enum(["basic", "detailed", "comprehensive"]),
  status: z.string(),
  createdAt: z.string(),
  traceId: z.string(),
  finalReport: z
    .object({
      title: z.string(),
      subtitle: z.string(),
      content: z.string(),
      metadata: z.any(),
    })
    .passthrough(),
  reportStats: z.object({
    title: z.string(),
    subtitle: z.string(),
    sections: z.number(),
    wordCount: z.number(),
    readingTime: z.string(),
  }),
  researchSummary: z
    .object({
      researchId: z.string(),
      query: z.string(),
      depth: z.string(),
      status: z.string(),
      timing: z.object({
        startedAt: z.string(),
        completedAt: z.string(),
        processingTimeSeconds: z.number(),
        processingTimeMinutes: z.number(),
        targetTime: z.number(),
        metTarget: z.boolean(),
      }),
      quality: z
        .object({
          overallQuality: z.number(),
          reliabilityScore: z.number(),
          reliabilityLevel: z.string(),
          confidenceLevel: z.string(),
          verifiedClaims: z.number(),
        })
        .passthrough(),
    })
    .passthrough(),
  deliverables: z.object({
    report: z.object({
      format: z.string(),
      title: z.string(),
      subtitle: z.string(),
      content: z.string(),
      metadata: z.any(),
    }),
    executiveSummary: z.string(),
    keyInsights: z.array(
      z.object({
        insight: z.string(),
        confidence: z.number(),
        source: z.string(),
      })
    ),
    sourceData: z.any(),
    metadata: z.any(),
  }),
  successMetrics: z.object({
    timeTarget: z.boolean(),
    qualityTarget: z.boolean(),
    reliabilityTarget: z.boolean(),
    completenessTarget: z.boolean(),
    overallSuccess: z.boolean(),
  }),
  workflow: z.object({
    currentStep: z.string(),
    completedSteps: z.array(z.string()),
    nextStep: z.string(),
  }),
});

export const config: EventConfig = {
  type: "event",
  name: "ResultStorageStep",
  description: "Store final research results and provide API response",
  subscribes: ["results.coordinated"],
  emits: ["workflow.completed"],
  input: ResultStorageInputSchema,
  flows: ["motia-research-assistant"],
};

export const handler: Handlers["ResultStorageStep"] = async (
  input,
  { logger, emit, state }
) => {
  const {
    id: researchId,
    query,
    depth,
    finalReport,
    reportStats,
    researchSummary,
    deliverables,
    successMetrics,
  } = input;

  logger.info(`ResultStorageStep – Starting result storage and API response`, {
    researchId,
    query,
    depth,
    overallSuccess: successMetrics.overallSuccess,
    processingTime: researchSummary.timing.processingTimeSeconds,
  });

  try {
    // Store complete research results
    await storeResearchResults(researchId, input, state, logger);

    // Store public report for sharing
    await storePublicReport(researchId, deliverables.report, state, logger);

    // Store executive summary for quick access
    await storeExecutiveSummary(
      researchId,
      deliverables.executiveSummary,
      researchSummary,
      state,
      logger
    );

    // Store key insights for API consumption
    await storeKeyInsights(researchId, deliverables.keyInsights, state, logger);

    // Generate API response for client
    const apiResponse = {
      success: true,
      researchId,
      status: "completed",
      query,
      depth,

      // Performance metrics
      performance: {
        processingTime: `${researchSummary.timing.processingTimeSeconds}s`,
        targetMet: researchSummary.timing.metTarget,
        processingMinutes: researchSummary.timing.processingTimeMinutes,
      },

      // Quality indicators
      quality: {
        overallScore: researchSummary.quality.overallQuality,
        reliabilityScore: researchSummary.quality.reliabilityScore,
        reliabilityLevel: researchSummary.quality.reliabilityLevel,
        confidenceLevel: researchSummary.quality.confidenceLevel,
        verifiedClaims: researchSummary.quality.verifiedClaims,
      },

      // Research deliverables
      results: {
        title: finalReport.title,
        subtitle: finalReport.subtitle,
        executiveSummary: deliverables.executiveSummary,
        keyInsights: deliverables.keyInsights.slice(0, 5), // Top 5 insights

        // Report metadata
        wordCount: (finalReport.metadata as any).wordCount,
        readingTime: (finalReport.metadata as any).estimatedReadingTime,
        sectionCount: reportStats.sections,
      },

      // Access URLs
      access: {
        reportUrl: `/api/research/${researchId}/report`,
        summaryUrl: `/api/research/${researchId}/summary`,
        insightsUrl: `/api/research/${researchId}/insights`,
        downloadUrl: `/api/research/${researchId}/download`,
      },

      // Timestamps
      timestamps: {
        requestedAt: researchSummary.timing.startedAt,
        completedAt: researchSummary.timing.completedAt,
        validUntil: calculateExpiryDate(),
      },

      // Success indicators
      success_metrics: successMetrics,
    };

    // Store API response for retrieval
    await state.set(`api_response_${researchId}`, "api_responses", {
      researchId,
      response: apiResponse,
      createdAt: new Date().toISOString(),
      expiresAt: calculateExpiryDate(),
    });

    logger.info(`Research workflow completed successfully`, {
      researchId,
      processingTime: researchSummary.timing.processingTimeSeconds,
      targetMet: successMetrics.timeTarget,
      overallSuccess: successMetrics.overallSuccess,
      qualityScore: researchSummary.quality.overallQuality,
      reliabilityScore: researchSummary.quality.reliabilityScore,
      wordCount: (finalReport.metadata as any).wordCount,
      verifiedClaims: researchSummary.quality.verifiedClaims,
    });

    // Final workflow completion event
    await (emit as any)({
      topic: "workflow.completed",
      data: {
        researchId,
        status: "completed",
        apiResponse,
        completedAt: new Date().toISOString(),
        successMetrics,
        performance: researchSummary.timing,
        quality: researchSummary.quality,

        // Summary for external systems
        summary: {
          query,
          depth,
          processingTime: researchSummary.timing.processingTimeSeconds,
          wordCount: (finalReport.metadata as any).wordCount,
          qualityScore: researchSummary.quality.overallQuality,
          reliabilityScore: researchSummary.quality.reliabilityScore,
          verifiedClaims: researchSummary.quality.verifiedClaims,
          success: successMetrics.overallSuccess,
        },
      },
    });

    logger.info(`Workflow completion event emitted`, {
      researchId,
      workflowStatus: "fully_completed",
      allStepsCompleted: true,
    });
  } catch (error: any) {
    logger.error(`Result storage and API response failed`, {
      researchId,
      error: error.message,
    });

    // Store error response
    const errorResponse = {
      success: false,
      researchId,
      status: "failed",
      error: {
        message: "Research workflow completed but storage failed",
        code: "STORAGE_ERROR",
        details: error.message,
      },
      timestamps: {
        requestedAt: researchSummary.timing.startedAt,
        failedAt: new Date().toISOString(),
      },
    };

    await state.set(`api_response_${researchId}`, "api_responses", {
      researchId,
      response: errorResponse,
      createdAt: new Date().toISOString(),
      status: "error",
    });

    throw error;
  }
};

// Storage helper functions
async function storeResearchResults(
  researchId: string,
  input: any,
  state: any,
  logger: any
) {
  try {
    await state.set(`research_${researchId}`, "completed_research", {
      researchId,
      fullRecord: input,
      storedAt: new Date().toISOString(),
      type: "complete_research_record",
    });

    logger.info(`Full research record stored`, { researchId });
  } catch (error: any) {
    logger.error(`Failed to store research record`, {
      researchId,
      error: error.message,
    });
    throw error;
  }
}

async function storePublicReport(
  researchId: string,
  report: any,
  state: any,
  logger: any
) {
  try {
    await state.set(`report_${researchId}`, "public_reports", {
      researchId,
      title: report.title,
      subtitle: report.subtitle,
      content: report.content,
      format: report.format,
      metadata: report.metadata,
      storedAt: new Date().toISOString(),
      accessLevel: "public",
    });

    logger.info(`Public report stored`, {
      researchId,
      wordCount: report.metadata.wordCount,
    });
  } catch (error: any) {
    logger.error(`Failed to store public report`, {
      researchId,
      error: error.message,
    });
    throw error;
  }
}

async function storeExecutiveSummary(
  researchId: string,
  summary: string,
  researchSummary: any,
  state: any,
  logger: any
) {
  try {
    await state.set(`summary_${researchId}`, "executive_summaries", {
      researchId,
      summary,
      query: researchSummary.query,
      depth: researchSummary.depth,
      qualityScore: researchSummary.quality.overallQuality,
      reliabilityScore: researchSummary.quality.reliabilityScore,
      processingTime: researchSummary.timing.processingTimeSeconds,
      storedAt: new Date().toISOString(),
      accessLevel: "summary",
    });

    logger.info(`Executive summary stored`, {
      researchId,
      summaryLength: summary.length,
    });
  } catch (error: any) {
    logger.error(`Failed to store executive summary`, {
      researchId,
      error: error.message,
    });
    throw error;
  }
}

async function storeKeyInsights(
  researchId: string,
  insights: any[],
  state: any,
  logger: any
) {
  try {
    await state.set(`insights_${researchId}`, "key_insights", {
      researchId,
      insights,
      insightCount: insights.length,
      averageConfidence:
        insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length,
      storedAt: new Date().toISOString(),
      accessLevel: "insights",
    });

    logger.info(`Key insights stored`, {
      researchId,
      insightCount: insights.length,
    });
  } catch (error: any) {
    logger.error(`Failed to store key insights`, {
      researchId,
      error: error.message,
    });
    throw error;
  }
}

// Helper function to calculate expiry date
function calculateExpiryDate(): string {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now
  return expiryDate.toISOString();
}
