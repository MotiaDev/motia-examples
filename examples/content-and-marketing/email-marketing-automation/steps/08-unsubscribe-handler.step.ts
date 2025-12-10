import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

interface UnsubscribeRequest {
  token: string;
  userId: string;
  email: string;
  campaignId?: string;
  reason?: string;
  feedback?: string;
}

interface UnsubscribeRecord {
  id: string;
  userId: string;
  email: string;
  campaignId?: string;
  unsubscribedAt: string;
  reason: string;
  feedback?: string;
  ipAddress: string;
  userAgent: string;
  method: "one_click" | "preference_center" | "email_reply";
  token: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  preferences: {
    emailMarketing: boolean;
    frequency: string;
    categories: string[];
  };
  metadata: {
    lastActiveDate: string;
    unsubscribedAt?: string;
  };
}

export const config: ApiRouteConfig = {
  type: "api",
  name: "UnsubscribeHandler",
  description:
    "Handles one-click unsubscribe requests and displays unsubscribe confirmation",
  flows: ["email-automation"],

  method: "GET",
  path: "/unsubscribe",
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      unsubscribed: z.boolean(),
      email: z.string().optional(),
      confirmationRequired: z.boolean().optional(),
      unsubscribeId: z.string().optional(),
    }),
    400: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
  emits: [],
};

export const handler: Handlers["UnsubscribeHandler"] = async (
  req,
  { logger, traceId, emit, state }
) => {
  const { token, reason, feedback, confirm } = req.queryParams;
  const userAgent =
    (Array.isArray(req.headers["user-agent"])
      ? req.headers["user-agent"][0]
      : req.headers["user-agent"]) || "Unknown";
  const ipAddress =
    (Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"]) ||
    (Array.isArray(req.headers["x-real-ip"])
      ? req.headers["x-real-ip"][0]
      : req.headers["x-real-ip"]) ||
    "Unknown";

  // Ensure token is a string
  const tokenStr = Array.isArray(token) ? token[0] : token;
  const reasonStr = Array.isArray(reason) ? reason[0] : reason;
  const feedbackStr = Array.isArray(feedback) ? feedback[0] : feedback;
  const confirmStr = Array.isArray(confirm) ? confirm[0] : confirm;

  logger.info("Step 08 – Processing unsubscribe request", {
    token: tokenStr ? tokenStr.substring(0, 20) + "..." : "none",
    reason: reasonStr,
    confirm: confirmStr,
    ipAddress,
  });

  try {
    // Validate required query parameters
    if (!tokenStr || tokenStr.trim() === "") {
      return {
        status: 400,
        body: {
          success: false,
          error: "Unsubscribe token is required",
        },
      };
    }

    // Validate reason if provided
    if (
      reasonStr &&
      ![
        "not_interested",
        "too_frequent",
        "irrelevant",
        "never_subscribed",
        "other",
      ].includes(reasonStr)
    ) {
      return {
        status: 400,
        body: {
          success: false,
          error: "Invalid reason provided",
        },
      };
    }

    // Validate feedback length if provided
    if (feedbackStr && feedbackStr.length > 500) {
      return {
        status: 400,
        body: {
          success: false,
          error: "Feedback must be 500 characters or less",
        },
      };
    }

    // Decode and validate token
    const tokenData = await validateAndDecodeToken(tokenStr, state, logger);
    if (!tokenData) {
      return {
        status: 400,
        body: {
          success: false,
          error: "Invalid or expired unsubscribe token",
        },
      };
    }

    const { userId, email, campaignId, emailId } = tokenData;

    // Get user data
    const user = await state.get<User>("users", userId);
    if (!user) {
      logger.warn("User not found for unsubscribe", { userId, email });
      return {
        status: 400,
        body: {
          success: false,
          error: "User not found",
        },
      };
    }

    // Check if already unsubscribed
    if (!user.preferences.emailMarketing) {
      logger.info("User already unsubscribed", { userId, email });
      return {
        status: 200,
        body: {
          success: true,
          message: "You are already unsubscribed from our emails",
          unsubscribed: true,
          email,
          confirmationRequired: false,
        },
      };
    }

    // If no confirmation yet, require confirmation
    if (confirmStr !== "true") {
      logger.info("Unsubscribe confirmation required", { userId, email });
      return {
        status: 200,
        body: {
          success: true,
          message: "Please confirm your unsubscribe request",
          unsubscribed: false,
          email,
          confirmationRequired: true,
        },
      };
    }

    // Generate unsubscribe ID
    const unsubscribeId = `unsub_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Create unsubscribe record
    const unsubscribeRecord: UnsubscribeRecord = {
      id: unsubscribeId,
      userId,
      email,
      campaignId,
      unsubscribedAt: new Date().toISOString(),
      reason: reasonStr || "not_specified",
      feedback: feedbackStr,
      ipAddress,
      userAgent,
      method: "one_click",
      token: tokenStr,
    };

    // Store unsubscribe record
    await state.set("unsubscribe_records", unsubscribeId, unsubscribeRecord);

    // Update user preferences
    user.preferences.emailMarketing = false;
    user.metadata.unsubscribedAt = unsubscribeRecord.unsubscribedAt;
    user.metadata.lastActiveDate = unsubscribeRecord.unsubscribedAt;
    await state.set("users", userId, user);

    // Cancel active email sequences
    await cancelActiveSequences(userId, state, logger);

    // Update segmentation counters
    await updateUnsubscribeMetrics(campaignId, reasonStr, state, logger);

    // Log for compliance
    await logComplianceEvent(unsubscribeRecord, state, emit, logger);

    logger.info("User successfully unsubscribed", {
      unsubscribeId,
      userId,
      email,
      reason: reasonStr,
      campaignId,
    });

    return {
      status: 200,
      body: {
        success: true,
        message: `You have been successfully unsubscribed from our emails. We respect your decision and will not send you any more marketing emails.`,
        unsubscribed: true,
        email,
        unsubscribeId,
      },
    };
  } catch (error) {
    logger.error("Unsubscribe processing failed", {
      token: tokenStr ? tokenStr.substring(0, 20) + "..." : "none",
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 400,
      body: {
        success: false,
        error: "Failed to process unsubscribe request",
      },
    };
  }
};

async function validateAndDecodeToken(
  token: string,
  state: any,
  logger: any
): Promise<{
  userId: string;
  email: string;
  campaignId?: string;
  emailId?: string;
} | null> {
  try {
    // In real implementation, this would be a signed JWT or encrypted token
    // For demo, we'll use a simple format: unsubscribe_{userId}_{campaignId}_{timestamp}_{hash}
    const parts = token.split("_");

    if (parts.length < 4 || parts[0] !== "unsubscribe") {
      logger.warn("Invalid token format", {
        token: token.substring(0, 20) + "...",
      });
      return null;
    }

    const userId = parts[1];
    const campaignId = parts[2] !== "null" ? parts[2] : undefined;
    const timestamp = parseInt(parts[3]);

    // Check token age (valid for 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (timestamp < thirtyDaysAgo) {
      logger.warn("Expired unsubscribe token", { userId, timestamp });
      return null;
    }

    // Get user to validate email
    const user = await state.get("users", userId);
    if (!user) {
      logger.warn("User not found for token validation", { userId });
      return null;
    }

    return {
      userId,
      email: user.email,
      campaignId,
    };
  } catch (error) {
    logger.error("Token validation failed", { error });
    return null;
  }
}

async function cancelActiveSequences(userId: string, state: any, logger: any) {
  try {
    // Cancel welcome sequence
    const welcomeSequence = await state.get("welcome_sequences", userId);
    if (welcomeSequence && !welcomeSequence.completed) {
      welcomeSequence.completed = true;
      welcomeSequence.cancelledAt = new Date().toISOString();
      welcomeSequence.cancelReason = "user_unsubscribed";
      await state.set("welcome_sequences", userId, welcomeSequence);
      logger.info("Welcome sequence cancelled", { userId });
    }

    // Cancel any active behavioral sequences
    const behavioralSequences =
      (await state.getGroup("behavioral_sequences")) || [];
    for (const sequence of behavioralSequences) {
      if (sequence.userId === userId && sequence.status === "active") {
        sequence.status = "cancelled";
        sequence.cancelledAt = new Date().toISOString();
        sequence.cancelReason = "user_unsubscribed";
        await state.set("behavioral_sequences", sequence.id, sequence);
        logger.info("Behavioral sequence cancelled", {
          userId,
          sequenceId: sequence.id,
        });
      }
    }
  } catch (error) {
    logger.error("Failed to cancel sequences", { userId, error });
  }
}

async function updateUnsubscribeMetrics(
  campaignId: string | undefined,
  reason: string | undefined,
  state: any,
  logger: any
) {
  try {
    // Update global unsubscribe metrics
    const today = new Date().toISOString().split("T")[0];
    let dailyMetrics = (await state.get(
      "daily_unsubscribe_metrics",
      today
    )) || {
      date: today,
      total: 0,
      by_reason: {},
      by_campaign: {},
    };

    dailyMetrics.total++;

    // Track by reason
    if (reason) {
      dailyMetrics.by_reason[reason] =
        (dailyMetrics.by_reason[reason] || 0) + 1;
    }

    // Track by campaign
    if (campaignId) {
      dailyMetrics.by_campaign[campaignId] =
        (dailyMetrics.by_campaign[campaignId] || 0) + 1;
    }

    await state.set("daily_unsubscribe_metrics", today, dailyMetrics);

    // Update campaign-specific metrics if applicable
    if (campaignId) {
      const campaignAnalytics = await state.get(
        "campaign_analytics",
        campaignId
      );
      if (campaignAnalytics) {
        campaignAnalytics.unsubscribed =
          (campaignAnalytics.unsubscribed || 0) + 1;
        campaignAnalytics.unsubscribeRate =
          (campaignAnalytics.unsubscribed / campaignAnalytics.delivered) * 100;
        await state.set("campaign_analytics", campaignId, campaignAnalytics);
      }
    }

    logger.info("Unsubscribe metrics updated", {
      campaignId,
      reason,
      dailyTotal: dailyMetrics.total,
    });
  } catch (error) {
    logger.error("Failed to update unsubscribe metrics", { error });
  }
}

async function logComplianceEvent(
  record: UnsubscribeRecord,
  state: any,
  emit: any,
  logger: any
) {
  try {
    // Store compliance log
    const complianceLog = {
      type: "unsubscribe",
      eventId: record.id,
      userId: record.userId,
      email: record.email,
      timestamp: record.unsubscribedAt,
      method: record.method,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      details: {
        reason: record.reason,
        feedback: record.feedback,
        campaignId: record.campaignId,
      },
    };

    await state.set("compliance_logs", record.id, complianceLog);

    logger.info("Compliance event logged", {
      type: "unsubscribe",
      userId: record.userId,
      email: record.email,
    });
  } catch (error) {
    logger.error("Failed to log compliance event", { error });
  }
}
