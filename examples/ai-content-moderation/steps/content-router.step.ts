import { EventConfig, Handlers } from "motia";
import { z } from "zod";

export const config: EventConfig = {
  type: "event",
  name: "ContentRouter",
  description: "Routes content based on analysis confidence scores",
  subscribes: ["content.analyzed"],
  emits: ["content.approved", "content.rejected", "content.needsReview"],
  input: z.object({
    submissionId: z.string(),
    textAnalysis: z
      .object({
        hasToxicity: z.boolean(),
        toxicityScore: z.number(),
        categories: z.array(z.string()),
        confidence: z.number(),
      })
      .optional(),
    imageAnalysis: z
      .object({
        isUnsafe: z.boolean(),
        safetyScore: z.number(),
        categories: z.array(z.string()),
        confidence: z.number(),
      })
      .optional(),
    overallScore: z.number(),
    recommendation: z.enum(["approve", "review", "reject"]),
    timestamp: z.string(),
    error: z.string().optional(),
  }),
  flows: ["content-moderation"],
};

interface DecisionResult {
  submissionId: string;
  decision: "approved" | "rejected" | "needsReview";
  confidence: number;
  reason: string;
  autoDecision: boolean;
  overallScore: number;
  timestamp: string;
}

export const handler: Handlers["ContentRouter"] = async (
  input,
  { logger, emit, state, traceId }
) => {
  logger.info("Routing content decision", {
    submissionId: input.submissionId,
    recommendation: input.recommendation,
    overallScore: input.overallScore,
  });

  try {
    // Handle analysis errors
    if (input.error) {
      logger.warn("Content analysis had errors - routing to review", {
        submissionId: input.submissionId,
        error: input.error,
      });

      const decision = await createDecision(
        input.submissionId,
        "needsReview",
        0,
        "Analysis failed - requires manual review",
        false,
        input.overallScore
      );
      await state.set(traceId, "decision", decision);
      await emit({ topic: "content.needsReview", data: decision });
      return;
    }

    // Calculate confidence from analysis results
    const confidence = calculateConfidence(
      input.textAnalysis,
      input.imageAnalysis
    );

    logger.info("Calculated confidence score", {
      submissionId: input.submissionId,
      confidence,
      threshold: 85,
    });

    let decision: DecisionResult;

    // High confidence (>85%) - make automatic decision
    if (confidence > 85) {
      if (input.recommendation === "approve") {
        decision = await createDecision(
          input.submissionId,
          "approved",
          confidence,
          `Auto-approved: high confidence (${confidence}%) with low risk score (${input.overallScore})`,
          true,
          input.overallScore
        );
        await emit({ topic: "content.approved", data: decision });
        logger.info("Content auto-approved", {
          submissionId: input.submissionId,
          confidence,
        });
      } else if (input.recommendation === "reject") {
        decision = await createDecision(
          input.submissionId,
          "rejected",
          confidence,
          `Auto-rejected: high confidence (${confidence}%) with high risk score (${input.overallScore})`,
          true,
          input.overallScore
        );
        await emit({ topic: "content.rejected", data: decision });
        logger.info("Content auto-rejected", {
          submissionId: input.submissionId,
          confidence,
        });
      } else {
        // High confidence but recommendation is 'review' - still route to review
        decision = await createDecision(
          input.submissionId,
          "needsReview",
          confidence,
          `High confidence (${confidence}%) but moderate risk score (${input.overallScore}) - human review recommended`,
          false,
          input.overallScore
        );
        await emit({ topic: "content.needsReview", data: decision });
        logger.info("Content routed to review despite high confidence", {
          submissionId: input.submissionId,
          confidence,
        });
      }
    }
    // Low confidence (<85%) - route to human review
    else {
      decision = await createDecision(
        input.submissionId,
        "needsReview",
        confidence,
        `Low confidence (${confidence}%) - requires human review`,
        false,
        input.overallScore
      );
      await emit({ topic: "content.needsReview", data: decision });
      logger.info("Content routed to review due to low confidence", {
        submissionId: input.submissionId,
        confidence,
      });
    }

    // Store decision in state for audit trail
    await state.set(traceId, "decision", decision);

    logger.info("Content routing completed", {
      submissionId: input.submissionId,
      decision: decision.decision,
      confidence: decision.confidence,
      autoDecision: decision.autoDecision,
    });
  } catch (error: any) {
    logger.error("Content routing failed", {
      submissionId: input.submissionId,
      error: error.message,
    });

    // Fail safe - route to human review
    const safeDecision = await createDecision(
      input.submissionId,
      "needsReview",
      0,
      `Routing failed: ${error.message} - requires manual review`,
      false,
      input.overallScore
    );

    await state.set(traceId, "decision", safeDecision);
    await emit({ topic: "content.needsReview", data: safeDecision });
  }
};

async function createDecision(
  submissionId: string,
  decision: "approved" | "rejected" | "needsReview",
  confidence: number,
  reason: string,
  autoDecision: boolean,
  overallScore: number
): Promise<DecisionResult> {
  return {
    submissionId,
    decision,
    confidence,
    reason,
    autoDecision,
    overallScore,
    timestamp: new Date().toISOString(),
  };
}

function calculateConfidence(textAnalysis?: any, imageAnalysis?: any): number {
  const confidenceScores: number[] = [];

  if (textAnalysis?.confidence !== undefined) {
    confidenceScores.push(textAnalysis.confidence);
  }

  if (imageAnalysis?.confidence !== undefined) {
    confidenceScores.push(imageAnalysis.confidence);
  }

  if (confidenceScores.length === 0) {
    return 0; // No analysis available
  }

  // Return the lowest confidence score (most conservative approach)
  return Math.min(...confidenceScores);
}
