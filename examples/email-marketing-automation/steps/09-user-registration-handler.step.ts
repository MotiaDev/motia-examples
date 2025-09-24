import { EventConfig, Handlers } from "motia";
import { z } from "zod";

interface NewUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  source: string;
  registeredAt: string;
  preferences: {
    emailMarketing: boolean;
    frequency: "daily" | "weekly" | "monthly";
  };
  metadata: {
    signupDate: string;
    lastActiveDate: string;
    totalPurchases: number;
    vipStatus: boolean;
    welcomeEmailSent: boolean;
  };
}

interface WelcomeEmailSequence {
  userId: string;
  email: string;
  currentStep: number;
  totalSteps: number;
  nextEmailAt: string;
  completed: boolean;
  startedAt: string;
}

export const config: EventConfig = {
  type: "event",
  name: "UserRegistrationHandler",
  description:
    "Processes new user registrations and triggers welcome email sequences",
  flows: ["email-automation"],
  subscribes: ["user-registered"],
  emits: [
    "welcome-sequence-started",
    "user-segment-updated",
    "analytics-user-registered",
  ],
  input: z.object({
    userId: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    registeredAt: z.string(),
    source: z.string().default("website"),
    metadata: z.any().optional(),
  }),
};

export const handler: Handlers["UserRegistrationHandler"] = async (
  input,
  { traceId, logger, state, emit }
) => {
  logger.info("Step 09 – Processing new user registration", {
    userId: input.userId,
    email: input.email,
    source: input.source,
  });

  try {
    // Parse name if provided as single field
    const { firstName, lastName } = parseUserName(
      input.name,
      input.firstName,
      input.lastName
    );

    // Create comprehensive user profile
    const newUser: NewUser = {
      id: input.userId,
      email: input.email,
      firstName: firstName || "User",
      lastName: lastName || "",
      source: input.source || "website",
      registeredAt: input.registeredAt,
      preferences: {
        emailMarketing: true, // Default opt-in (subject to local laws)
        frequency: "weekly", // Default frequency
      },
      metadata: {
        signupDate: input.registeredAt,
        lastActiveDate: input.registeredAt,
        totalPurchases: 0,
        vipStatus: false,
        welcomeEmailSent: false,
      },
    };

    // Store user profile
    await state.set("users", input.userId, newUser);

    logger.info("User profile created", {
      userId: input.userId,
      email: input.email,
      firstName: newUser.firstName,
      source: newUser.source,
    });

    // Update user segmentation counters
    await updateUserSegments(newUser, state, logger);

    // Start welcome email sequence
    await startWelcomeSequence(newUser, state, emit, logger);

    // Check for referral campaigns
    await checkReferralCampaigns(newUser, state, emit, logger);

    // Update analytics
    await updateRegistrationAnalytics(newUser, state, emit, logger);

    // Check for automated campaigns targeting new users
    await triggerNewUserCampaigns(newUser, state, emit, logger);

    logger.info("User registration processing completed", {
      userId: input.userId,
      email: input.email,
      welcomeSequenceStarted: true,
    });
  } catch (error) {
    logger.error("User registration processing failed", {
      userId: input.userId,
      email: input.email,
      error: error instanceof Error ? error.message : String(error),
    });

    // Store failed registration for retry
    await state.set("failed_registrations", input.userId, {
      ...input,
      error: error instanceof Error ? error.message : String(error),
      failedAt: new Date().toISOString(),
      retryCount: 0,
    });
  }
};

function parseUserName(
  fullName?: string,
  firstName?: string,
  lastName?: string
): { firstName: string; lastName: string } {
  if (firstName && lastName) {
    return { firstName, lastName };
  }

  if (fullName) {
    const parts = fullName.trim().split(" ");
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
    };
  }

  return { firstName: firstName || "", lastName: lastName || "" };
}

async function updateUserSegments(user: NewUser, state: any, logger: any) {
  try {
    // Get current segment counts
    let segmentCounts = (await state.get("user_segment_counts", "global")) || {
      total: 0,
      new_users: 0,
      active_users: 0,
      vip_users: 0,
      by_source: {},
      last_updated: new Date().toISOString(),
    };

    // Update counts
    segmentCounts.total++;
    segmentCounts.new_users++;
    segmentCounts.active_users++;

    // Update source tracking
    if (!segmentCounts.by_source[user.source]) {
      segmentCounts.by_source[user.source] = 0;
    }
    segmentCounts.by_source[user.source]++;

    segmentCounts.last_updated = new Date().toISOString();

    // Save updated counts
    await state.set("user_segment_counts", "global", segmentCounts);

    logger.info("User segment counts updated", {
      userId: user.id,
      totalUsers: segmentCounts.total,
      newUsers: segmentCounts.new_users,
      source: user.source,
    });
  } catch (error) {
    logger.error("Failed to update user segments", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function startWelcomeSequence(
  user: NewUser,
  state: any,
  emit: any,
  logger: any
) {
  try {
    // Define welcome email sequence
    const welcomeSequence: WelcomeEmailSequence = {
      userId: user.id,
      email: user.email,
      currentStep: 0,
      totalSteps: 4, // 4-email welcome sequence
      nextEmailAt: new Date().toISOString(), // Send first email immediately
      completed: false,
      startedAt: new Date().toISOString(),
    };

    // Store welcome sequence state
    await state.set("welcome_sequences", user.id, welcomeSequence);

    // Emit event to trigger first welcome email
    await emit({
      topic: "welcome-sequence-started",
      data: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        sequenceStep: 0,
        emailType: "welcome_immediate",
        personalizeContent: true,
        template: getWelcomeEmailTemplate(0),
        subject: `Welcome to our community, ${user.firstName}!`,
      },
    });

    logger.info("Welcome email sequence started", {
      userId: user.id,
      email: user.email,
      totalSteps: welcomeSequence.totalSteps,
    });
  } catch (error) {
    logger.error("Failed to start welcome sequence", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function checkReferralCampaigns(
  user: NewUser,
  state: any,
  emit: any,
  logger: any
) {
  try {
    // Check if user came from a referral source
    const referralSources = ["friend_referral", "affiliate", "partner"];

    if (referralSources.includes(user.source)) {
      // Trigger referral thank you campaign
      await emit({
        topic: "referral-campaign-trigger",
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          referralSource: user.source,
          registeredAt: user.registeredAt,
        },
      });

      logger.info("Referral campaign triggered", {
        userId: user.id,
        referralSource: user.source,
      });
    }
  } catch (error) {
    logger.error("Failed to check referral campaigns", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function updateRegistrationAnalytics(
  user: NewUser,
  state: any,
  emit: any,
  logger: any
) {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    // Get today's registration analytics
    let dailyAnalytics = (await state.get(
      "daily_registration_analytics",
      today
    )) || {
      date: today,
      total_registrations: 0,
      by_source: {},
      by_hour: {},
      email_domains: {},
    };

    // Update counters
    dailyAnalytics.total_registrations++;

    // By source
    if (!dailyAnalytics.by_source[user.source]) {
      dailyAnalytics.by_source[user.source] = 0;
    }
    dailyAnalytics.by_source[user.source]++;

    // By hour
    const hour = new Date().getHours();
    if (!dailyAnalytics.by_hour[hour]) {
      dailyAnalytics.by_hour[hour] = 0;
    }
    dailyAnalytics.by_hour[hour]++;

    // By email domain
    const emailDomain = user.email.split("@")[1];
    if (!dailyAnalytics.email_domains[emailDomain]) {
      dailyAnalytics.email_domains[emailDomain] = 0;
    }
    dailyAnalytics.email_domains[emailDomain]++;

    // Save updated analytics
    await state.set("daily_registration_analytics", today, dailyAnalytics);

    // Emit analytics event
    await emit({
      topic: "analytics-user-registered",
      data: {
        userId: user.id,
        email: user.email,
        source: user.source,
        registeredAt: user.registeredAt,
        dailyStats: {
          date: today,
          totalToday: dailyAnalytics.total_registrations,
          sourceBreakdown: dailyAnalytics.by_source,
        },
      },
    });

    logger.info("Registration analytics updated", {
      userId: user.id,
      source: user.source,
      totalToday: dailyAnalytics.total_registrations,
    });
  } catch (error) {
    logger.error("Failed to update registration analytics", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function triggerNewUserCampaigns(
  user: NewUser,
  state: any,
  emit: any,
  logger: any
) {
  try {
    // Check for active campaigns targeting new users
    const campaigns = (await state.getGroup("campaigns")) || [];
    const activeCampaigns = campaigns.filter(
      (campaign: any) =>
        campaign.status === "active" &&
        campaign.targetAudience === "new_users" &&
        campaign.autoTrigger === true
    );

    for (const campaign of activeCampaigns) {
      // Check if user matches campaign criteria
      const matchesCriteria = await evaluateCampaignCriteria(
        user,
        campaign,
        state
      );

      if (matchesCriteria) {
        await emit({
          topic: "auto-campaign-trigger",
          data: {
            campaignId: campaign.id,
            userId: user.id,
            email: user.email,
            triggerReason: "new_user_registration",
            triggeredAt: new Date().toISOString(),
          },
        });

        logger.info("Auto campaign triggered for new user", {
          userId: user.id,
          campaignId: campaign.id,
          campaignName: campaign.name,
        });
      }
    }
  } catch (error) {
    logger.error("Failed to trigger new user campaigns", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function evaluateCampaignCriteria(
  user: NewUser,
  campaign: any,
  state: any
): Promise<boolean> {
  try {
    // Basic criteria evaluation
    const criteria = campaign.criteria || {};

    // Check source filter
    if (criteria.sources && !criteria.sources.includes(user.source)) {
      return false;
    }

    // Check email domain filter
    if (criteria.emailDomains) {
      const userDomain = user.email.split("@")[1];
      if (!criteria.emailDomains.includes(userDomain)) {
        return false;
      }
    }

    // Check time-based criteria (e.g., only on weekdays)
    if (criteria.timeRestrictions) {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

      if (
        criteria.timeRestrictions.weekdaysOnly &&
        (dayOfWeek === 0 || dayOfWeek === 6)
      ) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

function getWelcomeEmailTemplate(step: number): string {
  const templates = [
    "welcome_immediate", // Step 0: Immediate welcome
    "welcome_day_2", // Step 1: 2 days later
    "welcome_week_1", // Step 2: 1 week later
    "welcome_month_1", // Step 3: 1 month later
  ];

  return templates[step] || "welcome_default";
}
