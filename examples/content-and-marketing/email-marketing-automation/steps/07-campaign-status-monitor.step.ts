import { CronConfig, Handlers } from "motia";

interface Campaign {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  triggeredAt?: string;
  completedAt?: string;
  error?: string;
  metrics: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed?: number;
  };
}

interface CampaignAnalytics {
  campaignId: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  lastUpdated: string;
}

interface CampaignAlert {
  campaignId: string;
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  threshold?: number;
  currentValue?: number;
  triggeredAt: string;
}

export const config: CronConfig = {
  type: "cron",
  cron: "*/10 * * * *", // Run every 10 minutes to monitor campaign health
  name: "CampaignStatusMonitor",
  description:
    "Monitors campaign health, performance, and generates alerts for issues",
  emits: [],
  flows: ["email-automation"],
};

export const handler: Handlers["CampaignStatusMonitor"] = async ({
  logger,
  state,
  emit,
}) => {
  logger.info("Step 07 – Running campaign status monitoring");

  try {
    // Get all active campaigns
    const campaigns = await state.getGroup<Campaign>("campaigns");

    if (!campaigns || campaigns.length === 0) {
      logger.info("No campaigns found to monitor");
      return;
    }

    const activeCampaigns = campaigns.filter((campaign) =>
      ["processing", "sending", "sent"].includes(campaign.status)
    );

    logger.info(
      `Monitoring ${activeCampaigns.length} active campaigns out of ${campaigns.length} total`
    );

    let alertsGenerated = 0;
    let healthReports = 0;
    const alerts: CampaignAlert[] = [];

    // Monitor each active campaign
    for (const campaign of activeCampaigns) {
      try {
        const campaignHealth = await monitorCampaignHealth(
          campaign,
          state,
          logger
        );

        if (campaignHealth.alerts.length > 0) {
          alerts.push(...campaignHealth.alerts);
          alertsGenerated += campaignHealth.alerts.length;
        }

        // Generate health report
        await generateHealthReport(
          campaign,
          campaignHealth,
          state,
          emit,
          logger
        );
        healthReports++;

        // Check for stuck campaigns
        await checkStuckCampaigns(campaign, state, logger, emit);

        // Update campaign completion status
        await updateCampaignCompletion(campaign, state, logger);
      } catch (campaignError) {
        logger.error("Error monitoring campaign", {
          campaignId: campaign.id,
          error:
            campaignError instanceof Error
              ? campaignError.message
              : String(campaignError),
        });
      }
    }

    // Alerts are logged; no subscribers needed
    if (alerts.length > 0) {
      logger.warn("Campaign alerts detected", {
        alertCount: alerts.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Clean up old completed campaigns
    await cleanupOldCampaigns(campaigns, state, logger);

    logger.info("Campaign monitoring completed", {
      campaignsMonitored: activeCampaigns.length,
      alertsGenerated,
      healthReports,
      nextCheckIn: "10 minutes",
    });
  } catch (error) {
    logger.error("Campaign status monitoring failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function monitorCampaignHealth(
  campaign: Campaign,
  state: any,
  logger: any
): Promise<{ score: number; alerts: CampaignAlert[] }> {
  const alerts: CampaignAlert[] = [];

  try {
    // Get campaign analytics
    const analytics = (await state.get(
      "campaign_analytics",
      campaign.id
    )) as CampaignAnalytics | null;
    if (!analytics) {
      return { score: 0, alerts };
    }

    const campaignAge =
      new Date().getTime() - new Date(campaign.createdAt).getTime();
    const hoursOld = campaignAge / (1000 * 60 * 60);

    // Alert: Low delivery rate
    if (analytics.totalSent > 50 && analytics.deliveryRate < 85) {
      alerts.push({
        campaignId: campaign.id,
        alertType: "low_delivery_rate",
        severity: analytics.deliveryRate < 70 ? "critical" : "high",
        message: `Low delivery rate: ${analytics.deliveryRate.toFixed(1)}%`,
        threshold: 85,
        currentValue: analytics.deliveryRate,
        triggeredAt: new Date().toISOString(),
      });
    }

    // Alert: High bounce rate
    if (analytics.totalSent > 20 && analytics.bounceRate > 10) {
      alerts.push({
        campaignId: campaign.id,
        alertType: "high_bounce_rate",
        severity: analytics.bounceRate > 20 ? "critical" : "high",
        message: `High bounce rate: ${analytics.bounceRate.toFixed(1)}%`,
        threshold: 10,
        currentValue: analytics.bounceRate,
        triggeredAt: new Date().toISOString(),
      });
    }

    // Alert: Very low open rate
    if (analytics.delivered > 100 && analytics.openRate < 5) {
      alerts.push({
        campaignId: campaign.id,
        alertType: "low_open_rate",
        severity: "medium",
        message: `Very low open rate: ${analytics.openRate.toFixed(1)}%`,
        threshold: 5,
        currentValue: analytics.openRate,
        triggeredAt: new Date().toISOString(),
      });
    }

    // Alert: High unsubscribe rate
    if (analytics.delivered > 50 && analytics.unsubscribeRate > 2) {
      alerts.push({
        campaignId: campaign.id,
        alertType: "high_unsubscribe_rate",
        severity: analytics.unsubscribeRate > 5 ? "high" : "medium",
        message: `High unsubscribe rate: ${analytics.unsubscribeRate.toFixed(
          1
        )}%`,
        threshold: 2,
        currentValue: analytics.unsubscribeRate,
        triggeredAt: new Date().toISOString(),
      });
    }

    // Alert: Campaign taking too long
    if (campaign.status === "processing" && hoursOld > 2) {
      alerts.push({
        campaignId: campaign.id,
        alertType: "slow_processing",
        severity: hoursOld > 6 ? "high" : "medium",
        message: `Campaign processing for ${hoursOld.toFixed(1)} hours`,
        threshold: 2,
        currentValue: hoursOld,
        triggeredAt: new Date().toISOString(),
      });
    }

    // Calculate health score (0-100)
    let score = 100;
    score -= Math.max(0, (85 - analytics.deliveryRate) * 2); // Delivery rate penalty
    score -= Math.max(0, (analytics.bounceRate - 5) * 3); // Bounce rate penalty
    score -= Math.max(0, (analytics.unsubscribeRate - 1) * 5); // Unsubscribe penalty
    score = Math.max(0, Math.min(100, score));

    return { score, alerts };
  } catch (error) {
    logger.error("Error calculating campaign health", {
      campaignId: campaign.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { score: 0, alerts };
  }
}

async function generateHealthReport(
  campaign: Campaign,
  health: { score: number; alerts: CampaignAlert[] },
  state: any,
  emit: any,
  logger: any
) {
  try {
    const analytics = (await state.get(
      "campaign_analytics",
      campaign.id
    )) as CampaignAnalytics | null;

    const healthReport = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      healthScore: health.score,
      alertCount: health.alerts.length,
      metrics: analytics
        ? {
            totalSent: analytics.totalSent,
            deliveryRate: analytics.deliveryRate,
            openRate: analytics.openRate,
            clickRate: analytics.clickRate,
            bounceRate: analytics.bounceRate,
            unsubscribeRate: analytics.unsubscribeRate,
          }
        : null,
      generatedAt: new Date().toISOString(),
    };

    // Store health report
    await state.set("campaign_health_reports", campaign.id, healthReport);
  } catch (error) {
    logger.error("Error generating health report", {
      campaignId: campaign.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function checkStuckCampaigns(
  campaign: Campaign,
  state: any,
  logger: any,
  emit: any
) {
  try {
    const now = new Date();
    const updatedAt = new Date(campaign.updatedAt || campaign.createdAt);
    const hoursSinceUpdate =
      (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

    // Check if campaign is stuck in processing for more than 4 hours
    if (campaign.status === "processing" && hoursSinceUpdate > 4) {
      logger.warn("Detected stuck campaign", {
        campaignId: campaign.id,
        status: campaign.status,
        hoursSinceUpdate: hoursSinceUpdate.toFixed(1),
      });

      // Mark as failed if stuck too long
      if (hoursSinceUpdate > 12) {
        campaign.status = "failed";
        campaign.error = "Campaign stuck in processing for over 12 hours";
        campaign.updatedAt = now.toISOString();
        await state.set("campaigns", campaign.id, campaign);

        logger.error("Marked stuck campaign as failed", {
          campaignId: campaign.id,
          hoursSinceUpdate: hoursSinceUpdate.toFixed(1),
        });
      }
    }
  } catch (error) {
    logger.error("Error checking stuck campaigns", {
      campaignId: campaign.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function updateCampaignCompletion(
  campaign: Campaign,
  state: any,
  logger: any
) {
  try {
    // Check if campaign should be marked as completed
    if (campaign.status === "sent") {
      const analytics = (await state.get(
        "campaign_analytics",
        campaign.id
      )) as CampaignAnalytics | null;

      if (
        analytics &&
        analytics.totalSent >= campaign.metrics.totalRecipients
      ) {
        campaign.status = "completed";
        campaign.completedAt = new Date().toISOString();
        campaign.updatedAt = new Date().toISOString();
        await state.set("campaigns", campaign.id, campaign);

        logger.info("Campaign marked as completed", {
          campaignId: campaign.id,
          totalSent: analytics.totalSent,
          totalRecipients: campaign.metrics.totalRecipients,
        });
      }
    }
  } catch (error) {
    logger.error("Error updating campaign completion", {
      campaignId: campaign.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function cleanupOldCampaigns(
  campaigns: Campaign[],
  state: any,
  logger: any
) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const campaign of campaigns) {
      if (campaign.status === "completed" || campaign.status === "failed") {
        const completedAt = new Date(
          campaign.completedAt || campaign.updatedAt || campaign.createdAt
        );

        if (completedAt < sevenDaysAgo) {
          // Archive old campaign data instead of deleting
          const archivedCampaign = {
            ...campaign,
            archivedAt: new Date().toISOString(),
          };
          await state.set("archived_campaigns", campaign.id, archivedCampaign);

          // Remove from active campaigns
          await state.delete("campaigns", campaign.id);
          cleanedCount++;

          logger.info("Archived old campaign", {
            campaignId: campaign.id,
            status: campaign.status,
            completedAt: campaign.completedAt,
          });
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Archived ${cleanedCount} old campaigns`);
    }
  } catch (error) {
    logger.error("Error cleaning up old campaigns", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
