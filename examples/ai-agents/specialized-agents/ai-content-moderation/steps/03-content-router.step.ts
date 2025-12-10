import { z } from "zod";
import { EventConfig, Handlers } from "motia";

const ContentRouterInputSchema = z.object({
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
});

export const config: EventConfig = {
  type: "event",
  name: "ContentRouter",
  description:
    "Routes content based on confidence scores - auto-action or human review",
  subscribes: ["content.analyzed"],
  emits: ["content.needsReview"],
  input: ContentRouterInputSchema,
  flows: ["content-moderation"],
};

export const handler: Handlers["ContentRouter"] = async (
  input,
  { logger, emit }
) => {
  const {
    submissionId,
    textAnalysis,
    imageAnalysis,
    overallScore,
    recommendation,
    timestamp,
    error,
  } = input;

  logger.info(`Routing content decision`, {
    submissionId,
    recommendation,
    overallScore,
  });

  // If there was an error in analysis, always send to human review
  if (error) {
    logger.warn(`Analysis error - routing to human review`, {
      submissionId,
      error,
    });

    await emit({
      topic: "content.needsReview",
      data: {
        submissionId,
        decision: "review",
        confidence: 0,
        reason: `Analysis failed: ${error}`,
        autoDecision: false,
        overallScore: 0,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Determine confidence level and decision
  let decision: string;
  let confidence: number;
  let reason: string;
  let autoDecision: boolean;

  // High confidence decisions (>85%) - auto-approve or auto-reject
  //   if (overallScore <= 0.15) {
  //     decision = "approved";
  //     confidence = 1 - overallScore; // High confidence for clean content
  //     reason = "Clean content - automatically approved";
  //     autoDecision = true;
  //   } else if (overallScore >= 0.85) {
  //     decision = "rejected";
  //     confidence = overallScore; // High confidence for toxic content
  //     reason = getReasonFromAnalysis(textAnalysis, imageAnalysis);
  //     autoDecision = true;
  //   } else {
  //     // Medium confidence (15-85%) - send to human review
  //     decision = "review";
  //     confidence = Math.abs(0.5 - overallScore) * 2; // Confidence in need for review
  //     reason = `Uncertain content (score: ${overallScore.toFixed(
  //       2
  //     )}) - requires human review`;
  //     autoDecision = false;
  //   }

  // More lenient thresholds to test image display
  if (overallScore <= 0.05) {
    decision = "approved";
    confidence = 1 - overallScore;
    reason = "Clean content - automatically approved";
    autoDecision = true;
  } else if (overallScore >= 0.95) {
    decision = "rejected";
    confidence = overallScore;
    reason = getReasonFromAnalysis(textAnalysis, imageAnalysis);
    autoDecision = true;
  } else {
    // Most content goes to human review
    decision = "review";
    confidence = Math.abs(0.5 - overallScore) * 2;
    reason = `Uncertain content (score: ${overallScore.toFixed(
      2
    )}) - requires human review`;
    autoDecision = false;
  }

  await emit({
    topic: "content.needsReview",
    data: {
      submissionId,
      decision,
      confidence,
      reason,
      autoDecision,
      overallScore,
      timestamp: new Date().toISOString(),
    },
  });

  logger.info(`Content routed`, {
    submissionId,
    decision,
    autoDecision,
    confidence: confidence.toFixed(2),
  });
};

function getReasonFromAnalysis(
  textAnalysis?: { categories: string[] },
  imageAnalysis?: { categories: string[] }
): string {
  const reasons: string[] = [];

  if (textAnalysis?.categories.length) {
    reasons.push(`Text: ${textAnalysis.categories.join(", ")}`);
  }

  if (imageAnalysis?.categories.length) {
    reasons.push(`Image: ${imageAnalysis.categories.join(", ")}`);
  }

  return reasons.length > 0
    ? `High-risk content detected - ${reasons.join("; ")}`
    : "High-risk content detected";
}
