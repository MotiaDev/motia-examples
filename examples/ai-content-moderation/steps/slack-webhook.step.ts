import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import crypto from "crypto";
import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export const config: ApiRouteConfig = {
  type: "api",
  name: "SlackWebhook",
  description: "Handles Slack interactive button responses",
  path: "/webhook/slack-action",
  method: "POST",
  virtualSubscribes: ["slack.button.clicked"],
  emits: ["content.reviewed", "slack.action.processed", "slack.action.failed"],
  bodySchema: z.object({
    payload: z.string().optional(),
    // Slack sends form-encoded payload
  }),
  responseSchema: {
    200: z.object({
      text: z.string().optional(),
      response_type: z.string().optional(),
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  flows: ["content-moderation"],
};

interface SlackPayload {
  type: "interactive_message" | "block_actions";
  user: {
    id: string;
    name: string;
  };
  actions: Array<{
    action_id: string;
    value: string;
    text: {
      type: string;
      text: string;
    };
  }>;
  channel: {
    id: string;
    name: string;
  };
  message: {
    ts: string;
    text: string;
  };
  response_url: string;
  trigger_id?: string;
}

interface ReviewDecision {
  submissionId: string;
  decision: "approved" | "rejected" | "escalated";
  reviewedBy: string;
  reviewedAt: string;
  channel: string;
  messageTs: string;
  reason?: string;
}

export const handler: Handlers["SlackWebhook"] = async (
  req,
  { logger, emit, state, traceId }
) => {
  logger.info("Slack webhook received", {
    headers: Object.keys(req.headers),
    bodyType: typeof req.body,
  });

  try {
    // Verify Slack signature
    if (!verifySlackSignature(req)) {
      logger.warn("Invalid Slack signature");
      return {
        status: 401,
        body: { error: "Invalid signature" },
      };
    }

    // Parse payload (Slack sends it as form-encoded)
    let payload: SlackPayload;
    try {
      const payloadString =
        req.body.payload ||
        (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
      payload = JSON.parse(payloadString);
    } catch (error) {
      logger.error("Failed to parse Slack payload", {
        error: (error as Error).message,
        body: req.body,
      });
      return {
        status: 400,
        body: { error: "Invalid payload format" },
      };
    }

    logger.info("Processing Slack action", {
      type: payload.type,
      user: payload.user.name,
      actions: payload.actions.map((a) => ({
        action_id: a.action_id,
        value: a.value,
      })),
    });

    // Process each action
    for (const action of payload.actions) {
      const submissionId = extractSubmissionId(action.value);
      if (!submissionId) {
        logger.warn("Invalid action value format", { value: action.value });
        continue;
      }

      const decision = mapActionToDecision(action.action_id);
      if (!decision) {
        logger.warn("Unknown action ID", { action_id: action.action_id });
        continue;
      }

      // Create review decision
      const reviewDecision: ReviewDecision = {
        submissionId,
        decision,
        reviewedBy: payload.user.name,
        reviewedAt: new Date().toISOString(),
        channel: payload.channel.name,
        messageTs: payload.message.ts,
        reason: `Manual review via Slack by ${payload.user.name}`,
      };

      // Store decision in state
      await state.set(traceId, `review_${submissionId}`, reviewDecision);

      // Emit review event
      await emit({
        topic: "content.reviewed",
        data: reviewDecision,
      });

      // Update Slack message to show decision
      await updateSlackMessage(
        payload,
        action,
        submissionId,
        decision,
        payload.user.name
      );

      logger.info("Slack action processed", {
        submissionId,
        decision,
        reviewedBy: payload.user.name,
      });

      // Emit success event
      await emit({
        topic: "slack.action.processed",
        data: {
          submissionId,
          decision,
          reviewedBy: payload.user.name,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return {
      status: 200,
      body: {
        text: "Action processed successfully",
        response_type: "ephemeral",
      },
    };
  } catch (error) {
    logger.error("Slack webhook processing failed", {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    await emit({
      topic: "slack.action.failed",
      data: {
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      status: 500,
      body: { error: "Failed to process action" },
    };
  }
};

function verifySlackSignature(req: any): boolean {
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
  if (!slackSigningSecret) {
    return false; // Skip verification if no secret configured
  }

  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];

  if (!signature || !timestamp) {
    return false;
  }

  // Check timestamp (prevent replay attacks)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    return false; // Reject if older than 5 minutes
  }

  // Compute expected signature
  const body =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  const baseString = `v0:${timestamp}:${body}`;
  const expectedSignature = `v0=${crypto
    .createHmac("sha256", slackSigningSecret)
    .update(baseString)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

function extractSubmissionId(actionValue: string): string | null {
  const match = actionValue.match(/^(approve|reject|escalate)_(.+)$/);
  return match ? match[2] : null;
}

function mapActionToDecision(
  actionId: string
): "approved" | "rejected" | "escalated" | null {
  switch (actionId) {
    case "approve_content":
      return "approved";
    case "reject_content":
      return "rejected";
    case "escalate_content":
      return "escalated";
    default:
      return null;
  }
}

async function updateSlackMessage(
  payload: SlackPayload,
  action: any,
  submissionId: string,
  decision: string,
  userName: string
): Promise<void> {
  try {
    const emoji =
      decision === "approved" ? "✅" : decision === "rejected" ? "❌" : "⚠️";
    const statusText = `${emoji} ${decision.toUpperCase()} by @${userName}`;

    // Update the message to show the decision
    await slack.chat.update({
      channel: payload.channel.id,
      ts: payload.message.ts,
      text: `Content Review - ${submissionId}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Submission ${submissionId}*\n${statusText} at ${new Date().toLocaleString()}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Decision made by @${userName} • ${new Date().toLocaleString()}`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    // Log error but don't fail the whole operation
    console.error("Failed to update Slack message:", error);
  }
}
