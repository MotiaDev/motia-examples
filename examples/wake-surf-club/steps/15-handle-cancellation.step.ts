import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { createSignedToken } from "../types/utils";

export const config: EventConfig = {
  type: "event",
  name: "HandleCancellation",
  description:
    "Handle booking cancellation, notification, and waitlist promotion",
  subscribes: ["booking.canceled"],
  emits: ["sms.send"],
  input: z.object({
    bookingId: z.string(),
    sessionId: z.string(),
    friendId: z.string(),
    phoneE164: z.string(),
    canceledAt: z.string(),
    canceledBy: z.enum(["user", "admin"]).optional(),
    reason: z.string().optional(),
  }),
  flows: ["wake-surf-club"],
};

export const handler: Handlers["HandleCancellation"] = async (
  input,
  { emit, logger, state, traceId }: any
) => {
  const {
    bookingId,
    sessionId,
    friendId,
    phoneE164,
    canceledAt,
    canceledBy,
    reason,
  } = input;

  try {
    // Get session details
    const session = await state.get("sessions", sessionId);
    if (!session) {
      logger.warn("Session not found for cancellation", { sessionId, traceId });
      return;
    }

    // If admin canceled, notify the user
    if (canceledBy === "admin") {
      const friend = await state.get("friends", friendId);
      if (friend) {
        const reasonText = reason ? ` Reason: ${reason}` : "";
        const appUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";

        await emit({
          topic: "sms.send",
          data: {
            to: phoneE164,
            body: `Your booking for Tuesday Surf Club (${session.date} at ${session.startTime}) has been canceled by the organizer.${reasonText} Questions? Contact the host.`,
            type: "cancellation",
            dedupeKey: `admin_cancel_${bookingId}`,
          },
        });

        logger.info("Admin cancellation notification sent", {
          bookingId,
          friendId,
          phoneE164,
          reason,
          traceId,
        });
      }
    }

    // Get all bookings for this session
    const allBookings = (await state.get("bookings", "list")) || [];
    const sessionBookings = allBookings.filter(
      (booking: any) => booking.sessionId === sessionId
    );

    const confirmedBookings = sessionBookings.filter(
      (booking: any) => booking.status === "confirmed"
    );

    const waitlistedBookings = sessionBookings.filter(
      (booking: any) => booking.status === "waitlisted"
    );

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

      // Get friend details for notification
      const friend = await state.get("friends", nextInLine.friendId);
      if (friend) {
        // Create booking confirmation link for the promoted friend
        const secret = process.env.HOST_SIGNING_SECRET;
        const appUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";

        if (secret) {
          const cancelToken = createSignedToken(
            sessionId,
            friend.phoneE164,
            secret
          );
          const cancelUrl = `${appUrl}/cancel?token=${cancelToken}`;

          // Send promotion notification
          await emit({
            topic: "sms.send",
            data: {
              to: friend.phoneE164,
              body: `Great news! You're now confirmed for Tuesday Surf Club (7–9am). Add to calendar: ${appUrl}/api/calendar/download?sessionId=${sessionId}&friendId=${friend.id}. Need to cancel? ${cancelUrl}`,
              type: "promotion",
              dedupeKey: `promotion_${sessionId}_${friend.id}`,
            },
          });
        }
      }

      // Log waitlist promotion
      logger.info("Waitlist promotion completed", {
        sessionId,
        promotedBookingId: nextInLine.id,
        promotedFriendId: nextInLine.friendId,
        promotedAt: new Date().toISOString(),
        traceId,
      });
    }

    // Log cancellation processing completion
    logger.info("Cancellation processing completed", {
      bookingId,
      sessionId,
      friendId,
      canceledAt,
      processedAt: new Date().toISOString(),
      traceId,
    });
  } catch (error: any) {
    logger.error("Cancellation processing failed", {
      error: error.message,
      bookingId,
      sessionId,
      traceId,
    });
  }
};
