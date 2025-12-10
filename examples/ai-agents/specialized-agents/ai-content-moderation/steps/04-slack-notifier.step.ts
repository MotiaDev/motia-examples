import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import { WebClient } from "@slack/web-api";

const SlackNotifierInputSchema = z.object({
  submissionId: z.string(),
  decision: z.string(),
  confidence: z.number(),
  reason: z.string(),
  autoDecision: z.boolean(),
  overallScore: z.number(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "SlackNotifier",
  description: "Sends content moderation notifications to Slack channels",
  subscribes: ["content.needsReview"],
  emits: [],
  //   virtualEmits: ["content.reviewed"],
  virtualEmits: ["slack.button.clicked"],
  input: SlackNotifierInputSchema,
  flows: ["content-moderation"],
};

// Initialize Slack client
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

export const handler: Handlers["SlackNotifier"] = async (
  input,
  { logger, state }
) => {
  const {
    submissionId,
    decision,
    confidence,
    reason,
    autoDecision,
    overallScore,
    timestamp,
  } = input;

  logger.info(`Processing Slack notification`, {
    submissionId,
    decision,
    autoDecision,
  });

  // Get original submission data to access imageUrl and text
  const originalSubmission: any = await state.get(
    "moderation",
    `submission:${submissionId}`
  );

  // Store submission data for webhook handler
  await state.set("moderation", `submission:${submissionId}`, {
    submissionId,
    decision,
    confidence,
    reason,
    autoDecision,
    overallScore,
    timestamp,
    status: "pending",
    // Include original data
    text: originalSubmission?.text,
    imageUrl: originalSubmission?.imageUrl,
    userId: originalSubmission?.userId,
    platform: originalSubmission?.platform,
  });

  // Handle auto-decisions vs human review
  if (autoDecision) {
    logger.info(`Auto-decision made: ${decision}`, {
      submissionId,
      confidence,
      reason,
    });

    // For auto-decisions, just log and execute final action
    // In a real system, you'd execute the action here (publish/block content)
    await state.set("moderation", `submission:${submissionId}`, {
      submissionId,
      decision,
      confidence,
      reason,
      autoDecision,
      overallScore,
      timestamp,
      status: "completed",
      reviewedBy: "system",
      reviewedAt: new Date().toISOString(),
      // Include original data
      text: originalSubmission?.text,
      imageUrl: originalSubmission?.imageUrl,
      userId: originalSubmission?.userId,
      platform: originalSubmission?.platform,
    });

    return;
  }

  // Send to appropriate Slack channel for human review
  const channel = getSlackChannel(overallScore);

  try {
    const result = await web.chat.postMessage({
      channel,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: getReviewTitle(overallScore),
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
              text: `*Confidence:*\n${(confidence * 100).toFixed(1)}%`,
            },
            {
              type: "mrkdwn",
              text: `*Submitted:*\n${new Date(timestamp).toLocaleString()}`,
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
        // Add text content if it exists
        ...(originalSubmission?.text
          ? [
              {
                type: "section" as const,
                text: {
                  type: "mrkdwn" as const,
                  text: `*Content:*\n\`\`\`${originalSubmission.text}\`\`\``,
                },
              },
            ]
          : []),
        // Add image if it exists
        ...(originalSubmission?.imageUrl
          ? [
              {
                type: "image" as const,
                image_url: originalSubmission.imageUrl,
                alt_text: "Content under review",
              },
            ]
          : []),
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "✅ Approve",
              },
              style: "primary",
              value: JSON.stringify({ submissionId, action: "approve" }),
              action_id: "moderate_approve",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "❌ Reject",
              },
              style: "danger",
              value: JSON.stringify({ submissionId, action: "reject" }),
              action_id: "moderate_reject",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "🔺 Escalate",
              },
              value: JSON.stringify({ submissionId, action: "escalate" }),
              action_id: "moderate_escalate",
            },
          ],
        },
      ],
    });

    // Store message details for webhook handler
    await state.set("moderation", `submission:${submissionId}`, {
      submissionId,
      decision,
      confidence,
      reason,
      autoDecision,
      overallScore,
      timestamp,
      status: "awaiting_review",
      slackChannel: channel,
      slackMessageTs: result.ts,
      // Include original data
      text: originalSubmission?.text,
      imageUrl: originalSubmission?.imageUrl,
      userId: originalSubmission?.userId,
      platform: originalSubmission?.platform,
    });

    logger.info(`Slack notification sent`, {
      submissionId,
      channel,
      messageTs: result.ts,
    });
  } catch (error) {
    logger.error(`Failed to send Slack notification`, {
      submissionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Mark as failed
    await state.set("moderation", `submission:${submissionId}`, {
      submissionId,
      decision,
      confidence,
      reason,
      autoDecision,
      overallScore,
      timestamp,
      status: "notification_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      // Include original data
      text: originalSubmission?.text,
      imageUrl: originalSubmission?.imageUrl,
      userId: originalSubmission?.userId,
      platform: originalSubmission?.platform,
    });
  }
};

function getSlackChannel(overallScore: number): string {
  if (overallScore >= 0.7) {
    return process.env.SLACK_CHANNEL_URGENT || "#content-urgent";
  } else if (overallScore >= 0.5) {
    return process.env.SLACK_CHANNEL_ESCALATED || "#content-escalated";
  } else {
    return process.env.SLACK_CHANNEL_MODERATION || "#content-moderation";
  }
}

function getReviewTitle(overallScore: number): string {
  if (overallScore >= 0.7) {
    return "🚨 Review Required - Priority: HIGH";
  } else if (overallScore >= 0.5) {
    return "⚠️ Review Required - Priority: NORMAL";
  } else {
    return "📋 Review Required - Priority: LOW";
  }
}
