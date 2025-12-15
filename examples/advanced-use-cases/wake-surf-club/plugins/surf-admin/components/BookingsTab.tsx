import React, { useState, useEffect } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@motiadev/ui";

interface BookingWithSession {
  id: string;
  sessionId: string;
  friendId: string;
  friendName: string;
  phoneE164: string;
  phoneMasked: string;
  status: "confirmed" | "waitlisted" | "canceled";
  createdAt: string;
  sessionDate: string;
  sessionTime: string;
  sessionLocation?: string;
}

export const BookingsTab: React.FC = () => {
  const [bookings, setBookings] = useState<BookingWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "confirmed" | "waitlisted" | "canceled"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/sessions");
      const data = await response.json();

      // Flatten bookings from all sessions
      const allBookings: BookingWithSession[] = [];

      data.sessions.forEach((sessionInfo: any) => {
        const session = sessionInfo.session;
        const roster = sessionInfo.roster || [];
        const waitlist = sessionInfo.waitlist || [];

        // Add confirmed bookings from roster
        roster.forEach((person: any) => {
          allBookings.push({
            id:
              person.bookingId ||
              person.id ||
              `${session.id}-confirmed-${person.name}`,
            sessionId: session.id,
            friendId: person.friendId || "",
            friendName: person.name,
            phoneE164: "",
            phoneMasked: person.phoneMasked,
            status: person.status || "confirmed",
            createdAt: person.createdAt || session.createdAt,
            sessionDate: session.date,
            sessionTime: `${session.startTime} - ${session.endTime}`,
            sessionLocation: session.location,
          });
        });

        // Add waitlisted bookings
        waitlist.forEach((person: any) => {
          allBookings.push({
            id: person.id || `${session.id}-waitlist-${person.name}`,
            sessionId: session.id,
            friendId: person.friendId || "",
            friendName: person.friendName || person.name,
            phoneE164: "",
            phoneMasked: person.phoneMasked || person.phone,
            status: "waitlisted",
            createdAt: person.createdAt || session.createdAt,
            sessionDate: session.date,
            sessionTime: `${session.startTime} - ${session.endTime}`,
            sessionLocation: session.location,
          });
        });
      });

      // Sort by session date (newest first)
      allBookings.sort((a, b) => {
        return (
          new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
        );
      });

      setBookings(allBookings);
    } catch (error) {
      console.error("Failed to load bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    // Status filter
    if (filter !== "all" && booking.status !== filter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        booking.friendName.toLowerCase().includes(searchLower) ||
        booking.phoneMasked.includes(searchTerm) ||
        booking.sessionDate.includes(searchTerm)
      );
    }

    return true;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "waitlisted":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "canceled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    waitlisted: bookings.filter((b) => b.status === "waitlisted").length,
    canceled: bookings.filter((b) => b.status === "canceled").length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full border-b-2 border-blue-500 animate-spin"></div>
          <p className="text-zinc-400">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">All Bookings</h2>
          <p className="mt-1 text-zinc-400">
            Manage all bookings across all sessions
          </p>
        </div>
        <Button variant="outline" onClick={loadBookings} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-4 rounded-lg border bg-zinc-900 border-zinc-800">
          <p className="text-sm text-zinc-400">Total Bookings</p>
          <p className="mt-1 text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg border bg-zinc-900 border-zinc-800">
          <p className="text-sm text-zinc-400">Confirmed</p>
          <p className="mt-1 text-2xl font-bold text-green-500">
            {stats.confirmed}
          </p>
        </div>
        <div className="p-4 rounded-lg border bg-zinc-900 border-zinc-800">
          <p className="text-sm text-zinc-400">Waitlisted</p>
          <p className="mt-1 text-2xl font-bold text-yellow-500">
            {stats.waitlisted}
          </p>
        </div>
        <div className="p-4 rounded-lg border bg-zinc-900 border-zinc-800">
          <p className="text-sm text-zinc-400">Canceled</p>
          <p className="mt-1 text-2xl font-bold text-red-500">
            {stats.canceled}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-lg border bg-zinc-900 border-zinc-800">
        <div className="flex flex-col gap-4 md:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 w-4 h-4 transform -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 pl-10 w-full text-sm rounded-lg border bg-zinc-800 border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(["all", "confirmed", "waitlisted", "canceled"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    filter === status
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
        {filteredBookings.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-zinc-400">
              {searchTerm || filter !== "all"
                ? "No bookings match your filters"
                : "No bookings found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-zinc-800 border-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-400">
                    Friend
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-400">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-400">
                    Session Date
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-400">
                    Time
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-400">
                    Location
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-400">
                    Booked At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="transition-colors hover:bg-zinc-800/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{booking.friendName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm text-zinc-400">
                        {booking.phoneMasked}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {formatDate(booking.sessionDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-400">
                        {booking.sessionTime}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-400">
                        {booking.sessionLocation || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadgeColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-400">
                        {booking.createdAt &&
                        !isNaN(new Date(booking.createdAt).getTime())
                          ? new Date(booking.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "N/A"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-center text-zinc-400">
        Showing {filteredBookings.length} of {bookings.length} bookings
      </div>
    </div>
  );
};

export default BookingsTab;
