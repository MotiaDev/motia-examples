import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import AppwriteMessagingProvider from "../services/appwrite.provider";

// Email service interfaces
interface EmailProvider {
  send(email: EmailData): Promise<EmailResult>;
}

interface EmailData {
  to: string;
  subject: string;
  htmlContent: string;
  campaignId: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface PersonalizedEmail {
  id: string;
  campaignId: string;
  userId: string;
  email: string;
  subject: string;
  content: string;
  status: string;
  createdAt: string;
}

export const config: EventConfig = {
  type: "event",
  name: "EmailDelivery",
  description: "Processes and delivers personalized emails to recipients",
  flows: ["email-automation"],
  subscribes: ["content-personalized"],
  emits: ["email-sent"],
  input: z.object({
    campaignId: z.string(),
    scheduledFor: z.string().optional(),
    personalizedEmails: z.array(z.any()),
    totalEmails: z.number(),
  }),
};

export const handler: Handlers["EmailDelivery"] = async (
  input,
  { traceId, logger, state, emit }
) => {
  logger.info("Step 04 – Starting email delivery", {
    campaignId: input.campaignId,
    totalEmails: input.totalEmails,
    scheduledFor: input.scheduledFor,
  });

  const { campaignId, personalizedEmails, scheduledFor } = input;

  try {
    // Check if campaign is scheduled for future
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
      logger.info(
        "Campaign is scheduled for future, storing for later delivery",
        {
          campaignId,
          scheduledFor,
        }
      );

      // Store for cron job to pick up
      await state.set("scheduled_campaigns", campaignId, {
        campaignId,
        scheduledFor,
        personalizedEmails,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      });

      return; // Exit early for scheduled campaigns
    }

    // Initialize email provider
    const emailProvider = new AppwriteMessagingProvider();

    let successCount = 0;
    let failureCount = 0;
    const deliveryResults = [];

    // Update campaign status to sending
    await updateCampaignStatus(campaignId, "sending", state);

    // Process emails in batches to avoid overwhelming the email service
    const batchSize = 10;
    const batches = chunkArray(
      personalizedEmails as PersonalizedEmail[],
      batchSize
    );

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      logger.info(`Processing batch ${batchIndex + 1}/${batches.length}`, {
        campaignId,
        batchSize: batch.length,
      });

      // Process batch in parallel
      const batchPromises = batch.map(async (email: PersonalizedEmail) => {
        return await sendSingleEmail(email, emailProvider, logger, state, emit);
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // Process batch results
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          deliveryResults.push(result.value);
          if (result.value.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } else {
          failureCount++;
          logger.error("Batch email processing failed", {
            error: result.reason,
          });
        }
      }

      // Add delay between batches to respect rate limits
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update campaign metrics
    await updateCampaignMetrics(campaignId, successCount, failureCount, state);

    // Update campaign status to completed
    await updateCampaignStatus(campaignId, "completed", state);

    logger.info("Email delivery completed", {
      campaignId,
      successCount,
      failureCount,
      totalEmails: personalizedEmails.length,
      successRate: `${(
        (successCount / personalizedEmails.length) *
        100
      ).toFixed(1)}%`,
    });
  } catch (error) {
    logger.error("Email delivery process failed", {
      campaignId,
      error: error instanceof Error ? error.message : String(error),
    });

    await updateCampaignStatus(campaignId, "failed", state);
  }
};

async function sendSingleEmail(
  email: PersonalizedEmail,
  emailProvider: EmailProvider,
  logger: any,
  state: any,
  emit: any
): Promise<{
  success: boolean;
  emailId: string;
  messageId?: string;
  error?: string;
}> {
  try {
    const emailData: EmailData = {
      to: email.email,
      subject: email.subject,
      htmlContent: email.content,
      campaignId: email.campaignId,
    };

    const result = await emailProvider.send(emailData);

    if (result.success) {
      // Update email status in state
      await state.set("emails", email.id, {
        ...email,
        status: "sent",
        messageId: result.messageId,
        sentAt: new Date().toISOString(),
      });

      // Emit success event
      await emit({
        topic: "email-sent",
        data: {
          emailId: email.id,
          campaignId: email.campaignId,
          userId: email.userId,
          email: email.email,
          messageId: result.messageId,
          sentAt: new Date().toISOString(),
        },
      });

      return { success: true, emailId: email.id, messageId: result.messageId };
    } else {
      // Update email status to failed
      await state.set("emails", email.id, {
        ...email,
        status: "failed",
        error: result.error,
        failedAt: new Date().toISOString(),
      });

      return { success: false, emailId: email.id, error: result.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Single email send failed", {
      emailId: email.id,
      error: errorMessage,
    });

    await state.set("emails", email.id, {
      ...email,
      status: "failed",
      error: errorMessage,
      failedAt: new Date().toISOString(),
    });

    return { success: false, emailId: email.id, error: errorMessage };
  }
}

async function updateCampaignStatus(
  campaignId: string,
  status: string,
  state: any
) {
  const campaign = await state.get("campaigns", campaignId);
  if (campaign) {
    campaign.status = status;
    campaign.updatedAt = new Date().toISOString();
    await state.set("campaigns", campaignId, campaign);
  }
}

async function updateCampaignMetrics(
  campaignId: string,
  sent: number,
  failed: number,
  state: any
) {
  const campaign = await state.get("campaigns", campaignId);
  if (campaign) {
    // Initialize metrics if it doesn't exist
    if (!campaign.metrics) {
      campaign.metrics = {};
    }

    campaign.metrics.sent = sent;
    campaign.metrics.failed = failed;
    campaign.updatedAt = new Date().toISOString();
    await state.set("campaigns", campaignId, campaign);
  }
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Mock email provider for demonstration
class MockEmailProvider implements EmailProvider {
  async send(email: EmailData): Promise<EmailResult> {
    // Simulate API call delay
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 100 + 50)
    );

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
      return {
        success: true,
        messageId: `msg_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      };
    } else {
      return {
        success: false,
        error: "Simulated delivery failure",
      };
    }
  }
}
