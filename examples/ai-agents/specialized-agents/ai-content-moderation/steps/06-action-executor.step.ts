import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import { WebClient } from "@slack/web-api";

const ActionExecutorInputSchema = z.object({
  submissionId: z.string(),
  decision: z.enum(["approved", "rejected", "escalated"]),
  reviewedBy: z.string(),
  reviewedAt: z.string(),
  channel: z.string(),
  messageTs: z.string(),
  reason: z.string().optional(),
});

export const config: EventConfig = {
  type: "event",
  name: "ActionExecutor",
  description: "Executes final actions based on moderation decisions",
  subscribes: ["content.reviewed"],
  emits: [],
  input: ActionExecutorInputSchema,
  flows: ["content-moderation"],
};

// Initialize Slack client
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

export const handler: Handlers["ActionExecutor"] = async (
  input,
  { logger, state }
) => {
  const {
    submissionId,
    decision,
    reviewedBy,
    reviewedAt,
    channel,
    messageTs,
    reason,
  } = input;

  logger.info("Executing final action", { submissionId, decision, reviewedBy });

  try {
    // Get the full submission data
    const submission = await state.get(
      "moderation",
      `submission:${submissionId}`
    );
    if (!submission) {
      logger.error("Submission not found for final action", { submissionId });
      return;
    }

    // Execute the actual content action based on decision
    await executeContentAction(submission, decision, logger);

    // Update Slack message with final status
    await updateSlackMessage(
      channel,
      messageTs,
      submission,
      decision,
      reviewedBy,
      reviewedAt
    );

    // Update final state
    await state.set("moderation", `submission:${submissionId}`, {
      ...submission,
      status: "completed",
      finalDecision: decision,
      executedAt: new Date().toISOString(),
      completedBy: reviewedBy,
    });

    // Send completion notification if escalated
    if (decision === "escalated") {
      await sendEscalationNotification(submission, reviewedBy, channel);
    }

    logger.info("Content moderation workflow completed", {
      submissionId,
      decision,
      reviewedBy,
      workflow: "success",
    });
  } catch (error) {
    logger.error("Failed to execute final action", {
      submissionId,
      decision,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Mark as failed in state
    await state.set("moderation", `submission:${submissionId}`, {
      submissionId,
      status: "execution_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      failedAt: new Date().toISOString(),
    });
  }
};

async function executeContentAction(
  submission: any,
  decision: string,
  logger: any
) {
  // In a real implementation, this would:
  // - Publish approved content to your platform
  // - Block/delete rejected content
  // - Move escalated content to senior review queue

  const { submissionId, userId, text, imageUrl, platform } = submission;

  switch (decision) {
    case "approved":
      logger.info("Publishing content", { submissionId, userId, platform });
      // TODO: Implement actual content publishing logic
      // Example: await contentService.publish({ submissionId, text, imageUrl, userId });
      break;

    case "rejected":
      logger.info("Blocking content", { submissionId, userId, platform });
      // TODO: Implement actual content blocking logic
      // Example: await contentService.block({ submissionId, userId, reason: 'Policy violation' });
      break;

    case "escalated":
      logger.info("Escalating content for senior review", {
        submissionId,
        userId,
        platform,
      });
      // TODO: Implement escalation logic
      // Example: await seniorReviewService.add({ submissionId, originalReviewer, priority: 'high' });
      break;

    default:
      logger.warn("Unknown decision type", { decision, submissionId });
  }
}

async function updateSlackMessage(
  channel: string,
  messageTs: string,
  submission: any,
  decision: string,
  reviewedBy: string,
  reviewedAt: string
) {
  const { submissionId, overallScore } = submission;
  const statusEmoji = getStatusEmoji(decision);
  const statusText = getStatusText(decision);

  try {
    await web.chat.update({
      channel,
      ts: messageTs,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${statusEmoji} Content Review - ${statusText}`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Submission ID:*\n${submissionId}`,
            },
            {
              type: "mrkdwn",
              text: `*Risk Score:*\n${(overallScore * 100).toFixed(1)}%`,
            },
            {
              type: "mrkdwn",
              text: `*Decision:*\n${statusText}`,
            },
            {
              type: "mrkdwn",
              text: `*Reviewed By:*\n@${reviewedBy}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Completed:* ${new Date(reviewedAt).toLocaleString()}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "plain_text",
              text: `✅ Action executed successfully`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    // Log but don't fail the whole process if Slack update fails
    console.error("Failed to update Slack message:", error);
  }
}

async function sendEscalationNotification(
  submission: any,
  reviewedBy: string,
  originalChannel: string
) {
  const { submissionId, overallScore, reason } = submission;
  const escalationChannel =
    process.env.SLACK_CHANNEL_ESCALATED || "#content-escalated";

  try {
    await web.chat.postMessage({
      channel: escalationChannel,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🔺 Content Escalated for Senior Review",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Submission ID:*\n${submissionId}`,
            },
            {
              type: "mrkdwn",
              text: `*Risk Score:*\n${(overallScore * 100).toFixed(1)}%`,
            },
            {
              type: "mrkdwn",
              text: `*Escalated By:*\n@${reviewedBy}`,
            },
            {
              type: "mrkdwn",
              text: `*Original Channel:*\n<#${originalChannel}>`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Reason:* ${reason}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "✅ Senior Approve",
              },
              style: "primary",
              value: JSON.stringify({ submissionId, action: "senior_approve" }),
              action_id: "senior_approve",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "❌ Senior Reject",
              },
              style: "danger",
              value: JSON.stringify({ submissionId, action: "senior_reject" }),
              action_id: "senior_reject",
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Failed to send escalation notification:", error);
  }
}

function getStatusEmoji(decision: string): string {
  switch (decision) {
    case "approved":
      return "✅";
    case "rejected":
      return "❌";
    case "escalated":
      return "🔺";
    default:
      return "❓";
  }
}

function getStatusText(decision: string): string {
  switch (decision) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "escalated":
      return "ESCALATED";
    default:
      return "UNKNOWN";
  }
}
