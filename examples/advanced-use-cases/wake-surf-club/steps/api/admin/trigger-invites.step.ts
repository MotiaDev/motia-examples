import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Friend, Session } from "../../../src/types/models";
import {
  createSignedToken,
  calculateNextTuesdayDate,
  getActiveFriends,
} from "../../../src/types/utils";

export const config: ApiRouteConfig = {
  type: "api",
  name: "TriggerInvites",
  description: "Manually trigger invite SMS blast",
  method: "POST",
  path: "/admin/invite/send",
  responseSchema: {
    200: z.object({
      message: z.string(),
      friendCount: z.number(),
      sent: z.number(),
    }),
    400: { error: "string" },
    500: { error: "string" },
  },
  emits: [{ topic: "sms.send", label: "Manually triggers invite SMS blast" }],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["TriggerInvites"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    const secret = process.env.HOST_SIGNING_SECRET;

    if (!secret) {
      throw new Error("Host signing secret not configured");
    }

    const appUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";

    // Get the next Tuesday session
    const dateStr = calculateNextTuesdayDate();
    const session = (await state.get("sessions", dateStr)) as Session;

    if (!session) {
      return {
        status: 400,
        body: { error: "No session found for next Tuesday" },
      };
    }

    if (session.status !== "published") {
      return {
        status: 400,
        body: { error: "Session is not published" },
      };
    }

    // Get all active friends
    const activeFriends = (await getActiveFriends(state)) as Friend[];

    if (activeFriends.length === 0) {
      return {
        status: 400,
        body: { error: "No active friends to send invites to" },
      };
    }

    logger.info("Sending manual invites to active friends", {
      friendCount: activeFriends.length,
      sessionId: session.id,
      traceId,
    });

    let sentCount = 0;

    // Send invites to each friend
    for (const friend of activeFriends) {
      try {
        // Create signed booking link
        const bookingToken = createSignedToken(
          session.id,
          friend.phoneE164,
          secret
        );
        const bookingUrl = `${appUrl}/book?token=${bookingToken}`;

        // Create SMS message
        const message = `Tuesday Surf Club is on! ${session.startTime}–${session.endTime}. Book your spot: ${bookingUrl}`;

        // Send SMS
        await emit({
          topic: "sms.send",
          data: {
            to: friend.phoneE164,
            body: message,
            type: "invite",
            dedupeKey: `manual_invite_${session.id}_${friend.id}`,
          },
        });

        sentCount++;

        logger.info("Manual invite sent to friend", {
          friendId: friend.id,
          friendName: friend.name,
          phone: friend.phoneE164,
          traceId,
        });
      } catch (error: any) {
        logger.error("Failed to send manual invite to friend", {
          friendId: friend.id,
          error: error.message,
          traceId,
        });
      }
    }

    logger.info("Manual invite blast completed", {
      totalFriends: activeFriends.length,
      sentCount,
      sessionId: session.id,
      traceId,
    });

    return {
      status: 200,
      body: {
        message: "Invite blast completed successfully",
        friendCount: activeFriends.length,
        sent: sentCount,
      },
    };
  } catch (error: any) {
    logger.error("Failed to send manual invite blast", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to send invite blast" },
    };
  }
};
