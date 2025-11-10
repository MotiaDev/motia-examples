import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import appwriteService from "../services/appwrite.service";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetCampaignById",
  description: "Fetches a single campaign by ID",
  flows: ["email-automation"],

  method: "GET",
  path: "/campaigns/:id",
  emits: [],
  responseSchema: {
    200: z.object({
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
    }),
    404: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
};

export const handler: Handlers["GetCampaignById"] = async (
  req,
  { logger, traceId }
) => {
  const { id } = req.pathParams;
  logger.info("Fetching campaign by ID", { campaignId: id });

  try {
    const campaign = await appwriteService.getCampaign(id);
    
    if (!campaign) {
      return {
        status: 404,
        body: {
          success: false,
          error: "Campaign not found",
        },
      };
    }
    
    return {
      status: 200,
      body: {
        $id: campaign.$id,
        name: campaign.name,
        subject: campaign.subject,
        template: campaign.template,
        targetAudience: campaign.targetAudience,
        personalizeContent: (campaign as any).personalizeContent || false,
        scheduledFor: (campaign as any).scheduledFor,
        status: campaign.status,
        sentCount: (campaign as any).sentCount || 0,
        createdAt: campaign.$createdAt,
      },
    };
  } catch (error) {
    logger.error("Failed to fetch campaign", { error, campaignId: id });
    
    return {
      status: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch campaign",
      },
    };
  }
};

