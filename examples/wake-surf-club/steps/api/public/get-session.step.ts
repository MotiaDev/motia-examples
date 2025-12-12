import { ApiRouteConfig, Handlers } from "motia";
import {
  Session,
  Booking,
  Friend,
  SessionInfoResponseSchema,
} from "../../../src/types/models";
import {
  buildRosterFromBookings,
  calculateSessionStats,
} from "../../../src/types/utils";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetSessions",
  description:
    "Get session information - public or admin based on authentication",
  method: "GET",
  path: "/api/sessions",
  responseSchema: {
    200: SessionInfoResponseSchema,
    500: { error: "string" },
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["GetSessions"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  const startTime = Date.now();

  try {
    // For now, treat all requests as admin (authentication can be added later)
    const isAdmin = true;

    logger.info("Sessions info request", { isAdmin, traceId });

    // OPTIMIZATION: Load all data in parallel
    const [allSessions, allFriends, allBookings] = await Promise.all([
      state.get("sessions", "list") as Promise<Session[]>,
      state.get("friends", "list") as Promise<Friend[]>,
      state.get("bookings", "list") as Promise<Booking[]>,
    ]);

    const sessions = allSessions || [];
    const friends = allFriends || [];
    const bookings = allBookings || [];

    const dataLoadTime = Date.now();
    logger.info("Data loaded from state", {
      duration: `${dataLoadTime - startTime}ms`,
      sessionsCount: sessions.length,
      friendsCount: friends.length,
      bookingsCount: bookings.length,
      traceId,
    });

    // OPTIMIZATION: Group bookings by sessionId for O(1) lookup
    const bookingsBySession = bookings.reduce((acc, booking) => {
      if (!acc[booking.sessionId]) {
        acc[booking.sessionId] = [];
      }
      acc[booking.sessionId].push(booking);
      return acc;
    }, {} as Record<string, Booking[]>);

    const sessionsInfo: any[] = [];

    // Process each session
    for (const session of sessions) {
      // For public access, only show published sessions
      if (!isAdmin && session.status !== "published") {
        continue;
      }

      // Get bookings for this session (already loaded - no extra query!)
      const sessionBookings = bookingsBySession[session.id] || [];
      const confirmedBookings = sessionBookings.filter(
        (b) => b.status === "confirmed"
      );
      const waitlistedBookings = sessionBookings.filter(
        (b) => b.status === "waitlisted"
      );

      // Build roster
      const roster = buildRosterFromBookings(
        confirmedBookings,
        friends,
        "confirmed"
      );

      // Add booking IDs to roster items
      const rosterWithIds = roster.map((rosterItem, index) => ({
        ...rosterItem,
        id: confirmedBookings[index].id, // Add booking ID
        bookingId: confirmedBookings[index].id, // Alias for clarity
        friendId: confirmedBookings[index].friendId,
        status: confirmedBookings[index].status,
        createdAt: confirmedBookings[index].createdAt,
      }));

      // Calculate stats
      const stats = calculateSessionStats(sessionBookings, session.capacity);

      const sessionData: any = {
        session: {
          id: session.id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          capacity: session.capacity,
          status: session.status,
          location: session.location,
        },
        roster: rosterWithIds, // Use roster with IDs
        stats,
      };

      // Add waitlist info for admin access
      if (isAdmin && waitlistedBookings.length > 0) {
        sessionData.waitlist = buildRosterFromBookings(
          waitlistedBookings,
          friends,
          "waitlisted"
        ).map((rosterItem, index) => ({
          id: waitlistedBookings[index].id,
          friendName: rosterItem.name,
          phoneMasked: rosterItem.phoneMasked,
          createdAt: waitlistedBookings[index].createdAt,
        }));
      }

      sessionsInfo.push(sessionData);
    }

    const processingTime = Date.now();
    logger.info("Sessions processed", {
      duration: `${processingTime - dataLoadTime}ms`,
      processedCount: sessionsInfo.length,
      traceId,
    });

    // Sort sessions by date (earliest first for public, newest first for admin)
    sessionsInfo.sort((a, b) => {
      const dateA = new Date(a.session.date).getTime();
      const dateB = new Date(b.session.date).getTime();
      return isAdmin ? dateB - dateA : dateA - dateB;
    });

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    logger.info("Sessions API complete", {
      totalDuration: `${totalDuration}ms`,
      breakdown: {
        dataLoad: `${dataLoadTime - startTime}ms`,
        processing: `${processingTime - dataLoadTime}ms`,
        sorting: `${endTime - processingTime}ms`,
      },
      sessionCount: sessionsInfo.length,
      isAdmin,
      traceId,
    });

    return {
      status: 200,
      body: {
        sessions: sessionsInfo,
      },
    };
  } catch (error: any) {
    const endTime = Date.now();
    logger.error("Failed to get sessions info", {
      error: error.message,
      stack: error.stack,
      duration: `${endTime - startTime}ms`,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to get sessions info" },
    };
  }
};
