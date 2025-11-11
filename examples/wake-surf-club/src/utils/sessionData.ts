// Shared utility functions for session data transformation

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

export interface ApiSessionResponse {
  sessions: Array<{
    session: Session;
    roster: Array<{
      name: string;
      phoneMasked: string;
    }>;
    stats: {
      confirmed: number;
      available: number;
    };
    waitlist?: Array<{
      id: string;
      friendName: string;
      phoneMasked: string;
      createdAt: string;
    }>;
  }>;
}

/**
 * Transform API response to match calendar component expectations
 * This ensures both AdminPanel and UserInterface use the same data structure
 */
export function transformSessionsData(
  apiResponse: ApiSessionResponse
): SessionInfo[] {
  return apiResponse.sessions.map((sessionData) => ({
    session: sessionData.session,
    bookings: sessionData.roster.map((rosterItem, index) => ({
      id: `booking-${index}`,
      friendName: rosterItem.name,
      phoneMasked: rosterItem.phoneMasked,
      status: "confirmed" as const,
      createdAt: new Date().toISOString(),
    })),
  }));
}

/**
 * Load sessions from the API with consistent data transformation
 */
// export async function loadSessionsFromAPI(): Promise<SessionInfo[]> {
//   const response = await fetch('/api/sessions')
//   if (!response.ok) {
//     throw new Error(`Failed to load sessions: ${response.status}`)
//   }

//   const data: ApiSessionResponse = await response.json()
//   return transformSessionsData(data)
// }

export async function loadSessionsFromAPI(
  isAdmin = false
): Promise<SessionInfo[]> {
  if (isAdmin) {
    // Use admin endpoint that has real booking IDs
    const response = await fetch("/admin/session/next");
    if (!response.ok) {
      throw new Error(`Failed to load admin session: ${response.status}`);
    }

    const data = await response.json();

    // Admin endpoint returns single session, convert to array format
    if (data.session) {
      return [
        {
          session: data.session,
          bookings: data.roster || [], // Real booking IDs already included
        },
      ];
    }
    return [];
  }

  // Public endpoint (keeps existing fake IDs for public view)
  const response = await fetch("/api/sessions");
  if (!response.ok) {
    throw new Error(`Failed to load sessions: ${response.status}`);
  }

  const data: ApiSessionResponse = await response.json();
  return transformSessionsData(data);
}
