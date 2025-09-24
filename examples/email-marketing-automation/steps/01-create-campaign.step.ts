import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import appwriteService from "../services/appwrite.service";

export const config: ApiRouteConfig = {
  type: "api",
  name: "CreateCampaign",
  description: "Creates a new email campaign and triggers the workflow",
  flows: ["email-automation"],

  method: "POST",
  path: "/campaigns",
  bodySchema: z.object({
    name: z.string().min(1, "Campaign name is required"),
    subject: z.string().min(1, "Email subject is required"),
    template: z.string().min(1, "Email template is required"),
    targetAudience: z.enum(["all", "new_users", "active_users", "vip_users"]),
    scheduledFor: z.string().datetime().optional(),
    personalizeContent: z.boolean().default(false),
  }),
  responseSchema: {
    200: z.object({
      campaignId: z.string(),
      name: z.string(),
      status: z.enum(["draft", "scheduled", "processing"]),
      createdAt: z.string(),
      targetAudience: z.string(),
      traceId: z.string(),
    }),
    400: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
  emits: ["campaign-created"],
};

export const handler: Handlers["CreateCampaign"] = async (
  req,
  { logger, traceId, emit, state }
) => {
  logger.info("Step 01 – Creating email campaign", { body: req.body });

  const {
    name,
    subject,
    template,
    targetAudience,
    scheduledFor,
    personalizeContent = false,
  } = req.body;

  try {
    // Create campaign object
    const campaign = {
      name,
      subject,
      template,
      targetAudience,
      scheduledFor,
      personalizeContent,
      status: scheduledFor ? "scheduled" : "processing",
      metrics: JSON.stringify({
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
      }),
    };

    // Store campaign in Appwrite
    const createdCampaign = await appwriteService.createCampaign(campaign);
    const campaignId = createdCampaign.$id;
    const createdAt = createdCampaign.$createdAt;

    logger.info("Campaign created successfully", {
      name,
      subject,
      targetAudience,
    });

    // Emit event to trigger campaign processing
    await emit({
      topic: "campaign-created",
      data: {
        campaignId,
        name,
        subject,
        template,
        targetAudience,
        scheduledFor,
        personalizeContent,
        createdAt,
      },
    });

    return {
      status: 200,
      body: {
        campaignId,
        name,
        status: campaign.status as "draft" | "scheduled" | "processing",
        createdAt,
        targetAudience,
        traceId,
      },
    };
  } catch (error) {
    logger.error("Campaign creation failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 400,
      body: {
        success: false,
        error: "Failed to create campaign",
      },
    };
  }
};
