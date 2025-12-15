import { ApiRouteConfig, Handlers } from "motia";
import { Session, Booking, Friend } from "../../../src/types/models";

// Response schema for list sessions endpoint
const ListSessionsResponseSchema = {
  sessions: [
    {
      session: {
        id: "string",
        date: "string",
        startTime: "string",
        endTime: "string",
        capacity: "number",
        status: "string",
        location: "string?",
        createdAt: "string",
      },
      bookings: [
        {
          id: "string",
          friendName: "string",
          phoneMasked: "string",
          status: "string",
          createdAt: "string",
        },
      ],
    },
  ],
  total: "number",
};

export const config: ApiRouteConfig = {
  type: "api",
  name: "ListSessions",
  description:
    "List all sessions with their bookings for the frontend calendar",
  method: "GET",
  path: "/api/sessions/list",
  responseSchema: {
    200: ListSessionsResponseSchema,
    500: { error: "string" },
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["ListSessions"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    logger.info("List sessions request", { traceId });

    // Load all sessions and friends from state
    const allSessions = ((await state.get("sessions", "list")) ||
      []) as Session[];
    const allFriends = ((await state.get("friends", "list")) || []) as Friend[];

    // Create a map of friendId -> friend for quick lookups
    const friendsMap = new Map<string, Friend>();
    allFriends.forEach((friend) => {
      friendsMap.set(friend.id, friend);
    });

    // Load all bookings
    const allBookings = ((await state.get("bookings", "list")) ||
      []) as Booking[];

    // Group bookings by sessionId
    const bookingsBySession = new Map<string, Booking[]>();

    for (const booking of allBookings) {
      // Only include non-canceled bookings
      if (booking.status !== "canceled") {
        if (!bookingsBySession.has(booking.sessionId)) {
          bookingsBySession.set(booking.sessionId, []);
        }
        bookingsBySession.get(booking.sessionId)!.push(booking);
      }
    }

    // Build response with sessions and their bookings
    const sessionsWithBookings = allSessions.map((session) => {
      const sessionBookings = bookingsBySession.get(session.id) || [];

      // Transform bookings to include friend info
      const bookingsInfo = sessionBookings.map((booking) => {
        const friend = friendsMap.get(booking.friendId);

        return {
          id: booking.id,
          friendName: friend?.name || "Unknown Friend",
          phoneMasked:
            (friend?.phoneE164 || booking.phoneE164)?.replace(
              /(\d{3})\d{4}(\d{4})/,
              "$1****$2"
            ) || "Unknown",
          status: booking.status,
          createdAt: booking.createdAt,
        };
      });

      return {
        session: {
          id: session.id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          capacity: session.capacity,
          status: session.status,
          location: session.location,
          createdAt: session.createdAt,
        },
        bookings: bookingsInfo,
      };
    });

    // Sort sessions by date (earliest first for public view)
    sessionsWithBookings.sort((a, b) => {
      const dateA = new Date(a.session.date).getTime();
      const dateB = new Date(b.session.date).getTime();
      return dateA - dateB;
    });

    logger.info("Sessions list retrieved", {
      sessionCount: sessionsWithBookings.length,
      totalBookings: allBookings.length,
      traceId,
    });

    return {
      status: 200,
      body: {
        sessions: sessionsWithBookings,
        total: sessionsWithBookings.length,
      },
    };
  } catch (error: any) {
    logger.error("Failed to list sessions", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to list sessions" },
    };
  }
};
