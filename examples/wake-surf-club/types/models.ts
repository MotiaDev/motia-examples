import { z } from 'zod'

// Core data models
export const FriendSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneE164: z.string(), // "+1XXXXXXXXXX"
  active: z.boolean(),
  createdAt: z.string()
})

export const SessionSchema = z.object({
  id: z.string(),
  date: z.string(), // YYYY-MM-DD
  startTime: z.string(), // "07:00"
  endTime: z.string(), // "09:00"
  capacity: z.number(), // 3
  status: z.enum(['draft', 'published', 'closed']),
  location: z.string().nullable(),
  createdAt: z.string()
})

export const BookingSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  friendId: z.string(),
  phoneE164: z.string(),
  status: z.enum(['confirmed', 'canceled', 'waitlisted']),
  createdAt: z.string(),
  canceledAt: z.string().optional()
})

export const ConfigSchema = z.object({
  id: z.literal('global'),
  inviteDay: z.string(), // "MON"
  inviteHour: z.number(), // 15 (3pm CT)
  reminderHour: z.number(), // 5 (5:30am handled with minute offset)
  timezone: z.string(), // "America/Chicago"
  capacity: z.number() // 3
})

// Type exports
export type Friend = z.infer<typeof FriendSchema>
export type Session = z.infer<typeof SessionSchema>
export type Booking = z.infer<typeof BookingSchema>
export type Config = z.infer<typeof ConfigSchema>

// API request/response types
export const BookRequestSchema = z.object({
  token: z.string()
})

export const BookResponseSchema = z.object({
  status: z.enum(['confirmed', 'full', 'waitlisted']),
  roster: z.array(z.object({
    name: z.string(),
    phoneMasked: z.string()
  }))
})

export const CancelRequestSchema = z.object({
  token: z.string()
})

export const CancelResponseSchema = z.object({
  ok: z.boolean()
})

export type BookRequest = z.infer<typeof BookRequestSchema>
export type BookResponse = z.infer<typeof BookResponseSchema>
export type CancelRequest = z.infer<typeof CancelRequestSchema>
export type CancelResponse = z.infer<typeof CancelResponseSchema>

// JWT token claims
export const ClaimTokenSchema = z.object({
  sessionId: z.string(),
  phoneE164: z.string(),
  exp: z.number()
})

export type ClaimToken = z.infer<typeof ClaimTokenSchema>

// Admin types
export const ImportFriendsRequestSchema = z.object({
  friends: z.array(z.object({
    name: z.string(),
    phone: z.string()
  }))
})

export type ImportFriendsRequest = z.infer<typeof ImportFriendsRequestSchema>

// SMS message types
export type SmsMessage = {
  to: string
  body: string
  type: 'invite' | 'confirmation' | 'reminder' | 'promotion' | 'cancellation'
}
