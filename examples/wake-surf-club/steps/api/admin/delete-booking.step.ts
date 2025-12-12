import { ApiRouteConfig, Handlers } from "motia";
import { Booking } from "../../../src/types/models";

export const config: ApiRouteConfig = {
  type: "api",
  name: "DeleteBooking",
  description: "Admin endpoint to delete/cancel a booking",
  method: "DELETE",
  path: "/admin/booking/:bookingId",
  responseSchema: {
    200: { success: "boolean", message: "string" },
    400: { error: "string" },
    404: { error: "string" },
    500: { error: "string" },
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["DeleteBooking"] = async (
  req,
  { logger, state, traceId }
) => {
  try {
    const { bookingId } = req.pathParams;

    if (!bookingId) {
      return {
        status: 400,
        body: { error: "Booking ID is required" },
      };
    }

    logger.info("Admin delete booking request", { bookingId, traceId });

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

    // Remove the booking from the list
    allBookings.splice(bookingIndex, 1);

    // Save updated bookings list
    await state.set("bookings", "list", allBookings);

    // Also delete the individual booking entries (double indexing cleanup)
    const bookingKey = `${booking.sessionId}:${booking.phoneE164}`;
    await state.delete?.("bookings", bookingKey);
    await state.delete?.("bookings", bookingId);

    logger.info("Booking deleted successfully", {
      bookingId,
      friendId: booking.friendId,
      sessionId: booking.sessionId,
      traceId,
    });

    return {
      status: 200,
      body: {
        success: true,
        message: "Booking deleted successfully",
      },
    };
  } catch (error: any) {
    logger.error("Failed to delete booking", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to delete booking" },
    };
  }
};
