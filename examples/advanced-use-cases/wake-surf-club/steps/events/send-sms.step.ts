import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import twilio from "twilio";
import { SmsMessage } from "../../src/types/models";

export const config: EventConfig = {
  type: "event",
  name: "SendSms",
  description: "Send SMS message via Twilio with retry logic and deduplication",
  subscribes: ["sms.send"],
  emits: [],
  input: z.object({
    to: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/)
      .describe("Recipient phone in E.164 format"),
    body: z.string().min(1).describe("SMS message body"),
    type: z
      .enum(["invite", "confirmation", "reminder", "promotion", "cancellation"])
      .describe("Message type"),
    dedupeKey: z
      .string()
      .optional()
      .describe("Deduplication key to prevent duplicate sends"),
  }),
  flows: ["wake-surf-club"],
};

export const handler: Handlers["SendSms"] = async (
  input,
  { emit, logger, state, traceId }
) => {
  const { to, body, type, dedupeKey } = input;

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
    let lastError: Error | null = null;

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
          status: message.status,
          traceId,
        });

        // Mark as sent to prevent duplicates
        if (dedupeKey) {
          await state.set(traceId, `sms_sent_${dedupeKey}`, {
            messageSid: message.sid,
            sentAt: new Date().toISOString(),
            to,
            type,
            status: message.status,
          });
        }

        // Success - exit retry loop
        return;
      } catch (twilioError: any) {
        attempts++;
        lastError = twilioError;

        logger.warn("SMS send attempt failed", {
          error: twilioError.message,
          code: twilioError.code,
          to,
          type,
          attempt: attempts,
          traceId,
        });

        if (attempts >= maxAttempts) {
          throw twilioError;
        }

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempts - 1) * 1000;
        logger.info("Retrying SMS send", {
          backoffMs,
          nextAttempt: attempts + 1,
          traceId,
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  } catch (error: any) {
    logger.error("SMS send failed after all retries", {
      error: error.message,
      code: error.code,
      to,
      type,
      traceId,
    });

    // Store failed message for manual retry or monitoring
    await state.set(traceId, `sms_failed_${Date.now()}`, {
      to,
      body,
      type,
      error: error.message,
      errorCode: error.code,
      failedAt: new Date().toISOString(),
    });
  }
};
