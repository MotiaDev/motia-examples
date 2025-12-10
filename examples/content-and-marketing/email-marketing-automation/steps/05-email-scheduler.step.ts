import { CronConfig, Handlers } from "motia";

interface ScheduledCampaign {
  campaignId: string;
  scheduledFor: string;
  personalizedEmails: any[];
  status: string;
  createdAt: string;
}

export const config: CronConfig = {
  type: "cron",
  cron: "*/5 * * * *", // Run every 5 minutes to check for scheduled campaigns
  // cron: "*/10 * * * * *",
  name: "EmailScheduler",
  description: "Processes scheduled email campaigns when their time arrives",
  emits: ["content-personalized"],
  flows: ["email-automation"],
};

export const handler: Handlers["EmailScheduler"] = async ({
  logger,
  state,
  emit,
}) => {
  logger.info("Step 05 – Checking for scheduled campaigns to send");

  try {
    // Get all scheduled campaigns from state
    const scheduledCampaigns = await state.getGroup<ScheduledCampaign>(
      "scheduled_campaigns"
    );

    logger.info(
      "==========> scheduled campaigns <==========",
      scheduledCampaigns
    );
    if (!scheduledCampaigns || scheduledCampaigns.length === 0) {
      logger.info("No scheduled campaigns found");
      return;
    }

    const currentTime = new Date();
    let processedCount = 0;
    let triggeredCount = 0;

    logger.info(
      `Found ${scheduledCampaigns.length} scheduled campaigns to check`
    );

    // Process each scheduled campaign
    for (const campaign of scheduledCampaigns) {
      try {
        processedCount++;
        const scheduledTime = new Date(campaign.scheduledFor);

        logger.info("Checking scheduled campaign", {
          campaignId: campaign.campaignId,
          scheduledFor: campaign.scheduledFor,
          currentTime: currentTime.toISOString(),
          isReady: currentTime >= scheduledTime,
        });

        // Check if campaign is ready to be sent
        if (currentTime >= scheduledTime && campaign.status === "scheduled") {
          logger.info("Triggering scheduled campaign", {
            campaignId: campaign.campaignId,
            scheduledFor: campaign.scheduledFor,
            emailCount: campaign.personalizedEmails.length,
          });

          // Update campaign status to prevent duplicate processing
          campaign.status = "triggered";
          await state.set("scheduled_campaigns", campaign.campaignId, campaign);

          // Emit event to trigger email delivery
          await emit({
            topic: "content-personalized",
            data: {
              campaignId: campaign.campaignId,
              scheduledFor: undefined, // Remove scheduled time since we're sending now
              personalizedEmails: campaign.personalizedEmails,
              totalEmails: campaign.personalizedEmails.length,
            },
          });

          // Update the main campaign status
          const mainCampaign = (await state.get(
            "campaigns",
            campaign.campaignId
          )) as any;
          if (mainCampaign) {
            mainCampaign.status = "processing";
            mainCampaign.triggeredAt = currentTime.toISOString();
            await state.set("campaigns", campaign.campaignId, mainCampaign);
          }

          triggeredCount++;

          logger.info("Successfully triggered scheduled campaign", {
            campaignId: campaign.campaignId,
            emailCount: campaign.personalizedEmails.length,
          });
        } else if (campaign.status === "triggered") {
          // Clean up already triggered campaigns that are older than 1 hour
          const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
          const scheduledTime = new Date(campaign.scheduledFor);

          if (scheduledTime < oneHourAgo) {
            logger.info("Cleaning up old triggered campaign", {
              campaignId: campaign.campaignId,
              scheduledFor: campaign.scheduledFor,
            });

            // Remove from scheduled campaigns
            await state.delete("scheduled_campaigns", campaign.campaignId);
          }
        } else if (currentTime < scheduledTime) {
          const timeUntilSend = Math.round(
            (scheduledTime.getTime() - currentTime.getTime()) / 1000 / 60
          );
          logger.info("Campaign not ready yet", {
            campaignId: campaign.campaignId,
            minutesUntilSend: timeUntilSend,
          });
        }
      } catch (campaignError) {
        logger.error("Error processing scheduled campaign", {
          campaignId: campaign.campaignId,
          error:
            campaignError instanceof Error
              ? campaignError.message
              : String(campaignError),
        });

        // Mark campaign as failed
        campaign.status = "failed";
        (campaign as any).error =
          campaignError instanceof Error
            ? campaignError.message
            : String(campaignError);
        await state.set("scheduled_campaigns", campaign.campaignId, campaign);

        // Update main campaign status
        const mainCampaign = (await state.get(
          "campaigns",
          campaign.campaignId
        )) as any;
        if (mainCampaign) {
          mainCampaign.status = "failed";
          mainCampaign.error = (campaign as any).error;
          await state.set("campaigns", campaign.campaignId, mainCampaign);
        }
      }
    }

    logger.info("Scheduled campaign check completed", {
      totalChecked: processedCount,
      campaignsTriggered: triggeredCount,
      nextCheckIn: "5 minutes",
    });

    // Clean up old completed campaigns (older than 24 hours)
    await cleanupOldCampaigns(state, logger);
  } catch (error) {
    logger.error("Email scheduler process failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function cleanupOldCampaigns(state: any, logger: any) {
  try {
    const scheduledCampaigns = await (state.getGroup as any)(
      "scheduled_campaigns"
    );
    const currentTime = new Date();
    const twentyFourHoursAgo = new Date(
      currentTime.getTime() - 24 * 60 * 60 * 1000
    );

    let cleanedCount = 0;

    for (const campaign of scheduledCampaigns) {
      if (campaign.status === "triggered" || campaign.status === "failed") {
        const scheduledTime = new Date(campaign.scheduledFor);

        if (scheduledTime < twentyFourHoursAgo) {
          await state.delete("scheduled_campaigns", campaign.campaignId);
          cleanedCount++;

          logger.info("Cleaned up old campaign", {
            campaignId: campaign.campaignId,
            status: campaign.status,
            scheduledFor: campaign.scheduledFor,
          });
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old scheduled campaigns`);
    }
  } catch (error) {
    logger.warn("Error during cleanup", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
