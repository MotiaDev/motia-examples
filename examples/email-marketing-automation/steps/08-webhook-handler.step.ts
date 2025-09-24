import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import crypto from "crypto";

interface WebhookEvent {
  id: string;
  source: string;
  eventType: string;
  timestamp: string;
  data: any;
  processed: boolean;
  processingAttempts: number;
}

interface EmailServiceWebhook {
  messageId: string;
  email: string;
  event:
    | "delivered"
    | "opened"
    | "clicked"
    | "bounced"
    | "unsubscribed"
    | "complained";
  timestamp: string;
  campaignId?: string;
  userId?: string;
  data?: any;
}

export const config: ApiRouteConfig = {
  type: "api",
  name: "WebhookHandler",
  description:
    "Handles incoming webhooks from email services and external systems",
  flows: ["email-automation"],

  method: "POST",
  path: "/webhooks/:source",
  bodySchema: z.object({}), // Accept any payload since webhook formats vary
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      webhookId: z.string(),
      processed: z.boolean(),
    }),
    400: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
  emits: [
    "email-delivered",
    "email-opened",
    "email-clicked",
    "email-bounced",
    "email-unsubscribed",
    "user-registered",
    "webhook-processed",
  ],
  virtualEmits: [
    {
      topic: "external-integration-event",
      label: "For third-party service events",
    },
    { topic: "webhook-failed", label: "For webhook processing failures" },
    { topic: "rate-limit-exceeded", label: "For API rate limiting" },
    { topic: "webhook-retry-required", label: "For failed webhook retries" },
  ],
};

export const handler: Handlers["WebhookHandler"] = async (
  req,
  { logger, traceId, emit, state }
) => {
  const source = req.pathParams.source;
  const payload = req.body;
  const headers = req.headers;

  logger.info("Step 08 – Processing incoming webhook", {
    source,
    headers: Object.keys(headers),
    payloadSize: JSON.stringify(payload).length,
  });

  try {
    // Generate webhook ID for tracking
    const webhookId = `webhook_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Verify webhook authenticity
    const isValidWebhook = await verifyWebhookSignature(
      source,
      payload,
      headers,
      logger
    );
    if (!isValidWebhook) {
      logger.warn("Invalid webhook signature", { source, webhookId });
      return {
        status: 400,
        body: {
          success: false,
          error: "Invalid webhook signature",
        },
      };
    }

    // Create webhook event record
    const webhookEvent: WebhookEvent = {
      id: webhookId,
      source,
      eventType: extractEventType(source, payload),
      timestamp: new Date().toISOString(),
      data: payload,
      processed: false,
      processingAttempts: 0,
    };

    // Store webhook for audit trail
    await state.set("webhook_events", webhookId, webhookEvent);

    // Process webhook based on source
    let processed = false;
    switch (source.toLowerCase()) {
      case "sendgrid":
        processed = await processSendGridWebhook(payload, emit, logger, state);
        break;
      case "resend":
        processed = await processResendWebhook(payload, emit, logger, state);
        break;
      case "mailgun":
        processed = await processMailgunWebhook(payload, emit, logger, state);
        break;
      case "appwrite":
        processed = await processAppwriteWebhook(payload, emit, logger, state);
        break;
      case "stripe":
        processed = await processStripeWebhook(payload, emit, logger, state);
        break;
      default:
        processed = await processGenericWebhook(
          source,
          payload,
          emit,
          logger,
          state
        );
        break;
    }

    // Update webhook processing status
    webhookEvent.processed = processed;
    webhookEvent.processingAttempts = 1;
    await state.set("webhook_events", webhookId, webhookEvent);

    // Emit webhook processed event for monitoring
    await (emit as any)({
      topic: "webhook-processed",
      data: {
        webhookId,
        source,
        eventType: webhookEvent.eventType,
        processed,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info("Webhook processed successfully", {
      source,
      webhookId,
      eventType: webhookEvent.eventType,
      processed,
    });

    return {
      status: 200,
      body: {
        success: true,
        message: "Webhook processed successfully",
        webhookId,
        processed,
      },
    };
  } catch (error) {
    logger.error("Webhook processing failed", {
      source,
      error: error instanceof Error ? error.message : String(error),
      payload: JSON.stringify(payload).substring(0, 500), // Log first 500 chars
    });

    return {
      status: 400,
      body: {
        success: false,
        error:
          error instanceof Error ? error.message : "Webhook processing failed",
      },
    };
  }
};

async function verifyWebhookSignature(
  source: string,
  payload: any,
  headers: any,
  logger: any
): Promise<boolean> {
  try {
    // Skip verification in development (would need actual webhook secrets)
    if (process.env.NODE_ENV === "development") {
      return true;
    }

    switch (source.toLowerCase()) {
      case "sendgrid":
        return verifySignature(
          headers["x-twilio-email-event-webhook-signature"],
          payload,
          process.env.SENDGRID_WEBHOOK_SECRET
        );
      case "resend":
        return verifySignature(
          headers["resend-signature"],
          payload,
          process.env.RESEND_WEBHOOK_SECRET
        );
      case "stripe":
        return verifySignature(
          headers["stripe-signature"],
          payload,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      default:
        logger.info("No signature verification implemented for source", {
          source,
        });
        return true;
    }
  } catch (error) {
    logger.error("Signature verification failed", { source, error });
    return false;
  }
}

function verifySignature(
  signature: string,
  payload: any,
  secret?: string
): boolean {
  if (!signature || !secret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

function extractEventType(source: string, payload: any): string {
  switch (source.toLowerCase()) {
    case "sendgrid":
      return payload.event || "unknown";
    case "resend":
      return payload.type || "unknown";
    case "appwrite":
      return payload.events?.[0] || "unknown";
    case "stripe":
      return payload.type || "unknown";
    default:
      return payload.event || payload.type || "unknown";
  }
}

async function processSendGridWebhook(
  payload: any,
  emit: any,
  logger: any,
  state: any
): Promise<boolean> {
  try {
    // SendGrid sends arrays of events
    const events = Array.isArray(payload) ? payload : [payload];

    for (const event of events) {
      const emailEvent: EmailServiceWebhook = {
        messageId: event.sg_message_id,
        email: event.email,
        event: mapSendGridEvent(event.event),
        timestamp: new Date(event.timestamp * 1000).toISOString(),
        campaignId: event.category?.[0], // Assuming campaign ID is in categories
        data: event,
      };

      // Find userId from email
      const userId = await findUserIdByEmail(emailEvent.email, state);
      if (userId) {
        emailEvent.userId = userId;
      }

      await emitEmailEvent(emailEvent, emit, logger);
    }

    return true;
  } catch (error) {
    logger.error("SendGrid webhook processing failed", { error });
    return false;
  }
}

async function processResendWebhook(
  payload: any,
  emit: any,
  logger: any,
  state: any
): Promise<boolean> {
  try {
    const emailEvent: EmailServiceWebhook = {
      messageId: payload.data.email_id,
      email: payload.data.to[0],
      event: mapResendEvent(payload.type),
      timestamp: payload.created_at,
      data: payload,
    };

    // Extract campaign ID from tags or headers
    const tags = payload.data.tags || [];
    const campaignTag = tags.find((tag: string) => tag.startsWith("campaign_"));
    if (campaignTag) {
      emailEvent.campaignId = campaignTag;
    }

    const userId = await findUserIdByEmail(emailEvent.email, state);
    if (userId) {
      emailEvent.userId = userId;
    }

    await emitEmailEvent(emailEvent, emit, logger);
    return true;
  } catch (error) {
    logger.error("Resend webhook processing failed", { error });
    return false;
  }
}

async function processMailgunWebhook(
  payload: any,
  emit: any,
  logger: any,
  state: any
): Promise<boolean> {
  try {
    const eventData = payload["event-data"];
    const emailEvent: EmailServiceWebhook = {
      messageId: eventData.message.headers["message-id"],
      email: eventData.recipient,
      event: mapMailgunEvent(eventData.event),
      timestamp: new Date(eventData.timestamp * 1000).toISOString(),
      data: payload,
    };

    // Extract campaign ID from user variables
    if (eventData.message["user-variables"]?.campaign_id) {
      emailEvent.campaignId = eventData.message["user-variables"].campaign_id;
    }

    const userId = await findUserIdByEmail(emailEvent.email, state);
    if (userId) {
      emailEvent.userId = userId;
    }

    await emitEmailEvent(emailEvent, emit, logger);
    return true;
  } catch (error) {
    logger.error("Mailgun webhook processing failed", { error });
    return false;
  }
}

async function processAppwriteWebhook(
  payload: any,
  emit: any,
  logger: any,
  state: any
): Promise<boolean> {
  try {
    // Handle Appwrite database events (user registration, updates, etc.)
    const events = payload.events || [];

    for (const eventName of events) {
      if (eventName.includes("users") && eventName.includes("create")) {
        // User registration event
        await emit({
          topic: "user-registered",
          data: {
            userId: payload.$id,
            email: payload.email,
            name: payload.name,
            registeredAt: payload.$createdAt,
            source: "appwrite",
          },
        });

        logger.info("User registration webhook processed", {
          userId: payload.$id,
          email: payload.email,
        });
      }
    }

    return true;
  } catch (error) {
    logger.error("Appwrite webhook processing failed", { error });
    return false;
  }
}

async function processStripeWebhook(
  payload: any,
  emit: any,
  logger: any,
  state: any
): Promise<boolean> {
  try {
    // Handle Stripe events (payments, subscriptions, etc.)
    const eventType = payload.type;
    const data = payload.data.object;

    if (eventType.startsWith("customer.")) {
      // Customer events could trigger email campaigns
      await emit({
        topic: "customer-event",
        data: {
          customerId: data.id,
          email: data.email,
          eventType,
          timestamp: new Date(payload.created * 1000).toISOString(),
          data: data,
        },
      });
    }

    return true;
  } catch (error) {
    logger.error("Stripe webhook processing failed", { error });
    return false;
  }
}

async function processGenericWebhook(
  source: string,
  payload: any,
  emit: any,
  logger: any,
  state: any
): Promise<boolean> {
  try {
    // Generic webhook processing
    await emit({
      topic: "generic-webhook",
      data: {
        source,
        payload,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info("Generic webhook processed", { source });
    return true;
  } catch (error) {
    logger.error("Generic webhook processing failed", { source, error });
    return false;
  }
}

async function emitEmailEvent(
  emailEvent: EmailServiceWebhook,
  emit: any,
  logger: any
) {
  const topicMap = {
    delivered: "email-delivered",
    opened: "email-opened",
    clicked: "email-clicked",
    bounced: "email-bounced",
    unsubscribed: "email-unsubscribed",
    complained: "email-complained",
  };

  const topic = topicMap[emailEvent.event as keyof typeof topicMap];
  if (topic) {
    await emit({
      topic,
      data: {
        emailId: emailEvent.messageId,
        campaignId: emailEvent.campaignId,
        userId: emailEvent.userId,
        email: emailEvent.email,
        eventType: emailEvent.event,
        timestamp: emailEvent.timestamp,
        data: emailEvent.data,
      },
    });

    logger.info("Email event emitted", {
      topic,
      email: emailEvent.email,
      event: emailEvent.event,
    });
  }
}

async function findUserIdByEmail(
  email: string,
  state: any
): Promise<string | null> {
  try {
    // In real implementation, this would query Appwrite database
    // For now, return a mock user ID based on email
    return `user_${Buffer.from(email).toString("base64").substring(0, 8)}`;
  } catch (error) {
    return null;
  }
}

// Event mapping functions
function mapSendGridEvent(event: string): EmailServiceWebhook["event"] {
  const mapping: Record<string, EmailServiceWebhook["event"]> = {
    delivered: "delivered",
    open: "opened",
    click: "clicked",
    bounce: "bounced",
    unsubscribe: "unsubscribed",
    spamreport: "complained",
  };
  return mapping[event] || "delivered";
}

function mapResendEvent(event: string): EmailServiceWebhook["event"] {
  const mapping: Record<string, EmailServiceWebhook["event"]> = {
    "email.delivered": "delivered",
    "email.opened": "opened",
    "email.clicked": "clicked",
    "email.bounced": "bounced",
    "email.complained": "complained",
  };
  return mapping[event] || "delivered";
}

function mapMailgunEvent(event: string): EmailServiceWebhook["event"] {
  const mapping: Record<string, EmailServiceWebhook["event"]> = {
    delivered: "delivered",
    opened: "opened",
    clicked: "clicked",
    bounced: "bounced",
    unsubscribed: "unsubscribed",
    complained: "complained",
  };
  return mapping[event] || "delivered";
}
