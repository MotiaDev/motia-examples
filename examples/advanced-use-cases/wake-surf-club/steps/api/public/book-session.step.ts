import { ApiRouteConfig, Handlers } from "motia";
import {
  Friend,
  Session,
  Booking,
  BookSessionRequestSchema,
  BookSessionResponseSchema,
} from "../../../src/types/models";
import {
  getSessionBookings,
  buildRosterFromBookings,
} from "../../../src/types/utils";

export const config: ApiRouteConfig = {
  type: "api",
  name: "BookSession",
  description: "Book a surf session directly (without signed token)",
  method: "POST",
  path: "/api/book/direct",
  bodySchema: BookSessionRequestSchema,
  responseSchema: {
    200: BookSessionResponseSchema,
    400: { error: "string" },
    409: { error: "string" },
    500: { error: "string" },
  },
  emits: [
    {
      topic: "booking.created",
      label: "Booking created, triggers confirmation",
    },
  ],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["BookSession"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    const { sessionId, friendName, phoneE164 } = req.body;

    logger.info("Processing booking request", {
      sessionId,
      friendName,
      phoneE164,
      traceId,
    });

    // Get the session
    const session = (await state.get("sessions", sessionId)) as Session;

    if (!session) {
      return {
        status: 400,
        body: { error: "Session not found" },
      };
    }

    if (session.status !== "published") {
      return {
        status: 400,
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

      // Update friends list
      const existingFriendsList = ((await state.get("friends", "list")) ||
        []) as Friend[];
      await state.set("friends", "list", [...existingFriendsList, friend]);

      logger.info("New friend created", {
        friendId,
        friendName,
        phoneE164,
        traceId,
      });
    } else {
      // Update friend name if provided and different
      if (friendName && friendName !== "Friend" && friendName !== friend.name) {
        friend.name = friendName;
        await state.set("friends", phoneE164, friend);
        await state.set("friends", friend.id, friend);

        // Update in friends list
        const friendsList = ((await state.get("friends", "list")) ||
          []) as Friend[];
        const updatedFriendsList = friendsList.map((f) =>
          f.id === friend.id ? friend : f
        );
        await state.set("friends", "list", updatedFriendsList);

        logger.info("Friend name updated", {
          friendId: friend.id,
          oldName: friend.name,
          newName: friendName,
          traceId,
        });
      }
    }

    // Check if already booked
    const bookingKey = `${sessionId}:${phoneE164}`;
    const existingBooking = (await state.get(
      "bookings",
      bookingKey
    )) as Booking;

    if (existingBooking && existingBooking.status === "confirmed") {
      logger.info("Friend already booked", {
        bookingKey,
        existingBookingId: existingBooking.id,
        traceId,
      });

      // Get current roster
      const sessionBookings = await getSessionBookings(state, sessionId);
      const allFriends = ((await state.get("friends", "list")) ||
        []) as Friend[];
      const roster = buildRosterFromBookings(
        sessionBookings,
        allFriends,
        "confirmed"
      );

      return {
        status: 200,
        body: {
          status: "already_booked",
          message: "You are already booked for this session!",
          roster,
          bookingId: existingBooking.id,
          sessionDate: session.date,
        },
      };
    }

    // Get current confirmed bookings count
    const sessionBookings = await getSessionBookings(state, sessionId);
    const confirmedBookings = sessionBookings.filter(
      (b) => b.status === "confirmed"
    );

    const bookingId = crypto.randomUUID();
    let bookingStatus: "confirmed" | "waitlisted" = "confirmed";

    // Check capacity
    if (confirmedBookings.length >= session.capacity) {
      const allFriends = ((await state.get("friends", "list")) ||
        []) as Friend[];
      const roster = buildRosterFromBookings(
        sessionBookings,
        allFriends,
        "confirmed"
      );

      return {
        status: 200,
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

    // Store booking (double indexing)
    await state.set("bookings", bookingKey, booking);
    await state.set("bookings", bookingId, booking);

    // Update bookings list
    const existingBookingsList = ((await state.get("bookings", "list")) ||
      []) as Booking[];
    await state.set("bookings", "list", [...existingBookingsList, booking]);

    // Get updated roster
    const updatedSessionBookings = await getSessionBookings(state, sessionId);
    const allFriends = ((await state.get("friends", "list")) || []) as Friend[];
    const roster = buildRosterFromBookings(
      updatedSessionBookings,
      allFriends,
      "confirmed"
    );

    logger.info("Booking created successfully", {
      bookingId,
      sessionId,
      friendId: friend.id,
      friendName: friend.name,
      status: bookingStatus,
      traceId,
    });

    // Emit booking event for confirmation flow
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
      status: 200,
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
    logger.error("Booking failed", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Booking failed" },
    };
  }
};
