import { CronConfig, Handlers } from "motia";
import { Session } from "../types/models";
import { getNextTuesday } from "../types/utils";

export const config: CronConfig = {
  type: "cron",
  name: "SeedNextTuesdaySession",
  description: "Create the next Tuesday session if it does not exist",
  cron: "0 12 * * FRI", // Every Friday at 12:00 PM
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["SeedNextTuesdaySession"] = async ({
  emit,
  logger,
  state,
  traceId,
}) => {
  try {
    const nextTuesdayDate = getNextTuesday();

    // Check if session already exists
    const existingSession = await state.get<Session>(
      "sessions",
      nextTuesdayDate
    );

    if (existingSession) {
      logger.info("Next Tuesday session already exists", {
        sessionId: existingSession.id,
        date: nextTuesdayDate,
        traceId,
      });

      return;
    }

    // Get stored settings or use hardcoded defaults
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

    // Create new session using stored/default settings
    const sessionId = crypto.randomUUID();
    const newSession: Session = {
      id: sessionId,
      date: nextTuesdayDate,
      startTime: settings.startTime,
      endTime: settings.endTime,
      capacity: settings.capacity,
      status: "published",
      location: settings.location,
      createdAt: new Date().toISOString(),
    };

    // Store the session
    await state.set("sessions", nextTuesdayDate, newSession);

    // Also store by session ID for easy lookup
    await state.set("sessions", sessionId, newSession);

    // Update sessions list for efficient retrieval
    const existingSessionsList: Session[] =
      (await state.get<Session[]>("sessions", "list")) || [];
    const updatedSessionsList = [...existingSessionsList, newSession];
    await state.set("sessions", "list", updatedSessionsList);

    logger.info("Next Tuesday session created with settings", {
      sessionId,
      date: nextTuesdayDate,
      settings: settings,
      traceId,
    });
  } catch (error: any) {
    logger.error("Failed to seed next Tuesday session", {
      error: error.message,
      traceId,
    });
  }
};
