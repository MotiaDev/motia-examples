import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import appwriteService from "../services/appwrite.service";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetDashboardStats",
  description: "Fetches dashboard statistics",
  flows: ["email-automation"],

  method: "GET",
  path: "/stats",
  emits: [],
  responseSchema: {
    200: z.object({
      totalCampaigns: z.number(),
      emailsSent: z.number(),
      openRate: z.number(),
      clickRate: z.number(),
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
};

export const handler: Handlers["GetDashboardStats"] = async (
  req,
  { logger, traceId }
) => {
  logger.info("Fetching dashboard stats");

  try {
    // Fetch campaigns (this should always work)
    const campaigns = await appwriteService.getCampaigns();
    const totalCampaigns = campaigns.length;
    
    // Try to fetch analytics (emails are stored in Motia state, not Appwrite)
    let analytics: any[] = [];
    
    try {
      analytics = await appwriteService.getAnalyticsRecords();
    } catch (e) {
      // Analytics table might not have data yet, that's OK
      logger.info("No analytics data available yet");
    }
    
    // Calculate stats from analytics table
    const sentAnalytics = analytics.filter((a: any) => a.status === 'sent');
    const emailsSent = sentAnalytics.length;
    
    // Calculate open and click rates from analytics events
    const openedEmails = analytics.filter((a: any) => a.openedAt != null).length;
    const clickedEmails = analytics.filter((a: any) => a.clickedAt != null).length;
    
    const openRate = emailsSent > 0 ? (openedEmails / emailsSent) * 100 : 0;
    const clickRate = emailsSent > 0 ? (clickedEmails / emailsSent) * 100 : 0;
    
    return {
      status: 200,
      body: {
        totalCampaigns,
        emailsSent,
        openRate: Math.round(openRate * 10) / 10, // Round to 1 decimal
        clickRate: Math.round(clickRate * 10) / 10,
      },
    };
  } catch (error) {
    logger.error("Failed to fetch dashboard stats", { error });
    
    return {
      status: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      },
    };
  }
};

