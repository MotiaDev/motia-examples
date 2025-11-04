import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Session, Booking, Friend } from "../types/models";
import {
  getSessionBookings,
  buildRosterFromBookings,
  calculateSessionStats,
} from "../types/utils";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminSessionInfo",
  description: "Get detailed session information for admin panel",
  method: "GET",
  path: "/admin/session/next",
  responseSchema: {
    200: z.object({
      session: z
        .object({
          id: z.string(),
          date: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          capacity: z.number(),
          status: z.string(),
          location: z.string().nullable(),
          createdAt: z.string(),
        })
        .nullable(),
      roster: z.array(
        z.object({
          id: z.string(),
          friendId: z.string(),
          friendName: z.string(),
          phoneE164: z.string(),
          phoneMasked: z.string(),
          status: z.string(),
          bookedAt: z.string(),
        })
      ),
      stats: z.object({
        confirmed: z.number(),
        available: z.number(),
        waitlisted: z.number(),
      }),
      waitlist: z.array(
        z.object({
          id: z.string(),
          friendId: z.string(),
          friendName: z.string(),
          phoneMasked: z.string(),
          status: z.string(),
          createdAt: z.string(),
        })
      ),
    }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["AdminSessionInfo"] = async (
  req,
  { logger, state, traceId }
) => {
  try {
    logger.info("Admin fetching next session info", { traceId });

    // Get next Tuesday's date (or use query param if provided)
    const today = new Date();
    const daysUntilTuesday = (2 - today.getDay() + 7) % 7 || 7;
    const nextTuesday = new Date(today);
    nextTuesday.setDate(today.getDate() + daysUntilTuesday);
    const nextTuesdayStr = nextTuesday.toISOString().split("T")[0];

    // Get the session
    const session = (await state.get("sessions", nextTuesdayStr)) as Session;

    if (!session) {
      logger.info("No session found for next Tuesday", {
        date: nextTuesdayStr,
        traceId,
      });
      return {
        status: 200,
        body: {
          session: null,
          roster: [],
          stats: {
            confirmed: 0,
            available: 0,
            waitlisted: 0,
          },
          waitlist: [],
        },
      };
    }

    // Get all bookings for this session
    const sessionBookings = await getSessionBookings(state, session.id);
    const allFriends: Friend[] =
      (await state.get<Friend[]>("friends", "list")) || [];

    // Build detailed roster with full info for admin
    const confirmedBookings = sessionBookings.filter(
      (b) => b.status === "confirmed"
    );
    const waitlistedBookings = sessionBookings.filter(
      (b) => b.status === "waitlisted"
    );

    const roster = confirmedBookings.map((booking: Booking) => {
      const friend = allFriends.find((f: Friend) => f.id === booking.friendId);
      return {
        id: booking.id,
        friendId: booking.friendId,
        friendName: friend?.name || "Unknown",
        phoneE164: booking.phoneE164,
        phoneMasked: booking.phoneE164.replace(
          /(\+\d{1,3})\d{3}(\d{3})\d{4}/,
          "$1***-***-$2"
        ),
        status: booking.status,
        bookedAt: booking.createdAt,
      };
    });

    const waitlist = waitlistedBookings.map((booking: Booking) => {
      const friend = allFriends.find((f: Friend) => f.id === booking.friendId);
      return {
        id: booking.id,
        friendId: booking.friendId,
        friendName: friend?.name || "Unknown",
        phoneMasked: booking.phoneE164.replace(
          /(\+\d{1,3})\d{3}(\d{3})\d{4}/,
          "$1***-***-$2"
        ),
        status: booking.status,
        createdAt: booking.createdAt,
      };
    });

    // Calculate stats
    const stats = calculateSessionStats(sessionBookings, session.capacity);

    logger.info("Admin session info retrieved", {
      sessionId: session.id,
      date: session.date,
      confirmedCount: roster.length,
      waitlistCount: waitlist.length,
      traceId,
    });

    return {
      status: 200,
      body: {
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
        roster,
        stats,
        waitlist,
      },
    };
  } catch (error: any) {
    logger.error("Failed to get admin session info", {
      error: error.message,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to get session info" },
    };
  }
};
