import { CronConfig, Handlers } from "motia";
import { Session, Booking, Friend } from "../types/models";

export const config: CronConfig = {
  type: "cron",
  name: "SendMorningReminder",
  description: "Send morning reminder to booked friends",
  cron: "30 5 * * TUE", // Every Tuesday at 5:30 AM
  emits: ["sms.send", "reminder.blast.failed"],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["SendMorningReminder"] = async ({
  emit,
  logger,
  state,
  traceId,
}) => {
  try {
    // Get today's session
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const session = (await state.get("sessions", todayStr)) as Session;
    if (!session) {
      logger.warn("No session found for today", { date: todayStr, traceId });
      return;
    }

    // Get all confirmed bookings for today's session
    const allBookings: Booking[] =
      ((await state.get("bookings", "list")) as Booking[]) || [];
    const allFriends: Friend[] =
      ((await state.get("friends", "list")) as Friend[]) || [];

    const confirmedBookings = allBookings.filter(
      (booking: Booking) =>
        booking.sessionId === session.id && booking.status === "confirmed"
    );

    if (confirmedBookings.length === 0) {
      logger.info("No confirmed bookings for today's session", {
        sessionId: session.id,
        traceId,
      });
      return;
    }

    // Build roster list
    const rosterNames = confirmedBookings.map((booking: Booking) => {
      const friend = allFriends.find((f: Friend) => f.id === booking.friendId);
      return friend?.name || "Friend";
    });

    const rosterText =
      rosterNames.length > 0 ? rosterNames.join(", ") : "Just you!";
    const location = session.location || "TBD";

    logger.info("Sending morning reminders", {
      bookingCount: confirmedBookings.length,
      sessionId: session.id,
      traceId,
    });

    // Send reminder to each booked friend
    for (const booking of confirmedBookings) {
      try {
        const friend = allFriends.find(
          (f: Friend) => f.id === booking.friendId
        );
        if (!friend) {
          logger.warn("Friend not found for booking", {
            bookingId: booking.id,
            friendId: booking.friendId,
            traceId,
          });
          continue;
        }

        const message = `See you at 7:00! Roster: ${rosterText}. Meet at ${location}.`;

        await emit({
          topic: "sms.send",
          data: {
            to: friend.phoneE164,
            body: message,
            type: "reminder",
            dedupeKey: `reminder_${session.id}_${friend.id}`,
          },
        });

        logger.info("Morning reminder sent", {
          friendId: friend.id,
          friendName: friend.name,
          traceId,
        });

        logger.info("Morning reminder sent successfully", {
          friendId: friend.id,
          friendName: friend.name,
          phoneE164: friend.phoneE164,
          sessionId: session.id,
          roster: rosterText,
          sentAt: new Date().toISOString(),
          traceId,
        });
      } catch (error: any) {
        logger.error("Failed to send morning reminder", {
          bookingId: booking.id,
          error: error.message,
          traceId,
        });

        logger.error("Morning reminder failed", {
          bookingId: booking.id,
          sessionId: session.id,
          error: error.message,
          failedAt: new Date().toISOString(),
          traceId,
        });
      }
    }

    logger.info("Morning reminder blast completed", {
      totalReminders: confirmedBookings.length,
      sessionId: session.id,
      traceId,
    });
  } catch (error: any) {
    logger.error("Morning reminder blast failed", {
      error: error.message,
      traceId,
    });

    await (emit as any)({
      topic: "reminder.blast.failed",
      data: {
        error: error.message,
        failedAt: new Date().toISOString(),
      },
    });
  }
};
