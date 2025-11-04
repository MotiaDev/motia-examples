import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { Friend, Session } from "../types/models";
import { createSignedToken } from "../types/utils";

export const config: EventConfig = {
  type: "event",
  name: "ManualInviteTrigger",
  description: "Process manual invite trigger request",
  subscribes: ["invite.manual.trigger"],
  emits: ["sms.send"],
  input: z.object({
    sessionId: z.string(),
    friendIds: z.array(z.string()).optional(), // If empty, send to all active friends
    triggeredBy: z.string().optional(), // Admin identifier
  }),
  flows: ["wake-surf-club"],
};

export const handler: Handlers["ManualInviteTrigger"] = async (
  input,
  { emit, logger, state, traceId }
) => {
  const { sessionId, friendIds, triggeredBy } = input;

  try {
    const secret = process.env.HOST_SIGNING_SECRET;
    const appUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";

    if (!secret) {
      throw new Error("Host signing secret not configured");
    }

    // Get the session
    const session = (await state.get("sessions", sessionId)) as Session;
    if (!session) {
      logger.error("Session not found for manual invite", {
        sessionId,
        traceId,
      });
      return;
    }

    if (session.status !== "published") {
      logger.warn("Cannot send invites for non-published session", {
        sessionId,
        status: session.status,
        traceId,
      });
      return;
    }

    // Get friends list
    const allFriends: Friend[] =
      (await state.get<Friend[]>("friends", "list")) || [];
    let targetFriends: Friend[];

    if (friendIds && friendIds.length > 0) {
      // Send to specific friends
      targetFriends = allFriends.filter(
        (f: Friend) => friendIds.includes(f.id) && f.active
      );
    } else {
      // Send to all active friends
      targetFriends = allFriends.filter((f: Friend) => f.active);
    }

    logger.info("Manual invite trigger processing", {
      sessionId,
      targetFriendCount: targetFriends.length,
      triggeredBy,
      traceId,
    });

    let sentCount = 0;
    let failedCount = 0;

    // Send invites to each friend
    for (const friend of targetFriends) {
      try {
        // Create signed booking link
        const bookingToken = createSignedToken(
          session.id,
          friend.phoneE164,
          secret
        );
        const bookingUrl = `${appUrl}/book?token=${bookingToken}`;

        // Create SMS message
        const message = `Tuesday Surf Club is on! ${session.startTime.slice(
          0,
          5
        )}–${session.endTime.slice(0, 5)}. Book your spot: ${bookingUrl}`;

        // Send SMS
        await emit({
          topic: "sms.send",
          data: {
            to: friend.phoneE164,
            body: message,
            type: "invite",
            dedupeKey: `manual_invite_${session.id}_${friend.id}_${Date.now()}`,
          },
        });

        sentCount++;

        logger.info("Manual invite sent", {
          friendId: friend.id,
          friendName: friend.name,
          phoneE164: friend.phoneE164,
          sessionId: session.id,
          traceId,
        });
      } catch (error: any) {
        failedCount++;
        logger.error("Failed to send manual invite", {
          friendId: friend.id,
          friendName: friend.name,
          error: error.message,
          traceId,
        });
      }
    }

    logger.info("Manual invite trigger completed", {
      sessionId,
      totalFriends: targetFriends.length,
      sentCount,
      failedCount,
      triggeredBy,
      traceId,
    });
  } catch (error: any) {
    logger.error("Manual invite trigger failed", {
      error: error.message,
      sessionId,
      traceId,
    });
  }
};
