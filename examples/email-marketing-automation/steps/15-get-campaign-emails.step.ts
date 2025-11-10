import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetCampaignEmails",
  description: "Fetches personalized emails for a campaign from Motia state",
  flows: ["email-automation"],

  method: "GET",
  path: "/campaigns/:campaignId/emails",
  emits: [],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      campaignId: z.string(),
      emails: z.array(
        z.object({
          recipientId: z.string(),
          recipientEmail: z.string(),
          recipientName: z.string(),
          personalizedSubject: z.string(),
          personalizedContent: z.string(),
        })
      ),
      total: z.number(),
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

export const handler: Handlers["GetCampaignEmails"] = async (
  req,
  { logger, state }
) => {
  const { campaignId } = req.pathParams;
  
  logger.info("Fetching personalized emails for campaign", { campaignId });

  try {
    // Fetch personalized emails from Motia state
    const personalizedEmails = await state.get<any[]>(
      "personalized_emails",
      campaignId
    );

    if (!personalizedEmails) {
      return {
        status: 404,
        body: {
          success: false,
          error: "No personalized emails found for this campaign",
        },
      };
    }

    logger.info("Personalized emails fetched successfully", {
      campaignId,
      count: personalizedEmails.length,
    });

    return {
      status: 200,
      body: {
        success: true,
        campaignId,
        emails: personalizedEmails,
        total: personalizedEmails.length,
      },
    };
  } catch (error) {
    logger.error("Failed to fetch personalized emails", {
      campaignId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 500,
      body: {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch personalized emails",
      },
    };
  }
};

