import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import twilio from "twilio";
import { SmsMessage } from "../types/models";

export const config: EventConfig = {
  type: "event",
  name: "SendSms",
  description: "Send SMS message via Twilio with retry logic",
  subscribes: ["sms.send"],
  emits: [],
  input: z.object({
    to: z.string(),
    body: z.string(),
    type: z.enum([
      "invite",
      "confirmation",
      "reminder",
      "promotion",
      "cancellation",
    ]),
    dedupeKey: z.string().optional(),
  }),
  flows: ["wake-surf-club"],
};

export const handler: Handlers["SendSms"] = async (
  input,
  { emit, logger, state, traceId }
) => {
  const { to, body, type, dedupeKey } = input;
  console.log("to", to);
  console.log("body", body);
  console.log("type", type);
  console.log("dedupeKey", dedupeKey);

  try {
    // Check for duplicate sends using dedupe key
    if (dedupeKey) {
      const existing = await state.get(traceId, `sms_sent_${dedupeKey}`);
      if (existing) {
        logger.info("SMS already sent, skipping duplicate", {
          dedupeKey,
          to,
          type,
          traceId,
        });
        return;
      }
    }

    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error("Twilio credentials not configured");
    }

    const client = twilio(accountSid, authToken);

    // Send SMS with retry logic
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const message = await client.messages.create({
          body,
          from: fromNumber,
          to,
        });

        logger.info("SMS sent successfully", {
          messageSid: message.sid,
          to,
          type,
          attempts: attempts + 1,
          traceId,
        });

        // Mark as sent to prevent duplicates
        if (dedupeKey) {
          await state.set(traceId, `sms_sent_${dedupeKey}`, {
            messageSid: message.sid,
            sentAt: new Date().toISOString(),
            to,
            type,
          });
        }

        logger.info("SMS sent successfully", {
          messageSid: message.sid,
          to,
          type,
          body,
          sentAt: new Date().toISOString(),
          traceId,
        });

        return;
      } catch (twilioError: any) {
        attempts++;
        logger.warn("SMS send attempt failed", {
          error: twilioError.message,
          to,
          type,
          attempt: attempts,
          traceId,
        });

        if (attempts >= maxAttempts) {
          throw twilioError;
        }

        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempts - 1) * 1000)
        );
      }
    }
  } catch (error: any) {
    logger.error("SMS send failed after all retries", {
      error: error.message,
      to,
      type,
      traceId,
    });

    logger.error("SMS send failed", {
      to,
      type,
      body,
      error: error.message,
      failedAt: new Date().toISOString(),
      traceId,
    });

    // Store failed message for manual retry
    await state.set(traceId, `sms_failed_${Date.now()}`, {
      to,
      body,
      type,
      error: error.message,
      failedAt: new Date().toISOString(),
    });
  }
};
