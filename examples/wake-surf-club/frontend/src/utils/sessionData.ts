// Session and Booking Types
export interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status: "draft" | "published" | "closed";
  location?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  friendName: string;
  phoneMasked: string;
  status: "confirmed" | "canceled" | "waitlisted";
  createdAt: string;
}

export interface SessionInfo {
  session: Session;
  bookings: Booking[];
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Helper function to make API requests
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

// Load all sessions from the backend API
export async function loadSessionsFromAPI(): Promise<SessionInfo[]> {
  try {
    const data = await fetchAPI<{ sessions: SessionInfo[] }>("/sessions/list");
    return data.sessions || [];
  } catch (error) {
    console.error("Failed to load sessions:", error);
    throw error;
  }
}

// Load a single session by ID
export async function loadSessionByID(
  sessionId: string
): Promise<SessionInfo | null> {
  try {
    const data = await fetchAPI<{ session: Session; bookings: Booking[] }>(
      `/sessions/${sessionId}`
    );
    return {
      session: data.session,
      bookings: data.bookings || [],
    };
  } catch (error) {
    console.error(`Failed to load session ${sessionId}:`, error);
    return null;
  }
}

// Book a session (direct booking - for demo/testing)
export async function bookSession(
  sessionId: string,
  friendName: string,
  phoneE164: string
) {
  try {
    const data = await fetchAPI<{
      status: "confirmed" | "already_booked" | "full" | "waitlisted";
      message: string;
      bookingId?: string;
    }>("/book/direct", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        friendName,
        phoneE164,
      }),
    });

    return data;
  } catch (error) {
    console.error("Failed to book session:", error);
    throw error;
  }
}

// Book a session via signed link (production)
export async function bookSessionSigned(token: string) {
  try {
    const data = await fetchAPI<{
      status: "confirmed" | "already_booked" | "full" | "waitlisted";
      message: string;
      bookingId?: string;
    }>("/book/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    });

    return data;
  } catch (error) {
    console.error("Failed to book session with signed link:", error);
    throw error;
  }
}

// Cancel a booking via signed link
export async function cancelBooking(token: string) {
  try {
    const data = await fetchAPI<{
      success: boolean;
      message: string;
    }>("/book/cancel", {
      method: "POST",
      body: JSON.stringify({ token }),
    });

    return data;
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    throw error;
  }
}

// Admin-only: Create a new session
export async function createSession(sessionData: Partial<Session>) {
  try {
    const data = await fetchAPI<{ sessionId: string }>("/sessions/create", {
      method: "POST",
      body: JSON.stringify(sessionData),
    });

    return data;
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  }
}

// Admin-only: Update a session
export async function updateSession(
  sessionId: string,
  updates: Partial<Session>
) {
  try {
    const data = await fetchAPI<{ success: boolean }>(
      `/sessions/${sessionId}/update`,
      {
        method: "POST",
        body: JSON.stringify(updates),
      }
    );

    return data;
  } catch (error) {
    console.error("Failed to update session:", error);
    throw error;
  }
}

// Admin-only: Delete a session
export async function deleteSession(sessionId: string) {
  try {
    const data = await fetchAPI<{ success: boolean }>(
      `/sessions/${sessionId}/delete`,
      {
        method: "DELETE",
      }
    );

    return data;
  } catch (error) {
    console.error("Failed to delete session:", error);
    throw error;
  }
}

// Utility: Format phone number for display
export function formatPhoneNumber(phoneE164: string): string {
  // Remove +1 prefix and format as (XXX) XXX-XXXX
  const cleaned = phoneE164.replace(/^\+1/, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
      6
    )}`;
  }
  return phoneE164;
}

// Utility: Parse date and time into a Date object
export function parseSessionDateTime(dateStr: string, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Utility: Check if a session is in the past
export function isSessionPast(session: Session): boolean {
  const sessionDateTime = parseSessionDateTime(session.date, session.startTime);
  return sessionDateTime < new Date();
}

// Utility: Get session availability status
export function getSessionAvailability(
  session: Session,
  bookings: Booking[]
): {
  available: number;
  booked: number;
  waitlist: number;
  isFull: boolean;
} {
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const waitlistedBookings = bookings.filter((b) => b.status === "waitlisted");

  return {
    available: Math.max(0, session.capacity - confirmedBookings.length),
    booked: confirmedBookings.length,
    waitlist: waitlistedBookings.length,
    isFull: confirmedBookings.length >= session.capacity,
  };
}
