// import { ApiRouteConfig, Handlers } from "motia";
// import {
//   Session,
//   Booking,
//   Friend,
//   SessionInfoResponseSchema,
// } from "../../../src/types/models";
// import {
//   getSessionBookings,
//   buildRosterFromBookings,
//   calculateSessionStats,
// } from "../../../src/types/utils";

// export const config: ApiRouteConfig = {
//   type: "api",
//   name: "GetSessions",
//   description:
//     "Get session information - public or admin based on authentication",
//   method: "GET",
//   path: "/api/sessions",
//   responseSchema: {
//     200: SessionInfoResponseSchema,
//     500: { error: "string" },
//   },
//   emits: [],
//   flows: ["wake-surf-club"],
// };

// export const handler: Handlers["GetSessions"] = async (
//   req,
//   { emit, logger, state, traceId }
// ) => {
//   try {
//     // For now, treat all requests as admin (authentication can be added later)
//     const isAdmin = true;

//     logger.info("Sessions info request", { isAdmin, traceId });

//     // Get all sessions
//     const allSessions = ((await state.get("sessions", "list")) ||
//       []) as Session[];
//     const allFriends = ((await state.get("friends", "list")) || []) as Friend[];

//     const sessionsInfo: any[] = [];

//     // Process each session
//     for (const session of allSessions) {
//       // For public access, only show published sessions
//       if (!isAdmin && session.status !== "published") {
//         continue;
//       }

//       // Get all bookings for this session
//       const sessionBookings = await getSessionBookings(state, session.id);
//       const confirmedBookings = sessionBookings.filter(
//         (b) => b.status === "confirmed"
//       );
//       const waitlistedBookings = sessionBookings.filter(
//         (b) => b.status === "waitlisted"
//       );

//       // Build roster
//       const roster = buildRosterFromBookings(
//         confirmedBookings,
//         allFriends,
//         "confirmed"
//       );

//       // Calculate stats
//       const stats = calculateSessionStats(sessionBookings, session.capacity);

//       const sessionData: any = {
//         session: {
//           id: session.id,
//           date: session.date,
//           startTime: session.startTime,
//           endTime: session.endTime,
//           capacity: session.capacity,
//           status: session.status,
//           location: session.location,
//         },
//         roster,
//         stats,
//       };

//       // Add waitlist info for admin access
//       if (isAdmin && waitlistedBookings.length > 0) {
//         sessionData.waitlist = buildRosterFromBookings(
//           waitlistedBookings,
//           allFriends,
//           "waitlisted"
//         ).map((rosterItem, index) => ({
//           id: waitlistedBookings[index].id,
//           friendName: rosterItem.name,
//           phoneMasked: rosterItem.phoneMasked,
//           createdAt: waitlistedBookings[index].createdAt,
//         }));
//       }

//       sessionsInfo.push(sessionData);
//     }

//     // Sort sessions by date (earliest first for public, newest first for admin)
//     sessionsInfo.sort((a, b) => {
//       const dateA = new Date(a.session.date).getTime();
//       const dateB = new Date(b.session.date).getTime();
//       return isAdmin ? dateB - dateA : dateA - dateB;
//     });

//     logger.info("Sessions info retrieved", {
//       sessionCount: sessionsInfo.length,
//       isAdmin,
//       traceId,
//     });

//     return {
//       status: 200,
//       body: {
//         sessions: sessionsInfo,
//       },
//     };
//   } catch (error: any) {
//     logger.error("Failed to get sessions info", {
//       error: error.message,
//       stack: error.stack,
//       traceId,
//     });

//     return {
//       status: 500,
//       body: { error: "Failed to get sessions info" },
//     };
//   }
// };

import { ApiRouteConfig, Handlers } from "motia";
import {
  Session,
  Booking,
  Friend,
  SessionInfoResponseSchema,
} from "../../../src/types/models";
import {
  getSessionBookings,
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
  try {
    // For now, treat all requests as admin (authentication can be added later)
    const isAdmin = true;

    logger.info("Sessions info request", { isAdmin, traceId });

    // Get all sessions
    const allSessions = ((await state.get("sessions", "list")) ||
      []) as Session[];
    const allFriends = ((await state.get("friends", "list")) || []) as Friend[];

    const sessionsInfo: any[] = [];

    // Process each session
    for (const session of allSessions) {
      // For public access, only show published sessions
      if (!isAdmin && session.status !== "published") {
        continue;
      }

      // Get all bookings for this session
      const sessionBookings = await getSessionBookings(state, session.id);
      const confirmedBookings = sessionBookings.filter(
        (b) => b.status === "confirmed"
      );
      const waitlistedBookings = sessionBookings.filter(
        (b) => b.status === "waitlisted"
      );

      // Build roster
      const roster = buildRosterFromBookings(
        confirmedBookings,
        allFriends,
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
          allFriends,
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

    // Sort sessions by date (earliest first for public, newest first for admin)
    sessionsInfo.sort((a, b) => {
      const dateA = new Date(a.session.date).getTime();
      const dateB = new Date(b.session.date).getTime();
      return isAdmin ? dateB - dateA : dateA - dateB;
    });

    logger.info("Sessions info retrieved", {
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
    logger.error("Failed to get sessions info", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to get sessions info" },
    };
  }
};
