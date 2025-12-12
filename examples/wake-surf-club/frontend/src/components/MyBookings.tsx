import React, { useState } from "react";
import {
  Search,
  X,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Booking {
  id: string;
  bookingId: string;
  friendName: string;
  phoneMasked: string;
  sessionDate: string;
  sessionTime: string;
  sessionLocation?: string;
  status: "confirmed" | "waitlisted" | "canceled";
  createdAt: string;
}

const MyBookings: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const formatPhoneForSearch = (phone: string): string => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, "");

    // Add +1 if it's a 10-digit US number
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // If it starts with 1 and has 11 digits, add +
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }

    // If it already starts with +, return as is
    if (phone.startsWith("+")) {
      return phone.replace(/\D/g, "").replace(/^/, "+");
    }

    return `+${digits}`;
  };

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter your phone number");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setSearched(true);

    try {
      const formattedPhone = formatPhoneForSearch(phoneNumber);

      // Fetch all sessions
      const response = await fetch("/api/sessions/list");
      const data = await response.json();

      // Find all bookings for this phone number
      const userBookings: Booking[] = [];

      data.sessions.forEach((sessionInfo: any) => {
        const session = sessionInfo.session;
        const allBookings = sessionInfo.bookings || [];

        allBookings.forEach((booking: any) => {
          // Match by masked phone (last 4 digits)
          const last4Input = formattedPhone.slice(-4);
          const last4Booking = booking.phoneMasked.replace(/\D/g, "").slice(-4);

          if (last4Input === last4Booking) {
            userBookings.push({
              id: booking.id,
              bookingId: booking.id,
              friendName: booking.friendName,
              phoneMasked: booking.phoneMasked,
              sessionDate: session.date,
              sessionTime: `${session.startTime} - ${session.endTime}`,
              sessionLocation: session.location,
              status: booking.status,
              createdAt: booking.createdAt,
            });
          }
        });
      });

      setBookings(userBookings);

      if (userBookings.length === 0) {
        setError("No bookings found for this phone number");
      }
    } catch (err) {
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (booking: Booking) => {
    if (
      !confirm(`Cancel your booking for ${formatDate(booking.sessionDate)}?`)
    ) {
      return;
    }

    setCanceling(booking.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/book/cancel-direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          phoneE164: formatPhoneForSearch(phoneNumber),
        }),
      });

      if (response.ok) {
        setSuccess("Booking canceled successfully!");

        // Remove from local state
        setBookings(bookings.filter((b) => b.id !== booking.id));

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to cancel booking");
      }
    } catch (err) {
      setError("Failed to cancel booking. Please try again.");
    } finally {
      setCanceling(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "waitlisted":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "canceled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const isPastSession = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  const getHoursUntilSession = (dateStr: string, timeStr: string): number => {
    const [startTime] = timeStr.split(" - ");
    const sessionDateTime = new Date(`${dateStr}T${startTime}:00`);
    const now = new Date();
    return (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  };

  const canCancelBooking = (
    booking: Booking
  ): { canCancel: boolean; reason?: string } => {
    if (booking.status !== "confirmed") {
      return {
        canCancel: false,
        reason: "Only confirmed bookings can be canceled",
      };
    }

    if (isPastSession(booking.sessionDate)) {
      return { canCancel: false, reason: "Cannot cancel past sessions" };
    }

    const hoursUntil = getHoursUntilSession(
      booking.sessionDate,
      booking.sessionTime
    );

    if (hoursUntil < 12) {
      return {
        canCancel: false,
        reason: "Must cancel at least 12 hours before session",
      };
    }

    return { canCancel: true };
  };

  return (
    <div className="py-8 min-h-screen bg-gray-50">
      <div className="px-4 mx-auto max-w-4xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-xl text-gray-600">
            View and manage your surf session bookings
          </p>
        </div>

        {/* Search Box */}
        <div className="p-6 mb-8 bg-white rounded-lg shadow-lg">
          <label
            htmlFor="phone"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            Enter your phone number
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
              <input
                id="phone"
                type="tel"
                placeholder="e.g., (555) 123-4567 or +15551234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="py-3 pr-4 pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Search"
              )}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Enter the phone number you used to book your sessions
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200">
            <div className="flex gap-2 items-center text-red-800">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="p-4 mb-6 bg-green-50 rounded-lg border border-green-200">
            <p className="font-medium text-green-800">{success}</p>
          </div>
        )}

        {/* Bookings List */}
        {searched && bookings.length > 0 && (
          <div className="space-y-4">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Your Bookings ({bookings.length})
            </h2>

            {bookings.map((booking) => {
              const cancelCheck = canCancelBooking(booking);

              return (
                <div
                  key={booking.id}
                  className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-lg"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex gap-3 items-center mb-2">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatDate(booking.sessionDate)}
                          </h3>
                        </div>
                        <div className="flex gap-3 items-center mb-2 text-gray-600">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <span>{booking.sessionTime}</span>
                        </div>
                        {booking.sessionLocation && (
                          <div className="flex gap-3 items-center text-gray-600">
                            <MapPin className="w-5 h-5 text-gray-400" />
                            <span>{booking.sessionLocation}</span>
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </div>

                    <div className="pt-4 mt-4 border-t">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <p>
                            Booked:{" "}
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </p>
                          <p>Name: {booking.friendName}</p>
                        </div>

                        {cancelCheck.canCancel && (
                          <button
                            onClick={() => handleCancel(booking)}
                            disabled={canceling === booking.id}
                            className="flex gap-2 items-center px-4 py-2 font-medium text-white bg-red-600 rounded-lg transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {canceling === booking.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Canceling...
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4" />
                                Cancel Booking
                              </>
                            )}
                          </button>
                        )}

                        {!cancelCheck.canCancel && (
                          <span className="text-sm italic text-gray-500">
                            {cancelCheck.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {searched && bookings.length === 0 && !error && !loading && (
          <div className="p-12 text-center bg-white rounded-lg shadow-lg">
            <div className="mb-4 text-gray-400">
              <Calendar className="mx-auto w-16 h-16" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900">
              No Bookings Found
            </h3>
            <p className="text-gray-600">
              We couldn't find any bookings for this phone number.
            </p>
          </div>
        )}

        {/* Instructions */}
        {!searched && (
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="mb-3 text-lg font-semibold text-blue-900">
              How it works
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li>• Enter the phone number you used to book sessions</li>
              <li>• View all your upcoming and past bookings</li>
              <li>
                • Cancel confirmed bookings up to 12 hours before the session
              </li>
              <li>• Cancellations within 12 hours are not allowed</li>
              <li>• Canceled bookings cannot be undone</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
