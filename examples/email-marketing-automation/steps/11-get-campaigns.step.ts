import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import appwriteService from "../services/appwrite.service";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetCampaigns",
  description: "Fetches all campaigns from the database",
  flows: ["email-automation"],

  method: "GET",
  path: "/campaigns",
  emits: [],
  responseSchema: {
    200: z.array(
      z.object({
        $id: z.string(),
        name: z.string(),
        subject: z.string(),
        template: z.string(),
        targetAudience: z.string(),
        personalizeContent: z.boolean(),
        scheduledFor: z.string().optional(),
        status: z.string().optional(),
        sentCount: z.number().optional(),
        createdAt: z.string().optional(),
      })
    ),
    500: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
};

export const handler: Handlers["GetCampaigns"] = async (
  req,
  { logger, traceId }
) => {
  logger.info("Fetching all campaigns");

  try {
    const campaigns = await appwriteService.getCampaigns();
    
    return {
      status: 200,
      body: campaigns.map((campaign: any) => ({
        $id: campaign.$id,
        name: campaign.name,
        subject: campaign.subject,
        template: campaign.template,
        targetAudience: campaign.targetAudience,
        personalizeContent: campaign.personalizeContent || false,
        scheduledFor: campaign.scheduledFor,
        status: campaign.status,
        sentCount: campaign.sentCount || 0,
        createdAt: campaign.$createdAt,
      })),
    };
  } catch (error) {
    logger.error("Failed to fetch campaigns", { error });
    
    return {
      status: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch campaigns",
      },
    };
  }
};

