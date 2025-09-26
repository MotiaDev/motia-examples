import { EventConfig, Handlers } from "motia";
import { z } from "zod";

interface EmailMetrics {
  emailId: string;
  campaignId: string;
  userId: string;
  email: string;
  events: EmailEvent[];
  currentStatus: EmailStatus;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  unsubscribedAt?: string;
}

interface EmailEvent {
  type: EmailEventType;
  timestamp: string;
  data?: any;
}

type EmailEventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "unsubscribed"
  | "complained";
type EmailStatus =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "unsubscribed"
  | "complained";

export const config: EventConfig = {
  type: "event",
  name: "EmailAnalyticsTracker",
  description: "Tracks email engagement events and updates campaign analytics",
  flows: ["email-automation"],
  subscribes: [
    "email-sent",
    "email-delivered",
    "email-opened",
    "email-clicked",
    "email-bounced",
    "email-unsubscribed",
  ],
  emits: ["analytics-updated", "engagement-milestone"],
  input: z.object({
    emailId: z.string(),
    campaignId: z.string(),
    userId: z.string(),
    email: z.string(),
    eventType: z.enum([
      "sent",
      "delivered",
      "opened",
      "clicked",
      "bounced",
      "unsubscribed",
      "complained",
    ]),
    timestamp: z.string(),
    data: z.any().optional(),
  }),
};

export const handler: Handlers["EmailAnalyticsTracker"] = async (
  input,
  { traceId, logger, state, emit }
) => {
  logger.info("Step 06 – Processing email analytics event", {
    emailId: input.emailId,
    campaignId: input.campaignId,
    eventType: input.eventType,
    timestamp: input.timestamp,
  });

  try {
    const { emailId, campaignId, userId, email, eventType, timestamp, data } =
      input;

    // Get or create email metrics
    let emailMetrics = await state.get<EmailMetrics>("email_metrics", emailId);
    if (!emailMetrics) {
      emailMetrics = {
        emailId,
        campaignId,
        userId,
        email,
        events: [],
        currentStatus: "sent",
      };
    }

    // Add new event to metrics
    const newEvent: EmailEvent = {
      type: eventType as EmailEventType,
      timestamp,
      data,
    };
    emailMetrics.events.push(newEvent);

    // Update status and timestamps based on event type
    switch (eventType) {
      case "delivered":
        emailMetrics.currentStatus = "delivered";
        emailMetrics.deliveredAt = timestamp;
        break;
      case "opened":
        emailMetrics.currentStatus = "opened";
        emailMetrics.openedAt = timestamp;
        break;
      case "clicked":
        emailMetrics.currentStatus = "clicked";
        emailMetrics.clickedAt = timestamp;
        break;
      case "bounced":
        emailMetrics.currentStatus = "bounced";
        emailMetrics.bouncedAt = timestamp;
        break;
      case "unsubscribed":
        emailMetrics.currentStatus = "unsubscribed";
        emailMetrics.unsubscribedAt = timestamp;
        break;
    }

    // Save updated email metrics
    await state.set("email_metrics", emailId, emailMetrics);

    // Update campaign-level analytics
    await updateCampaignAnalytics(
      campaignId,
      eventType as EmailEventType,
      state,
      logger
    );

    // Check for engagement milestones
    await checkEngagementMilestones(
      campaignId,
      eventType as EmailEventType,
      state,
      emit,
      logger
    );

    // Log analytics update
    logger.info("Email analytics updated", {
      emailId,
      campaignId,
      eventType,
      currentStatus: emailMetrics.currentStatus,
      totalEvents: emailMetrics.events.length,
    });

    // Emit analytics update event
    await (emit as any)({
      topic: "analytics-updated",
      data: {
        emailId,
        campaignId,
        userId,
        eventType,
        timestamp,
        emailMetrics,
      },
    });
  } catch (error) {
    logger.error("Email analytics tracking failed", {
      emailId: input.emailId,
      campaignId: input.campaignId,
      eventType: input.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function updateCampaignAnalytics(
  campaignId: string,
  eventType: EmailEventType,
  state: any,
  logger: any
) {
  try {
    // Get current campaign analytics
    let analytics = await state.get("campaign_analytics", campaignId);
    if (!analytics) {
      analytics = {
        campaignId,
        totalSent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
        complained: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Increment counter based on event type
    switch (eventType) {
      case "sent":
        analytics.totalSent++;
        break;
      case "delivered":
        analytics.delivered++;
        break;
      case "opened":
        analytics.opened++;
        break;
      case "clicked":
        analytics.clicked++;
        break;
      case "bounced":
        analytics.bounced++;
        break;
      case "unsubscribed":
        analytics.unsubscribed++;
        break;
      case "complained":
        analytics.complained++;
        break;
    }

    // Calculate rates
    if (analytics.totalSent > 0) {
      analytics.deliveryRate =
        (analytics.delivered / analytics.totalSent) * 100;
      analytics.bounceRate = (analytics.bounced / analytics.totalSent) * 100;
      analytics.unsubscribeRate =
        (analytics.unsubscribed / analytics.totalSent) * 100;
    }

    if (analytics.delivered > 0) {
      analytics.openRate = (analytics.opened / analytics.delivered) * 100;
    }

    if (analytics.opened > 0) {
      analytics.clickRate = (analytics.clicked / analytics.opened) * 100;
    }

    analytics.lastUpdated = new Date().toISOString();

    // Save updated analytics
    await state.set("campaign_analytics", campaignId, analytics);

    logger.info("Campaign analytics updated", {
      campaignId,
      eventType,
      deliveryRate: `${analytics.deliveryRate.toFixed(1)}%`,
      openRate: `${analytics.openRate.toFixed(1)}%`,
      clickRate: `${analytics.clickRate.toFixed(1)}%`,
    });
  } catch (error) {
    logger.error("Failed to update campaign analytics", {
      campaignId,
      eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function checkEngagementMilestones(
  campaignId: string,
  eventType: EmailEventType,
  state: any,
  emit: any,
  logger: any
) {
  try {
    const analytics = await state.get("campaign_analytics", campaignId);
    if (!analytics) return;

    // Define milestones to check
    const milestones = [
      { type: "delivery", threshold: 50, field: "deliveryRate" },
      { type: "delivery", threshold: 90, field: "deliveryRate" },
      { type: "open", threshold: 10, field: "openRate" },
      { type: "open", threshold: 25, field: "openRate" },
      { type: "click", threshold: 5, field: "clickRate" },
      { type: "click", threshold: 15, field: "clickRate" },
    ];

    // Get achieved milestones
    let achievedMilestones =
      (await state.get("campaign_milestones", campaignId)) || [];

    for (const milestone of milestones) {
      const currentRate = analytics[milestone.field];
      const milestoneKey = `${milestone.type}_${milestone.threshold}`;

      // Check if milestone is reached and not already achieved
      if (
        currentRate >= milestone.threshold &&
        !achievedMilestones.includes(milestoneKey)
      ) {
        achievedMilestones.push(milestoneKey);

        logger.info("Engagement milestone reached", {
          campaignId,
          milestone: milestoneKey,
          currentRate: `${currentRate.toFixed(1)}%`,
        });

        // Emit milestone event
        await emit({
          topic: "engagement-milestone",
          data: {
            campaignId,
            milestoneType: milestone.type,
            threshold: milestone.threshold,
            currentRate: currentRate,
            achievedAt: new Date().toISOString(),
          },
        });
      }
    }

    // Save updated milestones
    await state.set("campaign_milestones", campaignId, achievedMilestones);
  } catch (error) {
    logger.error("Failed to check engagement milestones", {
      campaignId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
