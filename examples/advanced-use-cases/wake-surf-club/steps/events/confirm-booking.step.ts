import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { createSignedToken } from "../../src/types/utils";
import { Session } from "../../src/types/models";

export const config: EventConfig = {
  type: "event",
  name: "ConfirmBooking",
  description:
    "Send confirmation SMS and generate calendar invite when booking is created",
  subscribes: ["booking.created"],
  emits: [
    { topic: "sms.send", label: "Sends confirmation SMS" },
    { topic: "calendar.generate", label: "Generates calendar invite" },
  ],
  input: z.object({
    bookingId: z.string().describe("Booking ID"),
    sessionId: z.string().describe("Session ID"),
    friendId: z.string().describe("Friend ID"),
    friendName: z.string().describe("Friend name"),
    phoneE164: z.string().describe("Friend phone (E.164)"),
    status: z.enum(["confirmed", "waitlisted"]).describe("Booking status"),
    roster: z
      .array(
        z.object({
          name: z.string(),
          phoneMasked: z.string(),
        })
      )
      .describe("Current session roster"),
  }),
  flows: ["wake-surf-club"],
};

export const handler: Handlers["ConfirmBooking"] = async (
  input,
  { emit, logger, state, traceId }
) => {
  const {
    bookingId,
    sessionId,
    friendId,
    friendName,
    phoneE164,
    status,
    roster,
  } = input;

  try {
    const secret = process.env.HOST_SIGNING_SECRET;
    const appUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";

    if (!secret) {
      throw new Error("Host signing secret not configured");
    }

    // Get session details
    const session = await state.get<Session>("sessions", sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    if (status === "confirmed") {
      // Create cancellation link
      const cancelToken = createSignedToken(sessionId, phoneE164, secret);
      const cancelUrl = `${appUrl}/cancel?token=${cancelToken}`;

      // Create calendar download URL
      const calendarUrl = `${appUrl}/api/calendar/download?sessionId=${sessionId}&friendId=${friendId}`;

      // Send confirmation SMS
      const message = `You're in for Tue ${session.startTime}–${session.endTime}. Add to calendar: ${calendarUrl}. Need to cancel? ${cancelUrl}`;

      await emit({
        topic: "sms.send",
        data: {
          to: phoneE164,
          body: message,
          type: "confirmation",
          dedupeKey: `confirmation_${bookingId}`,
        },
      });

      // Generate calendar invite
      await emit({
        topic: "calendar.generate",
        data: {
          sessionId,
          friendId,
          friendName,
          sessionDate: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          location: session.location ?? undefined,
        },
      });

      logger.info("Booking confirmation sent", {
        bookingId,
        friendId,
        friendName,
        phoneE164,
        sessionId,
        status: "confirmed",
        traceId,
      });
    } else if (status === "waitlisted") {
      // Send waitlist confirmation
      const message = `You're on the waitlist for Tue ${session.startTime}–${session.endTime}. We'll text you if a spot opens up!`;

      await emit({
        topic: "sms.send",
        data: {
          to: phoneE164,
          body: message,
          type: "confirmation",
          dedupeKey: `waitlist_${bookingId}`,
        },
      });

      logger.info("Waitlist confirmation sent", {
        bookingId,
        friendId,
        friendName,
        phoneE164,
        sessionId,
        status: "waitlisted",
        traceId,
      });
    }
  } catch (error: any) {
    logger.error("Booking confirmation failed", {
      error: error.message,
      stack: error.stack,
      bookingId,
      friendId,
      phoneE164,
      sessionId,
      traceId,
    });
  }
};
