import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export const config: EventConfig = {
  type: "event",
  name: "SlackNotifier",
  description: "Sends content review notifications to Slack channels",
  subscribes: ["content.needsReview"],
  emits: ["slack.notification.sent", "slack.notification.failed"],
  virtualEmits: ["slack.button.clicked"],
  input: z.object({
    submissionId: z.string(),
    decision: z.literal("needsReview"),
    confidence: z.number(),
    reason: z.string(),
    autoDecision: z.boolean(),
    overallScore: z.number(),
    timestamp: z.string(),
  }),
  flows: ["content-moderation"],
};

interface SlackChannel {
  name: string;
  id: string;
}

const CHANNELS: Record<string, SlackChannel> = {
  moderation: {
    name: "content-moderation",
    id: process.env.SLACK_CHANNEL_MODERATION || "",
  },
  urgent: {
    name: "content-urgent",
    id: process.env.SLACK_CHANNEL_URGENT || "",
  },
  escalated: {
    name: "content-escalated",
    id: process.env.SLACK_CHANNEL_ESCALATED || "",
  },
};

export const handler: Handlers["SlackNotifier"] = async (
  input,
  { logger, emit, state, traceId }
) => {
  logger.info("Sending Slack notification for content review", {
    submissionId: input.submissionId,
    overallScore: input.overallScore,
    confidence: input.confidence,
  });

  try {
    // Determine appropriate channel based on risk score and confidence
    const channel = determineChannel(input.overallScore, input.confidence);

    logger.info("Selected Slack channel", {
      submissionId: input.submissionId,
      channel: channel.name,
      overallScore: input.overallScore,
    });

    // Get original content from state for display
    const originalSubmission = await state.get(traceId, "submission");
    const analysisResults = await state.get(traceId, "analysis");

    // Build Slack message blocks
    const blocks = buildMessageBlocks(
      input,
      originalSubmission,
      analysisResults
    );

    // Send message to Slack
    const result = await slack.chat.postMessage({
      channel: channel.id,
      text: `Content Review Required - Submission ${input.submissionId}`,
      blocks: blocks,
      unfurl_links: false,
      unfurl_media: false,
    });

    if (result.ok && result.ts) {
      logger.info("Slack notification sent successfully", {
        submissionId: input.submissionId,
        channel: channel.name,
        messageTs: result.ts,
      });

      // Store notification info for tracking
      await state.set(traceId, "slack_notification", {
        channel: channel.name,
        messageTs: result.ts,
        submissionId: input.submissionId,
        sentAt: new Date().toISOString(),
      });

      await emit({
        topic: "slack.notification.sent",
        data: {
          submissionId: input.submissionId,
          channel: channel.name,
          messageTs: result.ts,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      throw new Error(`Slack API error: ${result.error || "Unknown error"}`);
    }
  } catch (error) {
    logger.error("Failed to send Slack notification", {
      submissionId: input.submissionId,
      error: error.message,
    });

    await emit({
      topic: "slack.notification.failed",
      data: {
        submissionId: input.submissionId,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

function determineChannel(
  overallScore: number,
  confidence: number
): SlackChannel {
  // High risk score (80+) - escalated channel
  if (overallScore >= 80) {
    return CHANNELS.escalated;
  }

  // Medium-high risk (60-79) or very low confidence - urgent channel
  if (overallScore >= 60 || confidence < 30) {
    return CHANNELS.urgent;
  }

  // Default to regular moderation channel
  return CHANNELS.moderation;
}

function buildMessageBlocks(
  decision: any,
  originalSubmission: any,
  analysisResults: any
): any[] {
  const urgencyColor =
    decision.overallScore >= 80
      ? "danger"
      : decision.overallScore >= 60
      ? "warning"
      : "good";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🔍 Content Review Required`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Submission ID:*\n${decision.submissionId}`,
        },
        {
          type: "mrkdwn",
          text: `*Risk Score:* ${decision.overallScore}/100`,
        },
        {
          type: "mrkdwn",
          text: `*Confidence:* ${decision.confidence}%`,
        },
        {
          type: "mrkdwn",
          text: `*Platform:* ${originalSubmission?.platform || "Unknown"}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Reason:* ${decision.reason}`,
      },
    },
  ];

  // Add content preview if available
  if (originalSubmission?.text) {
    const truncatedText =
      originalSubmission.text.length > 200
        ? originalSubmission.text.substring(0, 200) + "..."
        : originalSubmission.text;

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Text Content:*\n\`\`\`${truncatedText}\`\`\``,
      },
    });
  }

  // Add image if available
  if (originalSubmission?.imageUrl) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Image:* <${originalSubmission.imageUrl}|View Image>`,
      },
      accessory: {
        type: "image",
        image_url: originalSubmission.imageUrl,
        alt_text: "Content image",
      },
    });
  }

  // Add analysis details if available
  if (analysisResults) {
    const analysisText = buildAnalysisText(analysisResults);
    if (analysisText) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: analysisText,
        },
      });
    }
  }

  // Add action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "✅ Approve",
        },
        style: "primary",
        value: `approve_${decision.submissionId}`,
        action_id: "approve_content",
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "❌ Reject",
        },
        style: "danger",
        value: `reject_${decision.submissionId}`,
        action_id: "reject_content",
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "⚠️ Escalate",
        },
        value: `escalate_${decision.submissionId}`,
        action_id: "escalate_content",
      },
    ],
  });

  // Add divider
  blocks.push({
    type: "divider",
  });

  return blocks;
}

function buildAnalysisText(analysisResults: any): string {
  const parts: string[] = [];

  if (analysisResults.textAnalysis) {
    const text = analysisResults.textAnalysis;
    parts.push(
      `*Text Analysis:* ${text.hasToxicity ? "⚠️" : "✅"} Score: ${
        text.toxicityScore
      }/100`
    );

    if (text.categories && text.categories.length > 0) {
      parts.push(`Categories: ${text.categories.join(", ")}`);
    }
  }

  if (analysisResults.imageAnalysis) {
    const image = analysisResults.imageAnalysis;
    parts.push(
      `*Image Analysis:* ${image.isUnsafe ? "⚠️" : "✅"} Score: ${
        image.safetyScore
      }/100`
    );

    if (image.categories && image.categories.length > 0) {
      parts.push(`Categories: ${image.categories.join(", ")}`);
    }
  }

  return parts.length > 0 ? `*Analysis Details:*\n${parts.join("\n")}` : "";
}
