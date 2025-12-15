import { ApiRouteConfig, Handlers } from "motia";
import {
  Booking,
  Session,
  CancelBookingRequestSchema,
  CancelBookingResponseSchema,
} from "../../../src/types/models";
import { verifySignedToken } from "../../../src/types/utils";

export const config: ApiRouteConfig = {
  type: "api",
  name: "CancelBooking",
  description: "Cancel a surf session booking from a signed link",
  method: "POST",
  path: "/api/cancel",
  bodySchema: CancelBookingRequestSchema,
  responseSchema: {
    200: CancelBookingResponseSchema,
    400: { error: "string" },
    401: { error: "string" },
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

export const handler: Handlers["CancelBooking"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    const { token } = req.body;

    // Verify the signed token
    const secret = process.env.HOST_SIGNING_SECRET;

    if (!secret) {
      throw new Error("Host signing secret not configured");
    }

    const claim = verifySignedToken(token, secret);
    const { sessionId, phoneE164 } = claim;

    logger.info("Processing cancellation request", {
      sessionId,
      phoneE164,
      traceId,
    });

    // Find the booking
    const bookingKey = `${sessionId}:${phoneE164}`;
    const booking = (await state.get("bookings", bookingKey)) as Booking;

    if (!booking) {
      return {
        status: 404,
        body: { error: "No booking found for this session" },
      };
    }

    if (booking.status === "canceled") {
      return {
        status: 400,
        body: { error: "Booking already canceled" },
      };
    }

    // Check cancellation deadline (12 hours before session)
    const session = (await state.get("sessions", sessionId)) as Session;

    if (session) {
      const sessionDateTime = new Date(
        `${session.date}T${session.startTime}:00`
      );
      const now = new Date();
      const hoursUntilSession =
        (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSession < 12) {
        return {
          status: 400,
          body: {
            error: "Cancellation deadline has passed (12 hours before session)",
          },
        };
      }
    }

    // Update booking status
    const updatedBooking: Booking = {
      ...booking,
      status: "canceled",
      canceledAt: new Date().toISOString(),
    };

    await state.set("bookings", bookingKey, updatedBooking);
    await state.set("bookings", booking.id, updatedBooking);

    // Update bookings list
    const bookingsList = ((await state.get("bookings", "list")) ||
      []) as Booking[];
    const updatedBookingsList = bookingsList.map((b) =>
      b.id === booking.id ? updatedBooking : b
    );
    await state.set("bookings", "list", updatedBookingsList);

    logger.info("Booking canceled successfully", {
      bookingId: booking.id,
      sessionId,
      phoneE164,
      canceledAt: updatedBooking.canceledAt,
      traceId,
    });

    // Emit cancellation event for waitlist promotion
    await emit({
      topic: "booking.canceled",
      data: {
        bookingId: booking.id,
        sessionId,
        friendId: booking.friendId,
        phoneE164,
        canceledAt: updatedBooking.canceledAt!,
      },
    });

    return {
      status: 200,
      body: { ok: true },
    };
  } catch (error: any) {
    logger.error("Cancellation failed", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    if (error.message.includes("Invalid or expired token")) {
      return {
        status: 401,
        body: { error: "Invalid or expired cancellation link" },
      };
    }

    return {
      status: 500,
      body: { error: "Cancellation failed" },
    };
  }
};
