import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Session, CreateSessionRequestSchema } from "../../../src/types/models";

export const config: ApiRouteConfig = {
  type: "api",
  name: "CreateSession",
  description: "Create a new session for a specific date",
  method: "POST",
  path: "/admin/session/create",
  bodySchema: CreateSessionRequestSchema,
  responseSchema: {
    201: z.object({ session: z.any() }),
    400: { error: "string" },
    409: { error: "string" },
    500: { error: "string" },
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["CreateSession"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    const { date, startTime, endTime, capacity, location, status } = req.body;

    logger.info("Creating new session", {
      date,
      startTime,
      endTime,
      capacity,
      status,
      traceId,
    });

    // Validate date format
    const sessionDate = new Date(date);
    if (isNaN(sessionDate.getTime())) {
      return {
        status: 400,
        body: { error: "Invalid date format" },
      };
    }

    // Check if session already exists for this date
    const existingSession = await state.get("sessions", date);

    if (existingSession) {
      return {
        status: 409,
        body: { error: "Session already exists for this date" },
      };
    }

    // Create new session
    const sessionId = crypto.randomUUID();
    const newSession: Session = {
      id: sessionId,
      date,
      startTime,
      endTime,
      capacity,
      status,
      location: location || null,
      createdAt: new Date().toISOString(),
    };

    // Store the session (triple indexing)
    await state.set("sessions", date, newSession);
    await state.set("sessions", sessionId, newSession);

    // Update sessions list
    const existingSessionsList =
      ((await state.get("sessions", "list")) as Session[] | null) || [];
    await state.set("sessions", "list", [...existingSessionsList, newSession]);

    logger.info("Session created successfully", {
      sessionId,
      date,
      status,
      traceId,
    });

    return {
      status: 201,
      body: { session: newSession },
    };
  } catch (error: any) {
    logger.error("Failed to create session", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to create session" },
    };
  }
};
