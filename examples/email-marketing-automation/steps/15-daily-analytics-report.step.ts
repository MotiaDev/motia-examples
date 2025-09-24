import { CronConfig, Handlers } from "motia";

interface DailyReport {
  date: string;
  campaigns: {
    total: number;
    active: number;
    completed: number;
    failed: number;
    scheduled: number;
  };
  emails: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
  users: {
    newRegistrations: number;
    totalActive: number;
    totalUnsubscribed: number;
    engagementDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  };
  behavioral: {
    triggersActivated: number;
    sequencesStarted: number;
    sequencesCompleted: number;
    topTriggerTypes: Array<{ type: string; count: number }>;
  };
  performance: {
    topCampaigns: Array<{
      campaignId: string;
      name: string;
      openRate: number;
      clickRate: number;
      emailsSent: number;
    }>;
    alertsGenerated: number;
    systemHealth: number;
  };
  generatedAt: string;
}

interface CampaignAnalytics {
  campaignId: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

export const config: CronConfig = {
  type: "cron",
  cron: "0 6 * * *", // Run daily at 6 AM
  name: "DailyAnalyticsReport",
  description:
    "Generates comprehensive daily analytics reports and system insights",
  emits: [
    "daily-report-generated",
    "analytics-alert",
    "weekly-summary-ready",
    "monthly-report-triggered",
    "executive-dashboard-updated",
    "compliance-report-ready",
  ],
  flows: ["email-automation"],
};

export const handler: Handlers["DailyAnalyticsReport"] = async ({
  logger,
  state,
  emit,
}) => {
  logger.info("Step 15 – Generating daily analytics report");

  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    logger.info("Generating report for date", { reportDate: yesterday });

    // Generate comprehensive daily report
    const report = await generateDailyReport(yesterday, state, logger);

    // Store the report
    await state.set("daily_reports", yesterday, report);

    // Check for alerts and anomalies
    const alerts = await checkForAnomalies(report, state, logger);

    // Emit report generated event
    await (emit as any)({
      topic: "daily-report-generated",
      data: {
        reportDate: yesterday,
        report,
        alertsCount: alerts.length,
        generatedAt: new Date().toISOString(),
      },
    });

    // Emit alerts if any
    if (alerts.length > 0) {
      await (emit as any)({
        topic: "analytics-alert",
        data: {
          reportDate: yesterday,
          alerts,
          severity: "medium",
          alertType: "daily_analytics_anomaly",
        },
      });
    }

    // Generate weekly summary if it's Monday
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1) {
      // Monday
      await generateWeeklySummary(state, emit, logger);
    }

    // Cleanup old reports (keep last 90 days)
    await cleanupOldReports(state, logger);

    logger.info("Daily analytics report generated successfully", {
      reportDate: yesterday,
      campaignsSent: report.emails.sent,
      newUsers: report.users.newRegistrations,
      alertsGenerated: alerts.length,
    });
  } catch (error) {
    logger.error("Daily analytics report generation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function generateDailyReport(
  date: string,
  state: any,
  logger: any
): Promise<DailyReport> {
  // Get campaign analytics for the day
  const campaignMetrics = await getCampaignMetrics(date, state, logger);

  // Get email metrics
  const emailMetrics = await getEmailMetrics(date, state, logger);

  // Get user metrics
  const userMetrics = await getUserMetrics(date, state, logger);

  // Get behavioral metrics
  const behavioralMetrics = await getBehavioralMetrics(date, state, logger);

  // Get performance metrics
  const performanceMetrics = await getPerformanceMetrics(date, state, logger);

  return {
    date,
    campaigns: campaignMetrics,
    emails: emailMetrics,
    users: userMetrics,
    behavioral: behavioralMetrics,
    performance: performanceMetrics,
    generatedAt: new Date().toISOString(),
  };
}

async function getCampaignMetrics(date: string, state: any, logger: any) {
  try {
    const campaigns = (await state.getGroup("campaigns")) || [];
    const todayCampaigns = campaigns.filter((c: any) =>
      c.createdAt?.startsWith(date)
    );

    return {
      total: todayCampaigns.length,
      active: todayCampaigns.filter((c: any) =>
        ["processing", "sending"].includes(c.status)
      ).length,
      completed: todayCampaigns.filter((c: any) => c.status === "completed")
        .length,
      failed: todayCampaigns.filter((c: any) => c.status === "failed").length,
      scheduled: todayCampaigns.filter((c: any) => c.status === "scheduled")
        .length,
    };
  } catch (error) {
    logger.error("Error getting campaign metrics", { error });
    return { total: 0, active: 0, completed: 0, failed: 0, scheduled: 0 };
  }
}

async function getEmailMetrics(date: string, state: any, logger: any) {
  try {
    // Get all campaign analytics
    const allAnalytics = (await state.getGroup("campaign_analytics")) || [];

    // Aggregate metrics
    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalBounced = 0;
    let totalUnsubscribed = 0;

    allAnalytics.forEach((analytics: CampaignAnalytics) => {
      totalSent += analytics.totalSent || 0;
      totalDelivered += analytics.delivered || 0;
      totalOpened += analytics.opened || 0;
      totalClicked += analytics.clicked || 0;
      totalBounced += analytics.bounced || 0;
      totalUnsubscribed += analytics.unsubscribed || 0;
    });

    // Calculate rates
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const openRate =
      totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
    const unsubscribeRate =
      totalDelivered > 0 ? (totalUnsubscribed / totalDelivered) * 100 : 0;

    return {
      sent: totalSent,
      delivered: totalDelivered,
      opened: totalOpened,
      clicked: totalClicked,
      bounced: totalBounced,
      unsubscribed: totalUnsubscribed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      unsubscribeRate: Math.round(unsubscribeRate * 100) / 100,
    };
  } catch (error) {
    logger.error("Error getting email metrics", { error });
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
    };
  }
}

async function getUserMetrics(date: string, state: any, logger: any) {
  try {
    // Get registration analytics for the day
    const registrationAnalytics = (await state.get(
      "daily_registration_analytics",
      date
    )) || {
      total_registrations: 0,
    };

    // Get user segment counts
    const segmentCounts = (await state.get(
      "user_segment_counts",
      "global"
    )) || {
      total: 0,
      emailOptedIn: 0,
      emailOptedOut: 0,
    };

    // Get behavior profiles to calculate engagement distribution
    const behaviorProfiles =
      (await state.getGroup("user_behavior_profiles")) || [];
    const engagementDistribution = {
      high: behaviorProfiles.filter((p: any) => p.engagementLevel === "high")
        .length,
      medium: behaviorProfiles.filter(
        (p: any) => p.engagementLevel === "medium"
      ).length,
      low: behaviorProfiles.filter((p: any) => p.engagementLevel === "low")
        .length,
    };

    return {
      newRegistrations: registrationAnalytics.total_registrations,
      totalActive: segmentCounts.emailOptedIn,
      totalUnsubscribed: segmentCounts.emailOptedOut,
      engagementDistribution,
    };
  } catch (error) {
    logger.error("Error getting user metrics", { error });
    return {
      newRegistrations: 0,
      totalActive: 0,
      totalUnsubscribed: 0,
      engagementDistribution: { high: 0, medium: 0, low: 0 },
    };
  }
}

async function getBehavioralMetrics(date: string, state: any, logger: any) {
  try {
    const behavioralSequences =
      (await state.getGroup("behavioral_sequences")) || [];
    const todaySequences = behavioralSequences.filter((s: any) =>
      s.startedAt?.startsWith(date)
    );

    // Count trigger types
    const triggerTypeCounts: Record<string, number> = {};
    todaySequences.forEach((seq: any) => {
      triggerTypeCounts[seq.triggerType] =
        (triggerTypeCounts[seq.triggerType] || 0) + 1;
    });

    // Sort and get top trigger types
    const topTriggerTypes = Object.entries(triggerTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      triggersActivated: todaySequences.length,
      sequencesStarted: todaySequences.filter((s: any) => s.status === "active")
        .length,
      sequencesCompleted: todaySequences.filter(
        (s: any) => s.status === "completed"
      ).length,
      topTriggerTypes,
    };
  } catch (error) {
    logger.error("Error getting behavioral metrics", { error });
    return {
      triggersActivated: 0,
      sequencesStarted: 0,
      sequencesCompleted: 0,
      topTriggerTypes: [],
    };
  }
}

async function getPerformanceMetrics(date: string, state: any, logger: any) {
  try {
    // Get campaign analytics and sort by performance
    const allAnalytics = (await state.getGroup("campaign_analytics")) || [];
    const campaigns = (await state.getGroup("campaigns")) || [];

    // Create performance rankings
    const campaignPerformance = allAnalytics
      .filter((analytics: CampaignAnalytics) => analytics.totalSent > 0)
      .map((analytics: CampaignAnalytics) => {
        const campaign = campaigns.find(
          (c: any) => c.id === analytics.campaignId
        );
        return {
          campaignId: analytics.campaignId,
          name: campaign?.name || "Unknown Campaign",
          openRate: analytics.openRate,
          clickRate: analytics.clickRate,
          emailsSent: analytics.totalSent,
        };
      })
      .sort((a: any, b: any) => b.openRate - a.openRate)
      .slice(0, 5);

    // Get alerts count
    const alerts = (await state.getGroup("campaign_alerts")) || [];
    const todayAlerts = alerts.filter((a: any) =>
      a.timestamp?.startsWith(date)
    );

    // Calculate system health score (0-100)
    const healthReports =
      (await state.getGroup("campaign_health_reports")) || [];
    const avgHealthScore =
      healthReports.length > 0
        ? healthReports.reduce(
            (sum: number, report: any) => sum + (report.healthScore || 0),
            0
          ) / healthReports.length
        : 100;

    return {
      topCampaigns: campaignPerformance,
      alertsGenerated: todayAlerts.length,
      systemHealth: Math.round(avgHealthScore),
    };
  } catch (error) {
    logger.error("Error getting performance metrics", { error });
    return {
      topCampaigns: [],
      alertsGenerated: 0,
      systemHealth: 100,
    };
  }
}

async function checkForAnomalies(
  report: DailyReport,
  state: any,
  logger: any
): Promise<Array<{ type: string; message: string; severity: string }>> {
  const alerts = [];

  try {
    // Get previous day's report for comparison
    const previousDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const previousReport = await state.get("daily_reports", previousDate);

    if (previousReport) {
      // Check for significant drops in performance
      if (
        report.emails.deliveryRate <
        previousReport.emails.deliveryRate - 10
      ) {
        alerts.push({
          type: "delivery_rate_drop",
          message: `Delivery rate dropped by ${(
            previousReport.emails.deliveryRate - report.emails.deliveryRate
          ).toFixed(1)}% compared to yesterday`,
          severity: "high",
        });
      }

      if (report.emails.openRate < previousReport.emails.openRate - 5) {
        alerts.push({
          type: "open_rate_drop",
          message: `Open rate dropped by ${(
            previousReport.emails.openRate - report.emails.openRate
          ).toFixed(1)}% compared to yesterday`,
          severity: "medium",
        });
      }

      // Check for unusual spikes in bounces or unsubscribes
      if (report.emails.bounceRate > previousReport.emails.bounceRate + 5) {
        alerts.push({
          type: "bounce_rate_spike",
          message: `Bounce rate increased by ${(
            report.emails.bounceRate - previousReport.emails.bounceRate
          ).toFixed(1)}% compared to yesterday`,
          severity: "high",
        });
      }

      if (
        report.emails.unsubscribeRate >
        previousReport.emails.unsubscribeRate + 2
      ) {
        alerts.push({
          type: "unsubscribe_rate_spike",
          message: `Unsubscribe rate increased by ${(
            report.emails.unsubscribeRate -
            previousReport.emails.unsubscribeRate
          ).toFixed(1)}% compared to yesterday`,
          severity: "medium",
        });
      }
    }

    // Check absolute thresholds
    if (report.emails.deliveryRate < 85) {
      alerts.push({
        type: "low_delivery_rate",
        message: `Overall delivery rate is ${report.emails.deliveryRate.toFixed(
          1
        )}% (below 85% threshold)`,
        severity: "high",
      });
    }

    if (report.emails.bounceRate > 10) {
      alerts.push({
        type: "high_bounce_rate",
        message: `Overall bounce rate is ${report.emails.bounceRate.toFixed(
          1
        )}% (above 10% threshold)`,
        severity: "high",
      });
    }

    if (report.performance.systemHealth < 70) {
      alerts.push({
        type: "low_system_health",
        message: `System health score is ${report.performance.systemHealth}% (below 70% threshold)`,
        severity: "critical",
      });
    }

    logger.info("Anomaly check completed", {
      reportDate: report.date,
      alertsFound: alerts.length,
    });
  } catch (error) {
    logger.error("Error checking for anomalies", { error });
  }

  return alerts;
}

async function generateWeeklySummary(state: any, emit: any, logger: any) {
  try {
    logger.info("Generating weekly summary report");

    // Get last 7 days of reports
    const weeklyReports = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const report = await state.get("daily_reports", date);
      if (report) {
        weeklyReports.push(report);
      }
    }

    if (weeklyReports.length === 0) {
      logger.warn("No daily reports found for weekly summary");
      return;
    }

    // Calculate weekly aggregates
    const weeklyMetrics = {
      totalCampaigns: weeklyReports.reduce(
        (sum, report) => sum + report.campaigns.total,
        0
      ),
      totalEmailsSent: weeklyReports.reduce(
        (sum, report) => sum + report.emails.sent,
        0
      ),
      avgDeliveryRate:
        weeklyReports.reduce(
          (sum, report) => sum + report.emails.deliveryRate,
          0
        ) / weeklyReports.length,
      avgOpenRate:
        weeklyReports.reduce((sum, report) => sum + report.emails.openRate, 0) /
        weeklyReports.length,
      avgClickRate:
        weeklyReports.reduce(
          (sum, report) => sum + report.emails.clickRate,
          0
        ) / weeklyReports.length,
      totalNewUsers: weeklyReports.reduce(
        (sum, report) => sum + report.users.newRegistrations,
        0
      ),
      totalBehavioralTriggers: weeklyReports.reduce(
        (sum, report) => sum + report.behavioral.triggersActivated,
        0
      ),
      avgSystemHealth:
        weeklyReports.reduce(
          (sum, report) => sum + report.performance.systemHealth,
          0
        ) / weeklyReports.length,
    };

    // Store weekly summary
    const weekStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    await state.set("weekly_summaries", weekStartDate, {
      weekStarting: weekStartDate,
      metrics: weeklyMetrics,
      dailyReports: weeklyReports.length,
      generatedAt: new Date().toISOString(),
    });

    logger.info("Weekly summary generated", {
      weekStarting: weekStartDate,
      totalCampaigns: weeklyMetrics.totalCampaigns,
      totalEmails: weeklyMetrics.totalEmailsSent,
      avgOpenRate: weeklyMetrics.avgOpenRate.toFixed(1),
    });
  } catch (error) {
    logger.error("Error generating weekly summary", { error });
  }
}

async function cleanupOldReports(state: any, logger: any) {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Get all daily reports
    const allReports = (await state.getGroup("daily_reports")) || [];
    let cleanedCount = 0;

    for (const report of allReports) {
      if (report.date < ninetyDaysAgo) {
        await state.delete("daily_reports", report.date);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old daily reports`);
    }

    // Also cleanup old weekly summaries (keep 1 year)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const allWeeklySummaries = (await state.getGroup("weekly_summaries")) || [];
    let weeklyCleanedCount = 0;

    for (const summary of allWeeklySummaries) {
      if (summary.weekStarting < oneYearAgo) {
        await state.delete("weekly_summaries", summary.weekStarting);
        weeklyCleanedCount++;
      }
    }

    if (weeklyCleanedCount > 0) {
      logger.info(`Cleaned up ${weeklyCleanedCount} old weekly summaries`);
    }
  } catch (error) {
    logger.error("Error cleaning up old reports", { error });
  }
}
