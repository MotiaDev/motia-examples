import { EventConfig, Handlers } from "motia";
import { z } from "zod";

interface BehaviorTrigger {
  type: string;
  userId: string;
  email: string;
  triggeredAt: string;
  data?: any;
}

interface BehavioralCampaign {
  id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
  template: string;
  subject: string;
  delay: number; // minutes
  conditions: {
    minEngagementScore?: number;
    maxDaysSinceLastPurchase?: number;
    minCartValue?: number;
    excludeRecentEmailSent?: boolean;
  };
  targeting: {
    segments: string[];
    excludeUnsubscribed: boolean;
  };
}

interface BehavioralSequence {
  id: string;
  userId: string;
  email: string;
  campaignId: string;
  triggerType: string;
  status: "active" | "completed" | "cancelled";
  currentStep: number;
  totalSteps: number;
  nextEmailAt: string;
  startedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  preferences: {
    emailMarketing: boolean;
    frequency: string;
  };
  metadata: {
    lastActiveDate: string;
    unsubscribedAt?: string;
  };
}

export const config: EventConfig = {
  type: "event",
  name: "BehavioralTriggerEngine",
  description:
    "Processes behavioral triggers and initiates targeted email campaigns",
  flows: ["email-automation"],
  subscribes: ["behavior-trigger"],
  emits: [
    "behavioral-campaign-triggered",
    "content-personalized",
    "behavioral-sequence-started",
  ],
  input: z.object({
    type: z.string(),
    userId: z.string(),
    email: z.string().email(),
    triggeredAt: z.string(),
    data: z.any().optional(),
  }),
};

export const handler: Handlers["BehavioralTriggerEngine"] = async (
  input,
  { traceId, logger, state, emit }
) => {
  logger.info("Step 14 – Processing behavioral trigger", {
    userId: input.userId,
    triggerType: input.type,
    email: input.email,
  });

  try {
    // Get user to check eligibility
    const user = await state.get<User>("users", input.userId);
    if (
      !user ||
      !user.preferences.emailMarketing ||
      user.metadata.unsubscribedAt
    ) {
      logger.info("User not eligible for behavioral campaigns", {
        userId: input.userId,
        emailMarketing: user?.preferences?.emailMarketing,
        unsubscribed: !!user?.metadata?.unsubscribedAt,
      });
      return;
    }

    // Get behavioral campaigns for this trigger type
    const campaigns = await getBehavioralCampaigns(input.type, state, logger);
    if (campaigns.length === 0) {
      logger.info("No active campaigns found for trigger type", {
        triggerType: input.type,
      });
      return;
    }

    // Process each matching campaign
    for (const campaign of campaigns) {
      try {
        // Check if user qualifies for this campaign
        const qualifies = await evaluateCampaignConditions(
          campaign,
          user,
          input,
          state,
          logger
        );
        if (!qualifies) {
          continue;
        }

        // Check for cooldown period (avoid spamming)
        const inCooldown = await checkCampaignCooldown(
          campaign,
          user,
          state,
          logger
        );
        if (inCooldown) {
          continue;
        }

        // Create behavioral sequence
        await initiateBehavioralSequence(
          campaign,
          user,
          input,
          state,
          emit,
          logger
        );
      } catch (campaignError) {
        logger.error("Error processing campaign", {
          campaignId: campaign.id,
          userId: input.userId,
          error:
            campaignError instanceof Error
              ? campaignError.message
              : String(campaignError),
        });
      }
    }
  } catch (error) {
    logger.error("Behavioral trigger processing failed", {
      userId: input.userId,
      triggerType: input.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function getBehavioralCampaigns(
  triggerType: string,
  state: any,
  logger: any
): Promise<BehavioralCampaign[]> {
  try {
    // Get all behavioral campaigns
    const allCampaigns = (await state.getGroup("behavioral_campaigns")) || [];

    // Filter active campaigns for this trigger type
    return allCampaigns.filter(
      (campaign: any) =>
        campaign.isActive && campaign.triggerType === triggerType
    );
  } catch (error) {
    logger.error("Error fetching behavioral campaigns", { triggerType, error });
    return [];
  }
}

async function evaluateCampaignConditions(
  campaign: BehavioralCampaign,
  user: User,
  trigger: BehaviorTrigger,
  state: any,
  logger: any
): Promise<boolean> {
  try {
    // Check engagement score condition
    if (campaign.conditions.minEngagementScore) {
      const behaviorProfile = await state.get(
        "user_behavior_profiles",
        user.id
      );
      if (
        !behaviorProfile ||
        behaviorProfile.behaviorScore < campaign.conditions.minEngagementScore
      ) {
        logger.info("User does not meet engagement score requirement", {
          userId: user.id,
          campaignId: campaign.id,
          userScore: behaviorProfile?.behaviorScore || 0,
          required: campaign.conditions.minEngagementScore,
        });
        return false;
      }
    }

    // Check last purchase condition
    if (campaign.conditions.maxDaysSinceLastPurchase) {
      const behaviorProfile = await state.get(
        "user_behavior_profiles",
        user.id
      );
      if (behaviorProfile?.activities?.lastPurchaseDate) {
        const daysSince = Math.floor(
          (Date.now() -
            new Date(behaviorProfile.activities.lastPurchaseDate).getTime()) /
            (24 * 60 * 60 * 1000)
        );
        if (daysSince > campaign.conditions.maxDaysSinceLastPurchase) {
          logger.info("User last purchase too recent", {
            userId: user.id,
            campaignId: campaign.id,
            daysSince,
            maxAllowed: campaign.conditions.maxDaysSinceLastPurchase,
          });
          return false;
        }
      }
    }

    // Check cart value for cart abandonment triggers
    if (
      campaign.conditions.minCartValue &&
      trigger.type === "cart_abandonment"
    ) {
      const cartValue = trigger.data?.cartData?.total || 0;
      if (cartValue < campaign.conditions.minCartValue) {
        logger.info("Cart value below minimum threshold", {
          userId: user.id,
          campaignId: campaign.id,
          cartValue,
          minRequired: campaign.conditions.minCartValue,
        });
        return false;
      }
    }

    // Check recent email exclusion
    if (campaign.conditions.excludeRecentEmailSent) {
      const recentEmails = await getRecentEmails(user.id, 24, state); // Last 24 hours
      if (recentEmails.length > 0) {
        logger.info("User received recent email, excluding from campaign", {
          userId: user.id,
          campaignId: campaign.id,
          recentEmailsCount: recentEmails.length,
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error("Error evaluating campaign conditions", {
      campaignId: campaign.id,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function checkCampaignCooldown(
  campaign: BehavioralCampaign,
  user: User,
  state: any,
  logger: any
): Promise<boolean> {
  try {
    // Check if user has received this campaign recently (7 days cooldown)
    const cooldownPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const cutoffTime = new Date(Date.now() - cooldownPeriod);

    const recentSequences =
      (await state.getGroup("behavioral_sequences")) || [];
    const userRecentSequences = recentSequences.filter(
      (seq: any) =>
        seq.userId === user.id &&
        seq.campaignId === campaign.id &&
        new Date(seq.startedAt) > cutoffTime
    );

    if (userRecentSequences.length > 0) {
      logger.info("User in campaign cooldown period", {
        userId: user.id,
        campaignId: campaign.id,
        lastSequenceStart: userRecentSequences[0].startedAt,
      });
      return true;
    }

    return false;
  } catch (error) {
    logger.error("Error checking campaign cooldown", {
      campaignId: campaign.id,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function initiateBehavioralSequence(
  campaign: BehavioralCampaign,
  user: User,
  trigger: BehaviorTrigger,
  state: any,
  emit: any,
  logger: any
) {
  try {
    const sequenceId = `behav_seq_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const sendTime = new Date(Date.now() + campaign.delay * 60 * 1000); // Add delay in minutes

    // Create behavioral sequence
    const sequence: BehavioralSequence = {
      id: sequenceId,
      userId: user.id,
      email: user.email,
      campaignId: campaign.id,
      triggerType: campaign.triggerType,
      status: "active",
      currentStep: 0,
      totalSteps: getTotalStepsForCampaign(campaign),
      nextEmailAt: sendTime.toISOString(),
      startedAt: new Date().toISOString(),
    };

    // Store sequence
    await state.set("behavioral_sequences", sequenceId, sequence);

    // Generate email content based on trigger type and data
    const emailContent = generateBehavioralEmailContent(
      campaign,
      user,
      trigger
    );
    const personalizedSubject = campaign.subject.replace(
      "{{firstName}}",
      user.firstName || "there"
    );

    // Create personalized email
    const personalizedEmail = {
      id: `behav_email_${sequenceId}_${Date.now()}`,
      campaignId: `behavioral_${campaign.id}`,
      userId: user.id,
      email: user.email,
      subject: personalizedSubject,
      content: emailContent,
      status: "queued",
      createdAt: new Date().toISOString(),
      emailType: "behavioral",
      triggerType: campaign.triggerType,
      scheduledFor: sendTime.toISOString(),
    };

    // If delay is 0, send immediately, otherwise schedule
    if (campaign.delay === 0) {
      await emit({
        topic: "content-personalized",
        data: {
          campaignId: personalizedEmail.campaignId,
          personalizedEmails: [personalizedEmail],
          totalEmails: 1,
          isBehavioralCampaign: true,
        },
      });
    } else {
      // Store for scheduled sending
      await state.set(
        "scheduled_behavioral_emails",
        personalizedEmail.id,
        personalizedEmail
      );
    }

    // Emit sequence started event
    await emit({
      topic: "behavioral-sequence-started",
      data: {
        sequenceId,
        userId: user.id,
        email: user.email,
        campaignId: campaign.id,
        triggerType: campaign.triggerType,
        scheduledFor: sendTime.toISOString(),
        delay: campaign.delay,
      },
    });

    // Emit campaign triggered event
    await emit({
      topic: "behavioral-campaign-triggered",
      data: {
        campaignId: campaign.id,
        campaignName: campaign.name,
        userId: user.id,
        email: user.email,
        triggerType: campaign.triggerType,
        triggerData: trigger.data,
        triggeredAt: new Date().toISOString(),
        scheduledFor: sendTime.toISOString(),
      },
    });

    logger.info("Behavioral sequence initiated", {
      sequenceId,
      userId: user.id,
      campaignId: campaign.id,
      triggerType: campaign.triggerType,
      delay: campaign.delay,
      scheduledFor: sendTime.toISOString(),
    });
  } catch (error) {
    logger.error("Error initiating behavioral sequence", {
      campaignId: campaign.id,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getRecentEmails(
  userId: string,
  hours: number,
  state: any
): Promise<any[]> {
  try {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const emails = (await state.getGroup("emails")) || [];

    return emails.filter(
      (email: any) =>
        email.userId === userId &&
        email.sentAt &&
        new Date(email.sentAt) > cutoffTime
    );
  } catch (error) {
    return [];
  }
}

function getTotalStepsForCampaign(campaign: BehavioralCampaign): number {
  // Most behavioral campaigns are single-email campaigns
  // Multi-step campaigns would need more complex configuration
  switch (campaign.triggerType) {
    case "cart_abandonment":
      return 3; // Initial + 2 follow-ups
    case "welcome_sequence_progression":
      return 1; // Single follow-up
    case "inactivity":
      return 2; // Re-engagement series
    case "high_engagement":
      return 1; // Single thank you/upsell
    case "purchase_ready":
      return 2; // Recommendation + follow-up
    default:
      return 1;
  }
}

function generateBehavioralEmailContent(
  campaign: BehavioralCampaign,
  user: User,
  trigger: BehaviorTrigger
): string {
  const firstName = user.firstName || "there";

  const contentTemplates = {
    cart_abandonment: `
      <h1>Don't forget your items, ${firstName}!</h1>
      <p>You left some great items in your cart. Complete your purchase before they're gone!</p>
      <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Your Cart Items:</h3>
        <p>Cart value: ${trigger.data?.cartData?.total || "0.00"}</p>
      </div>
      <a href="#" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Complete Purchase</a>
      <p><small>This offer expires in 24 hours.</small></p>
    `,
    inactivity: `
      <h1>We miss you, ${firstName}!</h1>
      <p>It's been a while since we've seen you. Here's what you've been missing:</p>
      <ul>
        <li>New features and improvements</li>
        <li>Exclusive content just for you</li>
        <li>Community updates</li>
      </ul>
      <a href="#" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Welcome Back</a>
      <p>We'd love to have you back in our community!</p>
    `,
    high_engagement: `
      <h1>Thank you for being awesome, ${firstName}!</h1>
      <p>We've noticed how engaged you've been lately, and we wanted to say thanks!</p>
      <p>As a token of our appreciation, here's something special for you:</p>
      <div style="background-color: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
        <h3>Exclusive Offer</h3>
        <p>Get 20% off your next purchase - just for being an amazing community member!</p>
      </div>
      <a href="#" style="background-color: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Claim Offer</a>
    `,
    purchase_ready: `
      <h1>Ready to take the next step, ${firstName}?</h1>
      <p>Based on your recent activity, we think you might be interested in these recommendations:</p>
      <div style="background-color: #e3f2fd; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Recommended for You</h3>
        <p>Curated based on your interests and browsing history.</p>
      </div>
      <a href="#" style="background-color: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Recommendations</a>
      <p>Limited time offer - don't miss out!</p>
    `,
  };

  return (
    contentTemplates[campaign.triggerType as keyof typeof contentTemplates] ||
    contentTemplates.high_engagement
  );
}
