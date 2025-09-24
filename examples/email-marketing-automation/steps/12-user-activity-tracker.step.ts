import { EventConfig, Handlers } from "motia";
import { z } from "zod";

interface UserActivity {
  id: string;
  userId: string;
  email: string;
  activityType: string;
  timestamp: string;
  data: any;
  source: string;
  sessionId?: string;
}

interface UserBehaviorProfile {
  userId: string;
  email: string;
  lastActiveDate: string;
  activityCount: number;
  behaviorScore: number;
  engagementLevel: "low" | "medium" | "high";
  triggers: {
    cartAbandonment: boolean;
    inactivity: boolean;
    highEngagement: boolean;
    purchaseReady: boolean;
  };
  activities: {
    pageViews: number;
    emailOpens: number;
    emailClicks: number;
    purchases: number;
    lastPurchaseDate?: string;
    averageSessionDuration: number;
  };
  updatedAt: string;
}

export const config: EventConfig = {
  type: "event",
  name: "UserActivityTracker",
  description: "Tracks user activities and triggers behavioral email campaigns",
  flows: ["email-automation"],
  subscribes: [
    "user-activity",
    "email-opened",
    "email-clicked",
    "page-viewed",
    "purchase-completed",
    "cart-abandoned",
  ],
  emits: [
    "behavior-trigger",
    "engagement-score-updated",
    "user-segment-changed",
  ],
  input: z.object({
    userId: z.string(),
    email: z.string().email(),
    activityType: z.string(),
    timestamp: z.string(),
    data: z.any().optional(),
    source: z.string().default("website"),
    sessionId: z.string().optional(),
  }),
};

export const handler: Handlers["UserActivityTracker"] = async (
  input,
  { traceId, logger, state, emit }
) => {
  logger.info("Step 12 – Processing user activity", {
    userId: input.userId,
    activityType: input.activityType,
    source: input.source,
  });

  try {
    const activityId = `activity_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create activity record
    const activity: UserActivity = {
      id: activityId,
      userId: input.userId,
      email: input.email,
      activityType: input.activityType,
      timestamp: input.timestamp,
      data: input.data || {},
      source: input.source || "website",
      sessionId: input.sessionId,
    };

    // Store activity
    await state.set("user_activities", activityId, activity);

    // Get or create user behavior profile
    let behaviorProfile = await state.get<UserBehaviorProfile>(
      "user_behavior_profiles",
      input.userId
    );
    if (!behaviorProfile) {
      behaviorProfile = createInitialBehaviorProfile(input.userId, input.email);
    }

    // Update behavior profile based on activity
    const updatedProfile = await updateBehaviorProfile(
      behaviorProfile as UserBehaviorProfile,
      activity,
      state,
      logger
    );

    // Check for behavioral triggers
    const triggers = await checkBehavioralTriggers(
      updatedProfile,
      activity,
      state,
      logger
    );

    // Emit triggers if any
    for (const trigger of triggers) {
      await emit({
        topic: "behavior-trigger",
        data: trigger,
      });
    }

    // Check if engagement level changed
    if (updatedProfile.engagementLevel !== behaviorProfile.engagementLevel) {
      await (emit as any)({
        topic: "user-segment-changed",
        data: {
          userId: input.userId,
          email: input.email,
          oldSegment: behaviorProfile.engagementLevel,
          newSegment: updatedProfile.engagementLevel,
          changedAt: new Date().toISOString(),
        },
      });

      logger.info("User engagement level changed", {
        userId: input.userId,
        oldLevel: behaviorProfile.engagementLevel,
        newLevel: updatedProfile.engagementLevel,
      });
    }

    // Emit engagement score update
    await (emit as any)({
      topic: "engagement-score-updated",
      data: {
        userId: input.userId,
        email: input.email,
        score: updatedProfile.behaviorScore,
        engagementLevel: updatedProfile.engagementLevel,
        activityType: input.activityType,
        updatedAt: updatedProfile.updatedAt,
      },
    });

    // Store updated profile
    await state.set("user_behavior_profiles", input.userId, updatedProfile);

    logger.info("User activity processed successfully", {
      userId: input.userId,
      activityType: input.activityType,
      engagementLevel: updatedProfile.engagementLevel,
      behaviorScore: updatedProfile.behaviorScore,
      triggersCount: triggers.length,
    });
  } catch (error) {
    logger.error("User activity tracking failed", {
      userId: input.userId,
      activityType: input.activityType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

function createInitialBehaviorProfile(
  userId: string,
  email: string
): UserBehaviorProfile {
  return {
    userId,
    email,
    lastActiveDate: new Date().toISOString(),
    activityCount: 0,
    behaviorScore: 0,
    engagementLevel: "low",
    triggers: {
      cartAbandonment: false,
      inactivity: false,
      highEngagement: false,
      purchaseReady: false,
    },
    activities: {
      pageViews: 0,
      emailOpens: 0,
      emailClicks: 0,
      purchases: 0,
      averageSessionDuration: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function updateBehaviorProfile(
  profile: UserBehaviorProfile,
  activity: UserActivity,
  state: any,
  logger: any
): Promise<UserBehaviorProfile> {
  const updatedProfile = { ...profile };
  updatedProfile.lastActiveDate = activity.timestamp;
  updatedProfile.activityCount++;
  updatedProfile.updatedAt = new Date().toISOString();

  // Update activity counts based on type
  switch (activity.activityType) {
    case "page-viewed":
      updatedProfile.activities.pageViews++;
      updatedProfile.behaviorScore += 1;
      break;

    case "email-opened":
      updatedProfile.activities.emailOpens++;
      updatedProfile.behaviorScore += 3;
      break;

    case "email-clicked":
      updatedProfile.activities.emailClicks++;
      updatedProfile.behaviorScore += 5;
      break;

    case "purchase-completed":
      updatedProfile.activities.purchases++;
      updatedProfile.activities.lastPurchaseDate = activity.timestamp;
      updatedProfile.behaviorScore += 20;
      // Reset cart abandonment trigger after purchase
      updatedProfile.triggers.cartAbandonment = false;
      break;

    case "cart-abandoned":
      updatedProfile.triggers.cartAbandonment = true;
      updatedProfile.behaviorScore -= 2;
      break;

    case "product-viewed":
      updatedProfile.behaviorScore += 2;
      break;

    case "search-performed":
      updatedProfile.behaviorScore += 1;
      break;

    case "video-watched":
      updatedProfile.behaviorScore += 4;
      break;

    case "download-completed":
      updatedProfile.behaviorScore += 6;
      break;
  }

  // Calculate engagement level based on score
  if (updatedProfile.behaviorScore >= 50) {
    updatedProfile.engagementLevel = "high";
  } else if (updatedProfile.behaviorScore >= 20) {
    updatedProfile.engagementLevel = "medium";
  } else {
    updatedProfile.engagementLevel = "low";
  }

  // Check for high engagement trigger
  if (
    updatedProfile.behaviorScore >= 50 &&
    !updatedProfile.triggers.highEngagement
  ) {
    updatedProfile.triggers.highEngagement = true;
  }

  // Check for purchase readiness (high activity without recent purchase)
  const hasRecentActivity =
    updatedProfile.activities.pageViews > 10 ||
    updatedProfile.activities.emailClicks > 3;
  const noRecentPurchase =
    !updatedProfile.activities.lastPurchaseDate ||
    new Date().getTime() -
      new Date(updatedProfile.activities.lastPurchaseDate).getTime() >
      30 * 24 * 60 * 60 * 1000;

  if (
    hasRecentActivity &&
    noRecentPurchase &&
    !updatedProfile.triggers.purchaseReady
  ) {
    updatedProfile.triggers.purchaseReady = true;
  }

  return updatedProfile;
}

async function checkBehavioralTriggers(
  profile: UserBehaviorProfile,
  activity: UserActivity,
  state: any,
  logger: any
): Promise<any[]> {
  const triggers = [];

  try {
    // Cart abandonment trigger
    if (
      profile.triggers.cartAbandonment &&
      activity.activityType === "cart-abandoned"
    ) {
      triggers.push({
        type: "cart_abandonment",
        userId: profile.userId,
        email: profile.email,
        triggeredAt: new Date().toISOString(),
        data: {
          cartData: activity.data,
          lastActiveDate: profile.lastActiveDate,
        },
      });

      logger.info("Cart abandonment trigger activated", {
        userId: profile.userId,
      });
    }

    // Inactivity trigger (no activity for 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const lastActive = new Date(profile.lastActiveDate);

    if (lastActive < sevenDaysAgo && !profile.triggers.inactivity) {
      profile.triggers.inactivity = true;
      triggers.push({
        type: "inactivity",
        userId: profile.userId,
        email: profile.email,
        triggeredAt: new Date().toISOString(),
        data: {
          daysSinceLastActivity: Math.floor(
            (Date.now() - lastActive.getTime()) / (24 * 60 * 60 * 1000)
          ),
          lastActivityType: activity.activityType,
        },
      });

      logger.info("Inactivity trigger activated", { userId: profile.userId });
    }

    // High engagement trigger
    if (profile.triggers.highEngagement && profile.behaviorScore >= 50) {
      triggers.push({
        type: "high_engagement",
        userId: profile.userId,
        email: profile.email,
        triggeredAt: new Date().toISOString(),
        data: {
          behaviorScore: profile.behaviorScore,
          engagementLevel: profile.engagementLevel,
          recentActivities: await getRecentActivities(profile.userId, state),
        },
      });

      // Reset trigger to avoid spam
      profile.triggers.highEngagement = false;
      logger.info("High engagement trigger activated", {
        userId: profile.userId,
      });
    }

    // Purchase ready trigger
    if (profile.triggers.purchaseReady) {
      triggers.push({
        type: "purchase_ready",
        userId: profile.userId,
        email: profile.email,
        triggeredAt: new Date().toISOString(),
        data: {
          behaviorScore: profile.behaviorScore,
          pageViews: profile.activities.pageViews,
          emailClicks: profile.activities.emailClicks,
          daysSinceLastPurchase: profile.activities.lastPurchaseDate
            ? Math.floor(
                (Date.now() -
                  new Date(profile.activities.lastPurchaseDate).getTime()) /
                  (24 * 60 * 60 * 1000)
              )
            : null,
        },
      });

      // Reset trigger
      profile.triggers.purchaseReady = false;
      logger.info("Purchase ready trigger activated", {
        userId: profile.userId,
      });
    }

    // Welcome sequence progression (for new users)
    if (
      activity.activityType === "email-opened" ||
      activity.activityType === "email-clicked"
    ) {
      const welcomeSequence = await state.get(
        "welcome_sequences",
        profile.userId
      );
      if (
        welcomeSequence &&
        !welcomeSequence.completed &&
        welcomeSequence.currentStep < welcomeSequence.totalSteps - 1
      ) {
        triggers.push({
          type: "welcome_sequence_progression",
          userId: profile.userId,
          email: profile.email,
          triggeredAt: new Date().toISOString(),
          data: {
            currentStep: welcomeSequence.currentStep,
            totalSteps: welcomeSequence.totalSteps,
            activityType: activity.activityType,
          },
        });

        logger.info("Welcome sequence progression triggered", {
          userId: profile.userId,
          currentStep: welcomeSequence.currentStep,
        });
      }
    }
  } catch (error) {
    logger.error("Error checking behavioral triggers", {
      userId: profile.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return triggers;
}

async function getRecentActivities(
  userId: string,
  state: any
): Promise<UserActivity[]> {
  try {
    const activities = await state.getGroup("user_activities");
    const userActivities = activities.filter(
      (activity: any) => activity.userId === userId
    );

    // Return last 10 activities, sorted by timestamp descending
    return userActivities
      .sort(
        (a: UserActivity, b: UserActivity) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);
  } catch (error) {
    return [];
  }
}
