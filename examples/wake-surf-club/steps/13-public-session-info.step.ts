import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Session, Booking, Friend } from "../types/models";
import {
  verifyHostToken,
  getSessionDateRange,
  getSessionBookings,
  buildRosterFromBookings,
  calculateSessionStats,
} from "../types/utils";

export const config: ApiRouteConfig = {
  type: "api",
  name: "SessionInfo",
  description:
    "Get session information - public or admin based on authentication",
  method: "GET",
  path: "/api/sessions",
  responseSchema: {
    200: z.object({
      sessions: z.array(
        z.object({
          session: z.object({
            id: z.string(),
            date: z.string(),
            startTime: z.string(),
            endTime: z.string(),
            capacity: z.number(),
            status: z.string(),
            location: z.string().nullable(),
          }),
          roster: z.array(
            z.object({
              name: z.string(),
              phoneMasked: z.string(),
            })
          ),
          stats: z.object({
            confirmed: z.number(),
            available: z.number(),
          }),
          waitlist: z
            .array(
              z.object({
                id: z.string(),
                friendName: z.string(),
                phoneMasked: z.string(),
                createdAt: z.string(),
              })
            )
            .optional(),
        })
      ),
    }),
    500: z.object({ error: z.string() }),
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["SessionInfo"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    // Authentication removed for development - treat all requests as admin
    const isAdmin = true;

    logger.info("SessionInfo Starting sessions retrieval", {
      isAdmin,
      traceId,
    });

    // Get all sessions efficiently - ONE CALL
    const sessionsInfo: any[] = [];
    const allSessions: Session[] =
      ((await state.get("sessions", "list")) as Session[]) || [];
    const allFriends: Friend[] =
      ((await state.get("friends", "list")) as Friend[]) || [];

    // Process sessions
    for (const session of allSessions) {
      // For public access, only show published sessions
      // For admin access, show all sessions
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

      // Build roster using utility function
      const roster = buildRosterFromBookings(
        confirmedBookings,
        allFriends,
        "confirmed"
      );

      // Calculate stats using utility function
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
        roster,
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
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to get sessions info" },
    };
  }
};
