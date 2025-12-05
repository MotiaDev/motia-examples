import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Friend, Session, Booking } from "../types/models";
import { getSessionBookings, buildRosterFromBookings } from "../types/utils";

const DirectBookRequestSchema = z.object({
  sessionId: z.string(),
  friendName: z.string(),
  phoneE164: z.string(),
});

const DirectBookResponseSchema = z.object({
  status: z.enum(["confirmed", "waitlisted", "full", "already_booked"]),
  message: z.string().optional(),
  roster: z.array(
    z.object({
      name: z.string(),
      phoneMasked: z.string(),
    })
  ),
  bookingId: z.string().optional(),
  sessionDate: z.string().optional(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "DirectBooking",
  description: "Book a surf session directly (without signed token)",
  method: "POST",
  path: "/api/book/direct",
  bodySchema: DirectBookRequestSchema,
  responseSchema: {
    200: DirectBookResponseSchema,
    400: z.object({ error: z.string() }),
    409: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  emits: ["booking.created"],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["DirectBooking"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    const { sessionId, friendName, phoneE164 } = req.body;

    logger.info("Processing direct booking request", {
      sessionId,
      friendName,
      phoneE164,
      traceId,
    });

    // Get the session by ID (sessions are stored with both date and ID as keys)
    const session = (await state.get("sessions", sessionId)) as Session;

    if (!session) {
      return {
        status: 400 as const,
        body: { error: "Session not found" },
      };
    }

    if (session.status !== "published") {
      return {
        status: 400 as const,
        body: { error: "Session is not available for booking" },
      };
    }

    // Get or create friend
    let friend = (await state.get("friends", phoneE164)) as Friend;
    if (!friend) {
      // Create a new friend entry
      const friendId = crypto.randomUUID();
      friend = {
        id: friendId,
        name: friendName,
        phoneE164,
        active: true,
        createdAt: new Date().toISOString(),
      };
      await state.set("friends", phoneE164, friend);
      await state.set("friends", friendId, friend);
    } else {
      // Update friend name if provided
      if (friendName && friendName !== "Friend") {
        friend.name = friendName;
        await state.set("friends", phoneE164, friend);
        await state.set("friends", friend.id, friend);
      }
    }

    // Check if already booked
    const bookingKey = `${sessionId}:${phoneE164}`;
    const existingBooking = (await state.get(
      "bookings",
      bookingKey
    )) as Booking;
    logger.info("Checking for existing booking", {
      bookingKey,
      existingBooking: existingBooking ? "found" : "not found",
      traceId,
    });
    if (existingBooking && existingBooking.status === "confirmed") {
      logger.info("Found existing confirmed booking", { bookingKey, traceId });

      // Get current roster to show who's booked
      const roster = await getSessionRoster(sessionId, state);

      return {
        status: 200 as const,
        body: {
          status: "already_booked",
          message: "You are already booked for this session!",
          roster,
          bookingId: existingBooking.id,
          sessionDate: session.date,
        },
      };
    }

    // Get current confirmed bookings count using utility
    const sessionBookings = await getSessionBookings(state, sessionId);
    const confirmedBookings = sessionBookings.filter(
      (b) => b.status === "confirmed"
    );

    const bookingId = crypto.randomUUID();
    let bookingStatus: "confirmed" | "waitlisted" = "confirmed";

    // Check capacity
    if (confirmedBookings.length >= session.capacity) {
      const roster = await getSessionRoster(sessionId, state);
      return {
        status: 200 as const,
        body: {
          status: "full",
          message: `Sorry, this session is full (${session.capacity}/${session.capacity} spots taken).`,
          roster,
          sessionDate: session.date,
        },
      };
    }

    // Create booking
    const booking: Booking = {
      id: bookingId,
      sessionId,
      friendId: friend.id,
      phoneE164,
      status: bookingStatus,
      createdAt: new Date().toISOString(),
    };

    // Store booking with atomic key (matching pattern from 04-book-from-link.step.ts)
    await state.set("bookings", bookingKey, booking);
    await state.set("bookings", bookingId, booking);

    // Update bookings list for efficient retrieval
    const existingBookingsList: Booking[] =
      ((await state.get("bookings", "list")) as Booking[]) || [];
    const updatedBookingsList = [...existingBookingsList, booking];
    await state.set("bookings", "list", updatedBookingsList);

    // Get updated roster
    const roster = await getSessionRoster(sessionId, state);

    logger.info("Direct booking created successfully", {
      bookingId,
      sessionId,
      friendId: friend.id,
      status: bookingStatus,
      traceId,
    });

    // Emit booking event
    await emit({
      topic: "booking.created",
      data: {
        bookingId,
        sessionId,
        friendId: friend.id,
        friendName: friend.name,
        phoneE164,
        status: bookingStatus,
        roster,
      },
    });

    return {
      status: 200 as const,
      body: {
        status: bookingStatus,
        message:
          bookingStatus === "confirmed"
            ? `You're confirmed for the session on ${session.date}!`
            : `You're on the waitlist for the session on ${session.date}.`,
        roster,
        bookingId,
        sessionDate: session.date,
      },
    };
  } catch (error: any) {
    logger.error("Direct booking failed", { error: error.message, traceId });

    return {
      status: 500 as const,
      body: { error: "Booking failed" },
    };
  }
};

async function getSessionRoster(sessionId: string, state: any) {
  const sessionBookings = await getSessionBookings(state, sessionId);
  const allFriends = (await state.get("friends", "list")) || [];

  return buildRosterFromBookings(sessionBookings, allFriends, "confirmed");
}
