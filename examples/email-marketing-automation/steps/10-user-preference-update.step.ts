import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

interface UserPreferences {
  emailMarketing: boolean;
  frequency: "daily" | "weekly" | "monthly";
  categories: string[];
  timezone?: string;
  language?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  preferences: UserPreferences;
  metadata: {
    signupDate: string;
    lastActiveDate: string;
    totalPurchases: number;
    vipStatus: boolean;
    welcomeEmailSent: boolean;
    lastPreferenceUpdate?: string;
  };
}

interface PreferenceChangeLog {
  userId: string;
  field: string;
  oldValue: any;
  newValue: any;
  changedAt: string;
  source: string;
  ipAddress?: string;
  userAgent?: string;
}

export const config: ApiRouteConfig = {
  type: "api",
  name: "UserPreferenceUpdate",
  description: "Updates user email preferences and communication settings",
  flows: ["email-automation"],

  method: "PUT",
  path: "/users/:userId/preferences",
  bodySchema: z.object({
    emailMarketing: z.boolean().optional(),
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    categories: z.array(z.string()).optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    unsubscribeToken: z.string().optional(), // For unsubscribe links
  }),
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      userId: z.string(),
      preferences: z.object({
        emailMarketing: z.boolean(),
        frequency: z.string(),
        categories: z.array(z.string()),
        timezone: z.string().optional(),
        language: z.string().optional(),
      }),
      updatedAt: z.string(),
    }),
    400: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
    404: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
  emits: ["user-preferences-updated", "user-unsubscribed", "compliance-log"],
};

export const handler: Handlers["UserPreferenceUpdate"] = async (
  req,
  { logger, traceId, emit, state }
) => {
  const userId = req.pathParams.userId;
  const updates = req.body;
  const userAgent = Array.isArray(req.headers["user-agent"])
    ? req.headers["user-agent"][0]
    : req.headers["user-agent"] || "Unknown";
  const ipAddress = Array.isArray(req.headers["x-forwarded-for"])
    ? req.headers["x-forwarded-for"][0]
    : req.headers["x-forwarded-for"] ||
      (Array.isArray(req.headers["x-real-ip"])
        ? req.headers["x-real-ip"][0]
        : req.headers["x-real-ip"]) ||
      "Unknown";

  logger.info("Step 10 – Processing user preference update", {
    userId,
    updates: Object.keys(updates),
    source: updates.unsubscribeToken ? "unsubscribe_link" : "user_dashboard",
  });

  try {
    // Get existing user
    const user = await state.get<User>("users", userId);
    if (!user) {
      logger.warn("User not found for preference update", { userId });
      return {
        status: 404,
        body: {
          success: false,
          error: "User not found",
        },
      };
    }

    // Validate unsubscribe token if provided
    if (updates.unsubscribeToken) {
      const isValidToken = await validateUnsubscribeToken(
        userId,
        updates.unsubscribeToken,
        state,
        logger
      );
      if (!isValidToken) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Invalid unsubscribe token",
          },
        };
      }
    }

    // Store original preferences for change tracking
    const originalPreferences = { ...user.preferences };

    // Apply updates
    const updatedPreferences = { ...user.preferences };
    const changes: PreferenceChangeLog[] = [];

    if (updates.emailMarketing !== undefined) {
      if (originalPreferences.emailMarketing !== updates.emailMarketing) {
        changes.push(
          createChangeLog(
            userId,
            "emailMarketing",
            originalPreferences.emailMarketing,
            updates.emailMarketing,
            updates.unsubscribeToken ? "unsubscribe_link" : "user_dashboard",
            ipAddress,
            userAgent
          )
        );
        updatedPreferences.emailMarketing = updates.emailMarketing;
      }
    }

    if (updates.frequency !== undefined) {
      if (originalPreferences.frequency !== updates.frequency) {
        changes.push(
          createChangeLog(
            userId,
            "frequency",
            originalPreferences.frequency,
            updates.frequency,
            "user_dashboard",
            ipAddress,
            userAgent
          )
        );
        updatedPreferences.frequency = updates.frequency;
      }
    }

    if (updates.categories !== undefined) {
      const oldCategories = JSON.stringify(
        originalPreferences.categories || []
      );
      const newCategories = JSON.stringify(updates.categories);
      if (oldCategories !== newCategories) {
        changes.push(
          createChangeLog(
            userId,
            "categories",
            originalPreferences.categories,
            updates.categories,
            "user_dashboard",
            ipAddress,
            userAgent
          )
        );
        updatedPreferences.categories = updates.categories;
      }
    }

    if (updates.timezone !== undefined) {
      if (originalPreferences.timezone !== updates.timezone) {
        changes.push(
          createChangeLog(
            userId,
            "timezone",
            originalPreferences.timezone,
            updates.timezone,
            "user_dashboard",
            ipAddress,
            userAgent
          )
        );
        updatedPreferences.timezone = updates.timezone;
      }
    }

    if (updates.language !== undefined) {
      if (originalPreferences.language !== updates.language) {
        changes.push(
          createChangeLog(
            userId,
            "language",
            originalPreferences.language,
            updates.language,
            "user_dashboard",
            ipAddress,
            userAgent
          )
        );
        updatedPreferences.language = updates.language;
      }
    }

    // Update user record
    user.preferences = updatedPreferences;
    user.metadata.lastPreferenceUpdate = new Date().toISOString();
    user.metadata.lastActiveDate = new Date().toISOString();

    // Save updated user
    await state.set("users", userId, user);

    // Log all preference changes
    for (const change of changes) {
      await state.set(
        "preference_change_logs",
        `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        change
      );
    }

    // Update user segmentation if email marketing status changed
    if (changes.some((change) => change.field === "emailMarketing")) {
      await updateUserSegmentation(
        userId,
        updatedPreferences.emailMarketing,
        state,
        logger
      );
    }

    // Handle unsubscribe specifically
    if (
      updates.emailMarketing === false &&
      originalPreferences.emailMarketing === true
    ) {
      await handleUnsubscribe(user, changes, state, emit, logger);
    }

    // Emit preference update event
    await (emit as any)({
      topic: "user-preferences-updated",
      data: {
        userId,
        email: user.email,
        changes,
        preferences: updatedPreferences,
        updatedAt: user.metadata.lastPreferenceUpdate,
        source: updates.unsubscribeToken
          ? "unsubscribe_link"
          : "user_dashboard",
      },
    });

    // Log for compliance (GDPR, CAN-SPAM, etc.)
    if (changes.length > 0) {
      await (emit as any)({
        topic: "compliance-log",
        data: {
          type: "preference_update",
          userId,
          email: user.email,
          changes,
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString(),
          source: updates.unsubscribeToken
            ? "unsubscribe_link"
            : "user_dashboard",
        },
      });
    }

    logger.info("User preferences updated successfully", {
      userId,
      email: user.email,
      changesCount: changes.length,
      emailMarketing: updatedPreferences.emailMarketing,
    });

    return {
      status: 200,
      body: {
        success: true,
        message: "Preferences updated successfully",
        userId,
        preferences: {
          emailMarketing: updatedPreferences.emailMarketing,
          frequency: updatedPreferences.frequency,
          categories: updatedPreferences.categories || [],
          timezone: updatedPreferences.timezone,
          language: updatedPreferences.language,
        },
        updatedAt: user.metadata.lastPreferenceUpdate!,
      },
    };
  } catch (error) {
    logger.error("User preference update failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 400,
      body: {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update preferences",
      },
    };
  }
};

function createChangeLog(
  userId: string,
  field: string,
  oldValue: any,
  newValue: any,
  source: string,
  ipAddress: string,
  userAgent: string
): PreferenceChangeLog {
  return {
    userId,
    field,
    oldValue,
    newValue,
    changedAt: new Date().toISOString(),
    source,
    ipAddress,
    userAgent,
  };
}

async function validateUnsubscribeToken(
  userId: string,
  token: string,
  state: any,
  logger: any
): Promise<boolean> {
  try {
    // In real implementation, this would validate a JWT or database token
    // For demo, we'll accept tokens that start with userId
    const expectedTokenPrefix = `unsubscribe_${userId}_`;
    const isValid = token.startsWith(expectedTokenPrefix);

    logger.info("Unsubscribe token validation", {
      userId,
      tokenValid: isValid,
    });

    return isValid;
  } catch (error) {
    logger.error("Token validation failed", { userId, error });
    return false;
  }
}

async function updateUserSegmentation(
  userId: string,
  emailMarketing: boolean,
  state: any,
  logger: any
) {
  try {
    // Get current segment counts
    let segmentCounts = (await state.get("user_segment_counts", "global")) || {
      total: 0,
      emailOptedIn: 0,
      emailOptedOut: 0,
      last_updated: new Date().toISOString(),
    };

    if (emailMarketing) {
      segmentCounts.emailOptedIn++;
      segmentCounts.emailOptedOut = Math.max(
        0,
        segmentCounts.emailOptedOut - 1
      );
    } else {
      segmentCounts.emailOptedOut++;
      segmentCounts.emailOptedIn = Math.max(0, segmentCounts.emailOptedIn - 1);
    }

    segmentCounts.last_updated = new Date().toISOString();

    // Save updated counts
    await state.set("user_segment_counts", "global", segmentCounts);

    logger.info("User segmentation updated", {
      userId,
      emailMarketing,
      optedIn: segmentCounts.emailOptedIn,
      optedOut: segmentCounts.emailOptedOut,
    });
  } catch (error) {
    logger.error("Failed to update user segmentation", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleUnsubscribe(
  user: User,
  changes: PreferenceChangeLog[],
  state: any,
  emit: any,
  logger: any
) {
  try {
    // Store unsubscribe record
    const unsubscribeRecord = {
      userId: user.id,
      email: user.email,
      unsubscribedAt: new Date().toISOString(),
      reason: "user_request",
      changes,
    };

    await state.set("unsubscribe_records", user.id, unsubscribeRecord);

    // Cancel any active email sequences for this user
    await cancelActiveSequences(user.id, state, logger);

    // Emit unsubscribe event
    await emit({
      topic: "user-unsubscribed",
      data: {
        userId: user.id,
        email: user.email,
        unsubscribedAt: unsubscribeRecord.unsubscribedAt,
        reason: unsubscribeRecord.reason,
      },
    });

    logger.info("User unsubscribe processed", {
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    logger.error("Failed to handle unsubscribe", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function cancelActiveSequences(userId: string, state: any, logger: any) {
  try {
    // Cancel welcome sequence if active
    const welcomeSequence = await state.get("welcome_sequences", userId);
    if (welcomeSequence && !welcomeSequence.completed) {
      welcomeSequence.completed = true;
      welcomeSequence.cancelledAt = new Date().toISOString();
      welcomeSequence.cancelReason = "user_unsubscribed";
      await state.set("welcome_sequences", userId, welcomeSequence);

      logger.info("Welcome sequence cancelled due to unsubscribe", { userId });
    }

    // Cancel any other active sequences
    // In a real implementation, you'd query for all active sequences for this user
  } catch (error) {
    logger.error("Failed to cancel active sequences", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
