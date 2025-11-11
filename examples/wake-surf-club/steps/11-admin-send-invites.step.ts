import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import {
  verifyHostToken,
  createSignedToken,
  calculateNextTuesdayDate,
  getActiveFriends,
} from "../types/utils";
import { Friend, Session } from "../types/models";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminSendInvites",
  description: "Manually trigger invite SMS blast",
  method: "POST",
  path: "/admin/invite/send",
  responseSchema: {
    200: z.object({
      message: z.string(),
      friendCount: z.number(),
      sent: z.number(),
    }),
    401: z.object({ error: z.string() }),
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  emits: ["sms.send"],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["AdminSendInvites"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    // Authentication removed for development
    const secret = process.env.HOST_SIGNING_SECRET;
    if (!secret) {
      throw new Error("Host signing secret not configured");
    }

    const appUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";

    // Get the next Tuesday session using utility
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

    // Get all active friends using utility
    const activeFriends = (await getActiveFriends(state)) as Friend[];

    logger.info("Sending manual invites to active friends", {
      friendCount: activeFriends.length,
      sessionId: session.id,
      traceId,
    });

    let sentCount = 0;

    console.log("activeFriends", activeFriends);
    console.log("rannnnn before");
    // Send invites to each friend
    for (const friend of activeFriends) {
      console.log("ran");
      try {
        // Create signed booking link
        const bookingToken = createSignedToken(
          session.id,
          friend.phoneE164,
          secret
        );
        const bookingUrl = `${appUrl}/book?token=${bookingToken}`;

        // Create SMS message
        const message = `Tuesday Surf Club is on! 7–9am. Book your spot: ${bookingUrl}`;

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
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to send invite blast" },
    };
  }
};
