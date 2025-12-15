import jwt from "jsonwebtoken";
import { format, nextTuesday, addDays } from "date-fns";
import { TokenClaim } from "./models";

/**
 * Utility Functions for Wake Surf Club
 * Helpers for JWT, phone formatting, date calculations, and state queries
 */

// ============================================================================
// JWT Token Utilities
// ============================================================================

/**
 * Create a signed JWT token for booking/cancellation links
 */
export function createSignedToken(
  sessionId: string,
  phoneE164: string,
  secret: string,
  expiresIn: string = "24h"
): string {
  const payload = {
    sessionId,
    phoneE164,
  };

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifySignedToken(token: string, secret: string): TokenClaim {
  try {
    const decoded = jwt.verify(token, secret) as TokenClaim;
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Create host admin token
 */
export function createHostToken(
  secret: string,
  expiresIn: string = "7d"
): string {
  return jwt.sign({ type: "host" }, secret, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Verify host admin token
 */
export function verifyHostToken(token: string, secret: string): boolean {
  try {
    const decoded = jwt.verify(token, secret) as any;
    return decoded.type === "host";
  } catch (error) {
    return false;
  }
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Get the next Tuesday's date in YYYY-MM-DD format
 */
export function getNextTuesday(timezone: string = "America/Chicago"): string {
  const now = new Date();
  const nextTue = nextTuesday(now);
  return format(nextTue, "yyyy-MM-dd");
}

/**
 * Calculate the next Tuesday's date (for Monday invite blast)
 */
export function calculateNextTuesdayDate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate days until next Tuesday (2 = Tuesday)
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7;

  // If today is Tuesday, get next Tuesday (7 days from now)
  const daysToAdd = daysUntilTuesday === 0 ? 7 : daysUntilTuesday;

  const nextTuesday = addDays(today, daysToAdd);
  return format(nextTuesday, "yyyy-MM-dd");
}

/**
 * Get date range for querying sessions
 */
export function getSessionDateRange(days: number = 60): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    dates.push(format(date, "yyyy-MM-dd"));
  }

  return dates;
}

// ============================================================================
// Phone Number Utilities
// ============================================================================

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  // If it's 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it's 11 digits and starts with 1, add +
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // If it already has +, return as is
  if (phone.startsWith("+")) {
    return phone;
  }

  // Otherwise, assume it needs +1
  return `+1${digits}`;
}

/**
 * Validate E.164 phone format
 */
export function isValidPhoneE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

/**
 * Mask phone number for display (e.g., +1***-***-1234)
 */
export function maskPhone(phoneE164: string): string {
  const cleaned = phoneE164.replace(/\D/g, "");

  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const number = cleaned.slice(1);
    return `+1***-***-${number.slice(6)}`;
  }

  return phoneE164;
}

/**
 * Format phone for display (e.g., +1 (234) 567-8901)
 */
export function formatPhoneForDisplay(phoneE164: string): string {
  const cleaned = phoneE164.replace(/\D/g, "");

  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const number = cleaned.slice(1);
    return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(
      6
    )}`;
  }

  return phoneE164;
}

// ============================================================================
// State Query Utilities
// ============================================================================

/**
 * Get all bookings for a specific session
 */
export async function getSessionBookings(
  state: any,
  sessionId: string
): Promise<any[]> {
  const allBookings = (await state.get("bookings", "list")) || [];
  return allBookings.filter((booking: any) => booking.sessionId === sessionId);
}

/**
 * Get all active friends
 */
export async function getActiveFriends(state: any): Promise<any[]> {
  const allFriends = (await state.get("friends", "list")) || [];
  return allFriends.filter((friend: any) => friend.active === true);
}

/**
 * Build roster from bookings with masked phone numbers
 */
export function buildRosterFromBookings(
  bookings: any[],
  friends: any[],
  status: string = "confirmed"
): Array<{ name: string; phoneMasked: string }> {
  return bookings
    .filter((booking) => booking.status === status)
    .map((booking) => {
      const friend = friends.find((f) => f.id === booking.friendId);
      return {
        name: friend?.name || "Friend",
        phoneMasked: maskPhone(booking.phoneE164),
      };
    });
}

/**
 * Calculate session statistics
 */
export function calculateSessionStats(
  bookings: any[],
  capacity: number
): { confirmed: number; available: number; waitlisted: number } {
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const waitlisted = bookings.filter((b) => b.status === "waitlisted").length;

  return {
    confirmed,
    available: Math.max(0, capacity - confirmed),
    waitlisted,
  };
}

// ============================================================================
// Timezone Utilities (Optional - for future expansion)
// ============================================================================

/**
 * Get current time in specified timezone
 */
export function getCurrentTimeInTimezone(
  timezone: string = "America/Chicago"
): Date {
  // Simple implementation - in production you'd use a proper timezone library
  const now = new Date();
  return now;
}

/**
 * Check if current time is within a specific time range
 */
export function isTimeInRange(
  currentTime: Date,
  targetHour: number,
  targetMinute: number = 0,
  timezone: string = "America/Chicago"
): boolean {
  const zonedTime = getCurrentTimeInTimezone(timezone);
  const currentHour = zonedTime.getHours();
  const currentMin = zonedTime.getMinutes();

  return (
    currentHour === targetHour &&
    currentMin >= targetMinute &&
    currentMin < targetMinute + 5
  );
}
