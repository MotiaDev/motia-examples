import { ApiRouteConfig, Handlers } from "motia";
import { Booking, Session } from "../../../src/types/models";

export const config: ApiRouteConfig = {
  type: "api",
  name: "CancelBookingDirect",
  description: "Public endpoint for users to cancel their own bookings",
  method: "POST",
  path: "/api/book/cancel-direct",
  responseSchema: {
    200: { success: "boolean", message: "string" },
    400: { error: "string" },
    403: { error: "string" },
    404: { error: "string" },
    500: { error: "string" },
  },
  emits: [
    {
      topic: "booking.canceled",
      label: "Booking canceled, triggers cancellation handler",
    },
  ],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["CancelBookingDirect"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    const { bookingId, phoneE164 } = req.body as {
      bookingId: string;
      phoneE164: string;
    };

    if (!bookingId || !phoneE164) {
      return {
        status: 400,
        body: { error: "Booking ID and phone number are required" },
      };
    }

    logger.info("User cancel booking request", {
      bookingId,
      phoneE164,
      traceId,
    });

    // Load all bookings
    const allBookings = ((await state.get("bookings", "list")) ||
      []) as Booking[];

    // Find the booking
    const bookingIndex = allBookings.findIndex((b) => b.id === bookingId);

    if (bookingIndex === -1) {
      logger.warn("Booking not found", { bookingId, traceId });
      return {
        status: 404,
        body: { error: "Booking not found" },
      };
    }

    const booking = allBookings[bookingIndex];

    // Verify the phone number matches (security check)
    if (booking.phoneE164 !== phoneE164) {
      logger.warn("Phone number mismatch", {
        bookingId,
        providedPhone: phoneE164,
        bookingPhone: booking.phoneE164,
        traceId,
      });
      return {
        status: 403,
        body: { error: "Phone number does not match booking" },
      };
    }

    // Check if already canceled
    if (booking.status === "canceled") {
      return {
        status: 400,
        body: { error: "Booking is already canceled" },
      };
    }

    // Check cancellation deadline (12 hours before session)
    const session = (await state.get("sessions", booking.sessionId)) as Session;

    if (session) {
      const sessionDateTime = new Date(
        `${session.date}T${session.startTime}:00`
      );
      const now = new Date();
      const hoursUntilSession =
        (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSession < 12) {
        logger.warn("Cancellation deadline passed", {
          bookingId,
          sessionId: booking.sessionId,
          hoursUntilSession,
          traceId,
        });
        return {
          status: 400,
          body: {
            error:
              "Cancellation deadline has passed. You must cancel at least 12 hours before the session.",
          },
        };
      }
    }

    // Update booking status to canceled
    const updatedBooking: Booking = {
      ...booking,
      status: "canceled",
      canceledAt: new Date().toISOString(),
    };

    allBookings[bookingIndex] = updatedBooking;

    // Save updated bookings list
    await state.set("bookings", "list", allBookings);

    // Also update individual booking entries (double indexing)
    const bookingKey = `${booking.sessionId}:${booking.phoneE164}`;
    await state.set("bookings", bookingKey, updatedBooking);
    await state.set("bookings", booking.id, updatedBooking);

    logger.info("Booking canceled successfully", {
      bookingId,
      friendId: booking.friendId,
      sessionId: booking.sessionId,
      canceledAt: updatedBooking.canceledAt,
      traceId,
    });

    // Emit cancellation event for waitlist promotion
    await (emit as any)("booking.canceled", {
      bookingId: booking.id,
      friendId: booking.friendId,
      sessionId: booking.sessionId,
      canceledBy: "user",
      canceledAt: updatedBooking.canceledAt!,
      phoneE164: booking.phoneE164,
    });

    return {
      status: 200,
      body: {
        success: true,
        message: "Booking canceled successfully",
      },
    };
  } catch (error: any) {
    logger.error("Failed to cancel booking", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to cancel booking" },
    };
  }
};
