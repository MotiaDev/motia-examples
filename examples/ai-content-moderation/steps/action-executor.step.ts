import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export const config: EventConfig = {
  type: "event",
  name: "ActionExecutor",
  description: "Executes final content moderation actions and cleanup",
  subscribes: ["content.reviewed"],
  emits: ["content.finalized", "action.executed", "action.failed"],
  input: z.object({
    submissionId: z.string(),
    decision: z.enum(["approved", "rejected", "escalated"]),
    reviewedBy: z.string(),
    reviewedAt: z.string(),
    channel: z.string(),
    messageTs: z.string(),
    reason: z.string().optional(),
  }),
  flows: ["content-moderation"],
};

interface ContentStatus {
  submissionId: string;
  status: "approved" | "rejected" | "escalated";
  reviewedBy: string;
  reviewedAt: string;
  originalSubmission?: any;
  analysisResults?: any;
  finalReason: string;
}

interface ActionResult {
  submissionId: string;
  action: string;
  success: boolean;
  details: string;
  timestamp: string;
}

export const handler: Handlers["ActionExecutor"] = async (
  input,
  { logger, emit, state, traceId }
) => {
  logger.info("Executing final content action", {
    submissionId: input.submissionId,
    decision: input.decision,
    reviewedBy: input.reviewedBy,
  });

  try {
    // Retrieve original submission and analysis data
    const originalSubmission = await state.get(traceId, "submission");
    const analysisResults = await state.get(traceId, "analysis");
    const routingDecision = await state.get(traceId, "decision");

    // Execute the appropriate action based on decision
    const actionResults: ActionResult[] = [];

    if (input.decision === "approved") {
      const result = await executeApprovalAction(
        input,
        originalSubmission,
        analysisResults
      );
      actionResults.push(result);
      logger.info("Content approved and actions executed", {
        submissionId: input.submissionId,
        success: result.success,
      });
    } else if (input.decision === "rejected") {
      const result = await executeRejectionAction(
        input,
        originalSubmission,
        analysisResults
      );
      actionResults.push(result);
      logger.info("Content rejected and actions executed", {
        submissionId: input.submissionId,
        success: result.success,
      });
    } else if (input.decision === "escalated") {
      const result = await executeEscalationAction(
        input,
        originalSubmission,
        analysisResults
      );
      actionResults.push(result);
      logger.info("Content escalated", {
        submissionId: input.submissionId,
        success: result.success,
      });
    }

    // Create final content status record
    const finalStatus: ContentStatus = {
      submissionId: input.submissionId,
      status: input.decision,
      reviewedBy: input.reviewedBy,
      reviewedAt: input.reviewedAt,
      originalSubmission,
      analysisResults,
      finalReason: input.reason || `${input.decision} by human reviewer`,
    };

    // Store final status
    await state.set(traceId, "final_status", finalStatus);

    // Send confirmation back to Slack
    await sendSlackConfirmation(input, finalStatus, actionResults);

    // Emit finalization events
    await emit({
      topic: "content.finalized",
      data: finalStatus,
    });

    for (const actionResult of actionResults) {
      await emit({
        topic: "action.executed",
        data: actionResult,
      });
    }

    // Clean up state after successful processing
    await cleanupState(state, traceId, input.submissionId);

    logger.info("Content moderation workflow completed", {
      submissionId: input.submissionId,
      decision: input.decision,
      actionsExecuted: actionResults.length,
    });
  } catch (error) {
    logger.error("Failed to execute final action", {
      submissionId: input.submissionId,
      decision: input.decision,
      error: (error as Error).message,
    });

    // Emit failure event
    await emit({
      topic: "action.failed",
      data: {
        submissionId: input.submissionId,
        decision: input.decision,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
    });

    // Send error notification to Slack
    await sendSlackErrorNotification(input, (error as Error).message);
  }
};

async function executeApprovalAction(
  decision: any,
  originalSubmission: any,
  analysisResults: any
): Promise<ActionResult> {
  try {
    // In a real implementation, this would:
    // 1. Update content database status to 'approved'
    // 2. Allow content to be visible/published
    // 3. Log approval for audit trail
    // 4. Notify content creator if needed
    // 5. Update metrics/analytics

    logger.info("Executing approval actions", {
      submissionId: decision.submissionId,
      platform: originalSubmission?.platform,
    });

    // Simulate API calls to content management system
    await simulateContentStatusUpdate(decision.submissionId, "approved");
    await simulateUserNotification(originalSubmission?.userId, "approved");

    return {
      submissionId: decision.submissionId,
      action: "approve",
      success: true,
      details: `Content approved and made visible on ${
        originalSubmission?.platform || "platform"
      }`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      submissionId: decision.submissionId,
      action: "approve",
      success: false,
      details: `Approval failed: ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

async function executeRejectionAction(
  decision: any,
  originalSubmission: any,
  analysisResults: any
): Promise<ActionResult> {
  try {
    // In a real implementation, this would:
    // 1. Update content database status to 'rejected'
    // 2. Hide/remove content from platform
    // 3. Log rejection reason for audit
    // 4. Notify content creator with reason
    // 5. Apply any penalties if needed
    // 6. Update user violation history

    logger.info("Executing rejection actions", {
      submissionId: decision.submissionId,
      platform: originalSubmission?.platform,
    });

    await simulateContentStatusUpdate(decision.submissionId, "rejected");
    await simulateContentRemoval(decision.submissionId);
    await simulateUserNotification(originalSubmission?.userId, "rejected");

    return {
      submissionId: decision.submissionId,
      action: "reject",
      success: true,
      details: `Content rejected and removed from ${
        originalSubmission?.platform || "platform"
      }`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      submissionId: decision.submissionId,
      action: "reject",
      success: false,
      details: `Rejection failed: ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

async function executeEscalationAction(
  decision: any,
  originalSubmission: any,
  analysisResults: any
): Promise<ActionResult> {
  try {
    // In a real implementation, this would:
    // 1. Create escalation ticket in support system
    // 2. Assign to senior moderator queue
    // 3. Temporarily quarantine content
    // 4. Set higher priority flags
    // 5. Notify escalation team

    logger.info("Executing escalation actions", {
      submissionId: decision.submissionId,
      platform: originalSubmission?.platform,
    });

    await simulateEscalationTicket(decision.submissionId, decision.reviewedBy);
    await simulateContentQuarantine(decision.submissionId);

    return {
      submissionId: decision.submissionId,
      action: "escalate",
      success: true,
      details: `Content escalated to senior moderation team`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      submissionId: decision.submissionId,
      action: "escalate",
      success: false,
      details: `Escalation failed: ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

async function sendSlackConfirmation(
  decision: any,
  status: ContentStatus,
  actionResults: ActionResult[]
): Promise<void> {
  try {
    const emoji =
      status.status === "approved"
        ? "✅"
        : status.status === "rejected"
        ? "❌"
        : "⚠️";
    const successCount = actionResults.filter((r) => r.success).length;
    const totalActions = actionResults.length;

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *Content ${status.status.toUpperCase()}*\nSubmission: ${
            status.submissionId
          }`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Reviewed by:* ${status.reviewedBy}`,
          },
          {
            type: "mrkdwn",
            text: `*Actions:* ${successCount}/${totalActions} completed`,
          },
        ],
      },
    ];

    // Add action details
    if (actionResults.length > 0) {
      const actionText = actionResults
        .map((r) => `• ${r.success ? "✅" : "❌"} ${r.action}: ${r.details}`)
        .join("\n");

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Actions Executed:*\n${actionText}`,
        },
      });
    }

    await slack.chat.postMessage({
      channel: `#${decision.channel}`,
      text: `Content ${status.status} - ${status.submissionId}`,
      blocks,
    });
  } catch (error) {
    logger.error("Failed to send Slack confirmation", {
      submissionId: decision.submissionId,
      error: (error as Error).message,
    });
  }
}

async function sendSlackErrorNotification(
  decision: any,
  errorMessage: string
): Promise<void> {
  try {
    await slack.chat.postMessage({
      channel: `#${decision.channel}`,
      text: `❌ Action execution failed for ${decision.submissionId}: ${errorMessage}`,
    });
  } catch (error) {
    logger.error("Failed to send Slack error notification", {
      submissionId: decision.submissionId,
      error: (error as Error).message,
    });
  }
}

async function cleanupState(
  state: any,
  traceId: string,
  submissionId: string
): Promise<void> {
  try {
    // Keep final_status for audit, but clean up temporary data
    await state.delete(traceId, "analysis");
    await state.delete(traceId, "decision");
    await state.delete(traceId, "slack_notification");

    logger.info("State cleanup completed", { submissionId, traceId });
  } catch (error) {
    logger.warn("State cleanup failed", {
      submissionId,
      error: (error as Error).message,
    });
  }
}

// Simulation functions - replace with real implementations
async function simulateContentStatusUpdate(
  submissionId: string,
  status: string
): Promise<void> {
  logger.info("Simulating content status update", { submissionId, status });
  // Simulate database update delay
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function simulateUserNotification(
  userId: string,
  decision: string
): Promise<void> {
  logger.info("Simulating user notification", { userId, decision });
  // Simulate notification service call
  await new Promise((resolve) => setTimeout(resolve, 50));
}

async function simulateContentRemoval(submissionId: string): Promise<void> {
  logger.info("Simulating content removal", { submissionId });
  // Simulate content removal API call
  await new Promise((resolve) => setTimeout(resolve, 75));
}

async function simulateContentQuarantine(submissionId: string): Promise<void> {
  logger.info("Simulating content quarantine", { submissionId });
  // Simulate quarantine API call
  await new Promise((resolve) => setTimeout(resolve, 60));
}

async function simulateEscalationTicket(
  submissionId: string,
  reviewedBy: string
): Promise<void> {
  logger.info("Simulating escalation ticket creation", {
    submissionId,
    reviewedBy,
  });
  // Simulate ticket system API call
  await new Promise((resolve) => setTimeout(resolve, 80));
}
