import { CronConfig, Handlers } from "motia";
import { Session } from "../../src/types/models";
import { getNextTuesday } from "../../src/types/utils";

export const config: CronConfig = {
  type: "cron",
  name: "SeedNextSession",
  description: "Create the next Tuesday session if it does not exist",
  //   cron: "0 12 * * FRI", // Every Friday at 12:00 PM
  cron: "* * * * *", // Every minute
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["SeedNextSession"] = async ({
  emit,
  logger,
  state,
  traceId,
}) => {
  try {
    const nextTuesdayDate = getNextTuesday();

    // Check if session already exists
    const existingSession = await state.get("sessions", nextTuesdayDate);
    logger.info("Existing session", { existingSession });

    if (existingSession) {
      logger.info("Next Tuesday session already exists", {
        sessionId: (existingSession as Session)?.id,
        date: nextTuesdayDate,
        traceId,
      });
      return;
    }

    // Create new session
    const sessionId = crypto.randomUUID();
    const newSession: Session = {
      id: sessionId,
      date: nextTuesdayDate,
      startTime: "07:00",
      endTime: "09:00",
      capacity: 3,
      status: "published",
      location: null,
      createdAt: new Date().toISOString(),
    };

    // Store the session (triple indexing for fast lookups)
    await state.set("sessions", nextTuesdayDate, newSession);
    await state.set("sessions", sessionId, newSession);

    // Update sessions list for efficient retrieval
    const existingSessionsList = (await state.get("sessions", "list")) || [];
    const updatedSessionsList = [
      ...(existingSessionsList as Session[]),
      newSession,
    ];
    await state.set("sessions", "list", updatedSessionsList);

    logger.info("Next Tuesday session created", {
      sessionId,
      date: nextTuesdayDate,
      startTime: newSession.startTime,
      endTime: newSession.endTime,
      capacity: newSession.capacity,
      traceId,
    });
  } catch (error: any) {
    logger.error("Failed to seed next Tuesday session", {
      error: error.message,
      stack: error.stack,
      traceId,
    });
  }
};
