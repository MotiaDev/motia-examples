import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Booking } from "../types/models";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminCancelBooking",
  description: "Admin endpoint to cancel any booking (no time restrictions)",
  method: "POST",
  path: "/admin/booking/:bookingId/cancel",
  bodySchema: z.object({
    reason: z.string().optional(),
  }),
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      booking: z.object({
        id: z.string(),
        status: z.enum(["canceled"]),
        canceledAt: z.string(),
      }),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  emits: ["booking.canceled"],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["AdminCancelBooking"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    const bookingId = req.pathParams.bookingId;
    const { reason } = req.body;

    logger.info("Admin processing cancellation request", {
      bookingId,
      reason,
      traceId,
    });

    // Get the booking by ID
    const booking = (await state.get("bookings", bookingId)) as Booking;
    if (!booking) {
      logger.warn("Booking not found for admin cancellation", {
        bookingId,
        traceId,
      });
      return {
        status: 404 as const,
        body: { error: "Booking not found" },
      };
    }

    // Check if already canceled
    if (booking.status === "canceled") {
      return {
        status: 400 as const,
        body: { error: "Booking already canceled" },
      };
    }

    // Admin can cancel anytime (no time restrictions like user cancellation)
    const updatedBooking: Booking = {
      ...booking,
      status: "canceled",
      canceledAt: new Date().toISOString(),
    };

    // Update booking in both storage locations (by ID and by composite key)
    const bookingKey = `${booking.sessionId}:${booking.phoneE164}`;
    await state.set("bookings", bookingKey, updatedBooking);
    await state.set("bookings", bookingId, updatedBooking);

    // Update bookings list for efficient retrieval
    const allBookings = ((await state.get("bookings", "list")) ||
      []) as Booking[];
    const updatedBookingsList = allBookings.map((b: Booking) =>
      b.id === bookingId ? updatedBooking : b
    );
    console.log("updatedBookingsList", updatedBookingsList);
    await state.set("bookings", "list", updatedBookingsList);
    logger.info("Admin canceled booking successfully", {
      bookingId,
      sessionId: booking.sessionId,
      friendId: booking.friendId,
      reason,
      traceId,
    });

    // Emit cancellation event (triggers notification and waitlist promotion in step 15)
    await emit({
      topic: "booking.canceled",
      data: {
        bookingId,
        sessionId: booking.sessionId,
        friendId: booking.friendId,
        phoneE164: booking.phoneE164,
        canceledAt: updatedBooking.canceledAt!,
        canceledBy: "admin",
        reason,
      },
    });

    return {
      status: 200 as const,
      body: {
        success: true,
        message: reason
          ? `Booking canceled: ${reason}`
          : "Booking canceled successfully",
        booking: {
          id: updatedBooking.id,
          status: "canceled" as const,
          canceledAt: updatedBooking.canceledAt!,
        },
      },
    };
  } catch (error: any) {
    logger.error("Admin booking cancellation failed", {
      error: error.message,
      bookingId: req.pathParams.bookingId,
      traceId,
    });

    return {
      status: 500 as const,
      body: { error: "Cancellation failed" },
    };
  }
};
