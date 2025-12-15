import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { createEvent } from "ics";
import { CalendarGeneration } from "../../src/types/models";

export const config: EventConfig = {
  type: "event",
  name: "GenerateCalendar",
  description: "Generate ICS calendar invite for surf session",
  subscribes: ["calendar.generate"],
  emits: [],
  input: z.object({
    sessionId: z.string().describe("Session ID"),
    friendId: z.string().describe("Friend ID"),
    friendName: z.string().describe("Friend name"),
    sessionDate: z.string().describe("Session date (YYYY-MM-DD)"),
    startTime: z.string().describe("Start time (HH:MM)"),
    endTime: z.string().describe("End time (HH:MM)"),
    location: z.string().optional().describe("Session location"),
  }),
  flows: ["wake-surf-club"],
};

export const handler: Handlers["GenerateCalendar"] = async (
  input,
  { emit, logger, state, traceId }
) => {
  const {
    sessionId,
    friendId,
    friendName,
    sessionDate,
    startTime,
    endTime,
    location,
  } = input;

  try {
    // Parse session date and times
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    // Create date objects
    const sessionDateTime = new Date(`${sessionDate}T${startTime}:00`);
    const endDateTime = new Date(`${sessionDate}T${endTime}:00`);

    // Generate ICS event
    const icsEvent = {
      start: [
        sessionDateTime.getFullYear(),
        sessionDateTime.getMonth() + 1, // ICS uses 1-based months
        sessionDateTime.getDate(),
        sessionDateTime.getHours(),
        sessionDateTime.getMinutes(),
      ] as [number, number, number, number, number],
      end: [
        endDateTime.getFullYear(),
        endDateTime.getMonth() + 1,
        endDateTime.getDate(),
        endDateTime.getHours(),
        endDateTime.getMinutes(),
      ] as [number, number, number, number, number],
      title: "Tuesday WakeSurf Club",
      description: `WakeSurf session with the Tuesday Surf Club!\n\nLocation: ${
        location || "TBD"
      }\n\nSee you on the water!`,
      location: location || "TBD",
      status: "CONFIRMED" as const,
      busyStatus: "BUSY" as const,
      organizer: {
        name: "Tuesday Surf Club",
        email: "surf@tuesdaysurfclub.com",
      },
      attendees: [
        {
          name: friendName,
          email: "friend@example.com",
          rsvp: true,
          partstat: "ACCEPTED" as const,
        },
      ],
    };

    const { error, value } = createEvent(icsEvent);

    if (error) {
      throw new Error(`ICS generation failed: ${error.message}`);
    }

    if (!value) {
      throw new Error("ICS generation returned no value");
    }

    // Store the ICS content
    const icsContent = value;
    const icsKey = `ics_${sessionId}_${friendId}`;

    await state.set(traceId, icsKey, {
      content: icsContent,
      sessionId,
      friendId,
      friendName,
      sessionDate,
      startTime,
      endTime,
      location: location || "TBD",
      generatedAt: new Date().toISOString(),
    });

    // Create download URL
    const appUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";
    const downloadUrl = `${appUrl}/api/calendar/download?sessionId=${sessionId}&friendId=${friendId}`;

    logger.info("ICS calendar invite generated", {
      sessionId,
      friendId,
      friendName,
      sessionDate,
      downloadUrl,
      traceId,
    });
  } catch (error: any) {
    logger.error("ICS generation failed", {
      error: error.message,
      stack: error.stack,
      sessionId,
      friendId,
      friendName,
      traceId,
    });
  }
};
