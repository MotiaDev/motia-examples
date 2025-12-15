import { z } from "zod";

/**
 * Core Data Models for Wake Surf Club
 * All models use Zod for runtime validation
 */

// ============================================================================
// Friend Model
// ============================================================================

export const FriendSchema = z.object({
  id: z.string().describe("Unique friend identifier"),
  name: z.string().describe("Friend's full name"),
  phoneE164: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/)
    .describe("Phone number in E.164 format (+1XXXXXXXXXX)"),
  active: z.boolean().describe("Whether friend receives invites"),
  createdAt: z
    .string()
    .datetime()
    .describe("ISO timestamp when friend was added"),
});

export type Friend = z.infer<typeof FriendSchema>;

// ============================================================================
// Session Model
// ============================================================================

export const SessionSchema = z.object({
  id: z.string().describe("Unique session identifier"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Session date (YYYY-MM-DD)"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .describe("Start time (HH:MM)"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .describe("End time (HH:MM)"),
  capacity: z
    .number()
    .min(1)
    .max(10)
    .describe("Maximum number of participants"),
  status: z.enum(["draft", "published", "closed"]).describe("Session status"),
  location: z.string().nullable().describe("Session location"),
  createdAt: z
    .string()
    .datetime()
    .describe("ISO timestamp when session was created"),
});

export type Session = z.infer<typeof SessionSchema>;

// ============================================================================
// Booking Model
// ============================================================================

export const BookingSchema = z.object({
  id: z.string().describe("Unique booking identifier"),
  sessionId: z.string().describe("Reference to session"),
  friendId: z.string().describe("Reference to friend"),
  phoneE164: z.string().describe("Friend's phone number"),
  status: z
    .enum(["confirmed", "canceled", "waitlisted"])
    .describe("Booking status"),
  createdAt: z
    .string()
    .datetime()
    .describe("ISO timestamp when booking was created"),
  canceledAt: z
    .string()
    .datetime()
    .optional()
    .describe("ISO timestamp when booking was canceled"),
});

export type Booking = z.infer<typeof BookingSchema>;

// ============================================================================
// API Request/Response Models
// ============================================================================

// Book Session Request
export const BookSessionRequestSchema = z.object({
  sessionId: z.string().describe("Session to book"),
  friendName: z.string().describe("Friend's name"),
  phoneE164: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/)
    .describe("Friend's phone in E.164 format"),
});

export type BookSessionRequest = z.infer<typeof BookSessionRequestSchema>;

// Book Session Response
export const BookSessionResponseSchema = z.object({
  status: z
    .enum(["confirmed", "waitlisted", "full", "already_booked"])
    .describe("Booking status"),
  message: z.string().optional().describe("Status message"),
  roster: z
    .array(
      z.object({
        name: z.string(),
        phoneMasked: z.string(),
      })
    )
    .describe("Current session roster"),
  bookingId: z.string().optional().describe("Booking ID if successful"),
  sessionDate: z.string().optional().describe("Session date"),
});

export type BookSessionResponse = z.infer<typeof BookSessionResponseSchema>;

// Cancel Booking Request
export const CancelBookingRequestSchema = z.object({
  token: z.string().describe("JWT cancellation token"),
});

export type CancelBookingRequest = z.infer<typeof CancelBookingRequestSchema>;

// Cancel Booking Response
export const CancelBookingResponseSchema = z.object({
  ok: z.boolean().describe("Whether cancellation succeeded"),
});

export type CancelBookingResponse = z.infer<typeof CancelBookingResponseSchema>;

// Import Friends Request
export const ImportFriendsRequestSchema = z.object({
  friends: z
    .array(
      z.object({
        name: z.string().min(1).describe("Friend's name"),
        phone: z.string().min(10).describe("Friend's phone number"),
      })
    )
    .min(1)
    .describe("List of friends to import"),
});

export type ImportFriendsRequest = z.infer<typeof ImportFriendsRequestSchema>;

// Import Friends Response
export const ImportFriendsResponseSchema = z.object({
  imported: z.number().describe("Number of friends successfully imported"),
  errors: z
    .array(
      z.object({
        name: z.string(),
        phone: z.string(),
        error: z.string(),
      })
    )
    .describe("List of import errors"),
});

export type ImportFriendsResponse = z.infer<typeof ImportFriendsResponseSchema>;

// Create Session Request
export const CreateSessionRequestSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Session date (YYYY-MM-DD)"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("07:00")
    .describe("Start time (HH:MM)"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("09:00")
    .describe("End time (HH:MM)"),
  capacity: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe("Maximum participants"),
  location: z.string().optional().describe("Session location"),
  status: z
    .enum(["draft", "published", "closed"])
    .default("published")
    .describe("Session status"),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

// Session Info Response
export const SessionInfoResponseSchema = z.object({
  sessions: z.array(
    z.object({
      session: SessionSchema,
      roster: z.array(
        z.object({
          name: z.string(),
          phoneMasked: z.string(),
        })
      ),
      stats: z.object({
        confirmed: z.number(),
        available: z.number(),
      }),
      waitlist: z
        .array(
          z.object({
            id: z.string(),
            friendName: z.string(),
            phoneMasked: z.string(),
            createdAt: z.string(),
          })
        )
        .optional(),
    })
  ),
});

export type SessionInfoResponse = z.infer<typeof SessionInfoResponseSchema>;

// ============================================================================
// JWT Token Claims
// ============================================================================

export const TokenClaimSchema = z.object({
  sessionId: z.string().describe("Session ID"),
  phoneE164: z.string().describe("Friend's phone number"),
  exp: z.number().describe("Token expiration (Unix timestamp)"),
});

export type TokenClaim = z.infer<typeof TokenClaimSchema>;

// ============================================================================
// SMS Message Types
// ============================================================================

export type SmsMessageType =
  | "invite"
  | "confirmation"
  | "reminder"
  | "promotion"
  | "cancellation";

export const SmsMessageSchema = z.object({
  to: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/)
    .describe("Recipient phone (E.164)"),
  body: z.string().min(1).describe("SMS message body"),
  type: z
    .enum(["invite", "confirmation", "reminder", "promotion", "cancellation"])
    .describe("Message type"),
  dedupeKey: z
    .string()
    .optional()
    .describe("Deduplication key to prevent duplicate sends"),
});

export type SmsMessage = z.infer<typeof SmsMessageSchema>;

// ============================================================================
// Calendar Generation
// ============================================================================

export const CalendarGenerationSchema = z.object({
  sessionId: z.string().describe("Session ID"),
  friendId: z.string().describe("Friend ID"),
  friendName: z.string().describe("Friend's name"),
  sessionDate: z.string().describe("Session date (YYYY-MM-DD)"),
  startTime: z.string().describe("Start time (HH:MM)"),
  endTime: z.string().describe("End time (HH:MM)"),
  location: z.string().optional().describe("Session location"),
});

export type CalendarGeneration = z.infer<typeof CalendarGenerationSchema>;
