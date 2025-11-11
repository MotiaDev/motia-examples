import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Session } from "../types/models";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminCreateSession",
  description: "Create a new session for a specific date",
  method: "POST",
  path: "/admin/session/create",
  bodySchema: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format")
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "End time must be in HH:MM format")
      .optional(),
    capacity: z.number().min(1).max(10).optional(),
    location: z.string().optional().nullable(),
    status: z.enum(["draft", "published", "closed"]).default("published"),
  }),
  responseSchema: {
    201: z.object({
      session: z.object({
        id: z.string(),
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        capacity: z.number(),
        status: z.string(),
        location: z.string().nullable(),
        createdAt: z.string(),
      }),
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    409: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["AdminCreateSession"] = async (
  req,
  { logger, state, traceId }
) => {
  try {
    const {
      date,
      startTime,
      endTime,
      capacity,
      location,
      status = "published",
    } = req.body;

    // Get stored settings for defaults (if fields not provided)
    const settings: {
      capacity: number;
      startTime: string;
      endTime: string;
      location: string | null;
    } = ((await state.get("settings", "defaults")) as {
      capacity: number;
      startTime: string;
      endTime: string;
      location: string | null;
    }) || {
      capacity: 3,
      startTime: "07:00",
      endTime: "09:00",
      location: null,
    };

    logger.info("Admin creating session", {
      requestData: req.body,
      defaultSettings: settings,
      traceId,
    });

    // Validate date format
    const sessionDate = new Date(date);
    if (isNaN(sessionDate.getTime())) {
      return {
        status: 400 as const,
        body: { error: "Invalid date format" },
      };
    }

    // Check if session already exists for this date
    const existingSession = (await state.get("sessions", date)) as
      | Session
      | undefined;
    if (existingSession) {
      return {
        status: 409 as const,
        body: { error: "Session already exists for this date" },
      };
    }

    // Create session using provided values or stored/default settings
    const sessionId = crypto.randomUUID();
    const newSession: Session = {
      id: sessionId,
      date,
      startTime: startTime || settings.startTime,
      endTime: endTime || settings.endTime,
      capacity: capacity || settings.capacity,
      status,
      location:
        location !== undefined
          ? (location as string | null)
          : settings.location, // Allow explicit null
      createdAt: new Date().toISOString(),
    };

    // Validate time logic
    const [startHour, startMin] = newSession.startTime.split(":").map(Number);
    const [endHour, endMin] = newSession.endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      return {
        status: 400 as const,
        body: { error: "End time must be after start time" },
      };
    }

    // Store the session
    await state.set("sessions", date, newSession);
    await state.set("sessions", sessionId, newSession);

    // Update sessions list for efficient retrieval
    const existingSessionsList: Session[] =
      ((await state.get("sessions", "list")) as Session[]) || [];
    const updatedSessionsList = [...existingSessionsList, newSession];
    await state.set("sessions", "list", updatedSessionsList);

    logger.info("Admin session created successfully", {
      sessionId,
      session: newSession,
      usedSettings: {
        startTime: startTime || `${settings.startTime} (default)`,
        endTime: endTime || `${settings.endTime} (default)`,
        capacity: capacity || `${settings.capacity} (default)`,
        location:
          location !== undefined ? location : `${settings.location} (default)`,
      },
      traceId,
    });

    return {
      status: 201 as const,
      body: { session: newSession },
    };
  } catch (error: any) {
    logger.error("Failed to create session", {
      error: error.message,
      traceId,
    });

    return {
      status: 500 as const,
      body: { error: "Failed to create session" },
    };
  }
};
