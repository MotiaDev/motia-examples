import { CronConfig, Handlers } from "motia";
import { Session, Booking, Friend } from "../../src/types/models";

export const config: CronConfig = {
  type: "cron",
  name: "SendMorningReminder",
  description:
    "Send morning reminder to booked friends with roster and location",
  cron: "30 5 * * TUE", // Every Tuesday at 5:30 AM
  emits: [{ topic: "sms.send", label: "Sends morning reminder SMS" }],
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
    const allBookings = (await state.get("bookings", "list")) || [];
    const allFriends = (await state.get("friends", "list")) || [];

    const confirmedBookings = (allBookings as Booking[]).filter(
      (booking: any) =>
        booking.sessionId === session.id && booking.status === "confirmed"
    ) as Booking[];

    if (confirmedBookings.length === 0) {
      logger.info("No confirmed bookings for today's session", {
        sessionId: session.id,
        date: todayStr,
        traceId,
      });
      return;
    }

    // Build roster list
    const rosterNames = confirmedBookings.map((booking: Booking) => {
      const friend = (allFriends as Friend[]).find(
        (f: Friend) => f.id === booking.friendId
      );
      return friend?.name || "Friend";
    });

    const rosterText =
      rosterNames.length > 0 ? rosterNames.join(", ") : "Just you!";
    const location = session.location || "TBD";

    logger.info("Sending morning reminders", {
      bookingCount: confirmedBookings.length,
      sessionId: session.id,
      roster: rosterText,
      location,
      traceId,
    });

    let sentCount = 0;
    let failedCount = 0;

    // Send reminder to each booked friend
    for (const booking of confirmedBookings) {
      try {
        const friend = (allFriends as Friend[]).find(
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

        const message = `See you at ${session.startTime}! Roster: ${rosterText}. Meet at ${location}.`;

        await emit({
          topic: "sms.send",
          data: {
            to: friend.phoneE164,
            body: message,
            type: "reminder",
            dedupeKey: `reminder_${session.id}_${friend.id}`,
          },
        });

        sentCount++;

        logger.info("Morning reminder sent", {
          friendId: friend.id,
          friendName: friend.name,
          phoneE164: friend.phoneE164,
          traceId,
        });
      } catch (error: any) {
        failedCount++;

        logger.error("Failed to send morning reminder", {
          bookingId: booking.id,
          friendId: booking.friendId,
          error: error.message,
          traceId,
        });
      }
    }

    logger.info("Morning reminder blast completed", {
      totalReminders: confirmedBookings.length,
      sentCount,
      failedCount,
      sessionId: session.id,
      sessionDate: session.date,
      roster: rosterText,
      traceId,
    });
  } catch (error: any) {
    logger.error("Morning reminder blast failed", {
      error: error.message,
      stack: error.stack,
      traceId,
    });
  }
};
