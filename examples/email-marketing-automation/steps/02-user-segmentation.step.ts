import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import appwriteService from "../services/appwrite.service";
import { Query } from "node-appwrite";

// Interfaces defined inline
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: "active" | "inactive" | "unsubscribed";
  preferences: {
    emailMarketing: boolean;
    frequency: "daily" | "weekly" | "monthly";
  };
  metadata: {
    signupDate: string;
    lastActiveDate?: string;
    totalPurchases: number;
    vipStatus: boolean;
  };
}

type AudienceType = "all" | "new_users" | "active_users" | "vip_users";

export const config: EventConfig = {
  type: "event",
  name: "UserSegmentation",
  description:
    "Segments users based on campaign target audience and prepares email queue",
  flows: ["email-automation"],
  subscribes: ["campaign-created"],
  emits: ["users-segmented"],
  input: z.object({
    campaignId: z.string(),
    name: z.string(),
    subject: z.string(),
    template: z.string(),
    targetAudience: z.enum(["all", "new_users", "active_users", "vip_users"]),
    scheduledFor: z.string().optional(),
    personalizeContent: z.boolean(),
    createdAt: z.string(),
  }),
};

export const handler: Handlers["UserSegmentation"] = async (
  input,
  { traceId, logger, state, emit }
) => {
  logger.info("Step 02 – Starting user segmentation", {
    campaignId: input.campaignId,
    targetAudience: input.targetAudience,
  });

  try {
    // Fetch users from Appwrite based on target audience
    const segmentedUsers = await getUsersBySegment(
      input.targetAudience,
      logger
    );

    logger.info("User segmentation completed", {
      campaignId: input.campaignId,
      targetAudience: input.targetAudience,
      segmentedUsers: segmentedUsers.length,
    });

    // Store segmented users in Motia state for campaign processing
    await state.set("campaign_recipients", input.campaignId, segmentedUsers);

    // Update campaign metrics in Appwrite
    const campaign = await appwriteService.getCampaign(input.campaignId);
    if (campaign) {
      const updatedMetrics =
        typeof campaign.metrics === "string"
          ? JSON.parse(campaign.metrics)
          : campaign.metrics;

      updatedMetrics.totalRecipients = segmentedUsers.length;

      await appwriteService.updateCampaign(input.campaignId, {
        metrics: JSON.stringify(updatedMetrics),
      });
    }

    // Emit event with segmented users for next step
    await emit({
      topic: "users-segmented",
      data: {
        campaignId: input.campaignId,
        name: input.name,
        subject: input.subject,
        template: input.template,
        personalizeContent: input.personalizeContent,
        scheduledFor: input.scheduledFor,
        recipients: segmentedUsers,
        totalRecipients: segmentedUsers.length,
      },
    });

    logger.info("Users segmented and queued for processing", {
      campaignId: input.campaignId,
      recipientCount: segmentedUsers.length,
      traceId,
    });
  } catch (error) {
    logger.error("User segmentation failed", {
      campaignId: input.campaignId,
      targetAudience: input.targetAudience,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to empty recipients on error
    await emit({
      topic: "users-segmented",
      data: {
        campaignId: input.campaignId,
        name: input.name,
        subject: input.subject,
        template: input.template,
        personalizeContent: input.personalizeContent,
        scheduledFor: input.scheduledFor,
        recipients: [],
        totalRecipients: 0,
      },
    });
  }
};

async function getUsersBySegment(
  targetAudience: AudienceType,
  logger: any
): Promise<User[]> {
  try {
    // Simplified: Just get all active users, then filter in JavaScript
    const queries = [Query.equal("status", "active")];

    // Fetch users from Appwrite (no complex queries, just active users)
    const users = await appwriteService.getUsers(queries);

    // Parse JSON fields and apply all filtering in JavaScript
    const segmentedUsers = users
      .map((user) => parseUserFields(user))
      .filter((user) => {
        // First filter: Must have email marketing enabled
        if (!user.preferences.emailMarketing) return false;

        // Second filter: Apply audience-specific criteria
        if (targetAudience === "new_users") {
          const signupDate = new Date(user.metadata.signupDate);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return signupDate >= sevenDaysAgo;
        }

        if (targetAudience === "active_users") {
          if (!user.metadata.lastActiveDate) return false;
          const lastActiveDate = new Date(user.metadata.lastActiveDate);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return lastActiveDate >= thirtyDaysAgo;
        }

        if (targetAudience === "vip_users") {
          return (
            user.metadata.vipStatus === true ||
            user.metadata.totalPurchases >= 10
          );
        }

        // For "all" audience, return true (already filtered for emailMarketing above)
        return true;
      });

    logger.info("Appwrite user segmentation completed", {
      targetAudience,
      totalUsers: users.length,
      segmentedUsers: segmentedUsers.length,
    });

    return segmentedUsers;
  } catch (error) {
    logger.error("Error fetching users from Appwrite", {
      targetAudience,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function parseUserFields(user: any): User {
  try {
    return {
      id: user.$id || user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      preferences:
        typeof user.preferences === "string"
          ? JSON.parse(user.preferences)
          : user.preferences,
      metadata:
        typeof user.metadata === "string"
          ? JSON.parse(user.metadata)
          : user.metadata,
    };
  } catch (error) {
    // Fallback parsing if JSON is malformed
    return {
      id: user.$id || user.id,
      email: user.email,
      firstName: user.firstName || "User",
      lastName: user.lastName || "",
      status: user.status || "active",
      preferences: {
        emailMarketing: true,
        frequency: "weekly",
      },
      metadata: {
        signupDate: new Date().toISOString(),
        totalPurchases: 0,
        vipStatus: false,
      },
    };
  }
}
