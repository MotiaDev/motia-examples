import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { createSignedToken } from "../../src/types/utils";
import { Session, Booking, Friend } from "../../src/types/models";

export const config: EventConfig = {
  type: "event",
  name: "HandleCancellation",
  description:
    "Handle booking cancellation and promote from waitlist if available",
  subscribes: ["booking.canceled"],
  emits: [
    { topic: "sms.send", label: "Sends promotion SMS if waitlist promoted" },
    {
      topic: "calendar.generate",
      label: "Generates calendar for promoted booking",
    },
  ],
  input: z.object({
    bookingId: z.string().describe("Canceled booking ID"),
    sessionId: z.string().describe("Session ID"),
    friendId: z.string().describe("Friend ID who canceled"),
    phoneE164: z.string().describe("Friend phone (E.164)"),
    canceledAt: z.string().describe("Cancellation timestamp"),
  }),
  flows: ["wake-surf-club"],
};

export const handler: Handlers["HandleCancellation"] = async (
  input,
  { emit, logger, state, traceId }
) => {
  const { bookingId, sessionId, friendId, phoneE164, canceledAt } = input;

  try {
    // Get session details
    const session = await state.get<Session>("sessions", sessionId);

    if (!session) {
      logger.warn("Session not found for cancellation", { sessionId, traceId });
      return;
    }

    // Get all bookings for this session
    const allBookings = (await state.get<Booking[]>("bookings", "list")) || [];
    const sessionBookings = allBookings.filter(
      (booking) => booking.sessionId === sessionId
    );

    const confirmedBookings = sessionBookings.filter(
      (booking) => booking.status === "confirmed"
    );

    const waitlistedBookings = sessionBookings.filter(
      (booking) => booking.status === "waitlisted"
    );

    logger.info("Cancellation processed", {
      bookingId,
      sessionId,
      friendId,
      confirmedCount: confirmedBookings.length,
      waitlistCount: waitlistedBookings.length,
      capacity: session.capacity,
      traceId,
    });

    // Check if we can promote someone from waitlist
    if (
      confirmedBookings.length < session.capacity &&
      waitlistedBookings.length > 0
    ) {
      // Promote the first person on the waitlist
      const nextInLine = waitlistedBookings[0] as any;

      // Update their status to confirmed
      const updatedBooking = {
        ...nextInLine,
        status: "confirmed" as const,
        confirmedAt: new Date().toISOString(),
      };

      await state.set("bookings", nextInLine.id, updatedBooking);
      await state.set(
        "bookings",
        `${nextInLine.sessionId}:${nextInLine.phoneE164}`,
        updatedBooking
      );

      // Update bookings list
      const updatedBookingsList = allBookings.map((b) =>
        b.id === nextInLine.id ? updatedBooking : b
      );
      await state.set("bookings", "list", updatedBookingsList);

      // Get friend details for notification
      const allFriends = (await state.get<Friend[]>("friends", "list")) || [];
      const friend = allFriends.find((f) => f.id === nextInLine.friendId);

      if (friend) {
        const secret = process.env.HOST_SIGNING_SECRET;
        const appUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";

        if (secret) {
          const cancelToken = createSignedToken(
            sessionId,
            friend.phoneE164,
            secret
          );
          const cancelUrl = `${appUrl}/cancel?token=${cancelToken}`;
          const calendarUrl = `${appUrl}/api/calendar/download?sessionId=${sessionId}&friendId=${friend.id}`;

          // Send promotion notification
          await emit({
            topic: "sms.send",
            data: {
              to: friend.phoneE164,
              body: `Great news! You're now confirmed for Tuesday Surf Club (${session.startTime}–${session.endTime}). Add to calendar: ${calendarUrl}. Need to cancel? ${cancelUrl}`,
              type: "promotion",
              dedupeKey: `promotion_${sessionId}_${friend.id}`,
            },
          });

          // Generate calendar invite
          await emit({
            topic: "calendar.generate",
            data: {
              sessionId,
              friendId: friend.id,
              friendName: friend.name,
              sessionDate: session.date,
              startTime: session.startTime,
              endTime: session.endTime,
              location: session.location ?? undefined,
            },
          });

          logger.info("Waitlist promotion completed", {
            sessionId,
            promotedBookingId: nextInLine.id,
            promotedFriendId: nextInLine.friendId,
            promotedFriendName: friend.name,
            promotedAt: new Date().toISOString(),
            traceId,
          });
        }
      }
    } else {
      logger.info("No waitlist promotion needed", {
        sessionId,
        confirmedCount: confirmedBookings.length,
        capacity: session.capacity,
        waitlistCount: waitlistedBookings.length,
        traceId,
      });
    }

    logger.info("Cancellation handling completed", {
      bookingId,
      sessionId,
      friendId,
      canceledAt,
      processedAt: new Date().toISOString(),
      traceId,
    });
  } catch (error: any) {
    logger.error("Cancellation handling failed", {
      error: error.message,
      stack: error.stack,
      bookingId,
      sessionId,
      traceId,
    });
  }
};
