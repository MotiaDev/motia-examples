import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Plus,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isPast,
  parseISO,
  startOfWeek,
  endOfWeek,
  isBefore,
} from "date-fns";

interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status: "draft" | "published" | "closed";
  location?: string;
  createdAt: string;
}

interface Booking {
  id: string;
  friendName: string;
  phoneMasked: string;
  status: "confirmed" | "canceled" | "waitlisted";
  createdAt: string;
}

interface SessionInfo {
  session: Session;
  bookings: Booking[];
}

interface EnhancedCalendarProps {
  sessions: SessionInfo[];
  mode: "public" | "admin";
  onSessionSelect?: (session: Session) => void;
  onSessionCreate?: (date: string) => void;
  onSessionEdit?: (session: Session) => void;
  onSessionDelete?: (sessionId: string) => void;
  onBookingCreate?: (sessionId: string) => void;
  onBookingCancel?: (bookingId: string, friendName: string) => void;
  loading?: boolean;
}

interface SessionModalProps {
  session: Session | null;
  bookings: Booking[];
  mode: "public" | "admin";
  isOpen: boolean;
  onClose: () => void;
  onBook?: (sessionId: string) => void;
  onEdit?: (session: Session) => void;
  onDelete?: (sessionId: string) => void;
  onCancelBooking?: (bookingId: string, friendName: string) => void;
  loading?: boolean;
}

const SessionModal: React.FC<SessionModalProps> = ({
  session,
  bookings,
  mode,
  isOpen,
  onClose,
  onBook,
  onEdit,
  onDelete,
  onCancelBooking,
  loading = false,
}) => {
  if (!isOpen || !session) return null;

  const bookingsList = bookings || [];
  const isSessionFull = bookingsList.length >= session.capacity;
  const isSessionPast = isBefore(parseISO(session.date), new Date());
  const canBook =
    !isSessionFull && !isSessionPast && session.status === "published";

  const getBookingStatusText = () => {
    if (isSessionPast) return "Session has passed";
    if (isSessionFull) return "Session is full";
    if (session.status !== "published") return "Session not available";
    return "Available to book";
  };

  const getBookingStatusColor = () => {
    if (isSessionPast || isSessionFull || session.status !== "published") {
      return "text-red-600";
    }
    return "text-green-600";
  };

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-6 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="mb-2 text-2xl font-bold">Session Details</h2>
              <p className="text-blue-100">
                {format(parseISO(session.date), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-blue-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
            {/* Session Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-semibold text-gray-900">
                    {format(parseISO(session.date), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-semibold text-gray-900">
                    {session.startTime} - {session.endTime}
                  </p>
                </div>
              </div>

              {session.location && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-semibold text-gray-900">
                      {session.location}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Capacity</p>
                  <p className="font-semibold text-gray-900">
                    {bookingsList.length} / {session.capacity} spots filled
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Status */}
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="mb-3 font-semibold text-gray-900">
                  Booking Status
                </h3>
                <div className="flex items-center mb-2 space-x-2">
                  <span className={`font-medium ${getBookingStatusColor()}`}>
                    {getBookingStatusText()}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  <p>Capacity: {session.capacity} people</p>
                  <p>Booked: {bookingsList.length} people</p>
                  <p>
                    Available:{" "}
                    {Math.max(0, session.capacity - bookingsList.length)} spots
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {mode === "public" && (
                <button
                  onClick={() => onBook?.(session.id)}
                  disabled={!canBook || loading}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    canBook && !loading
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-4 h-4 rounded-full border-b-2 border-white animate-spin"></div>
                      <span>Booking...</span>
                    </div>
                  ) : (
                    "Book This Session"
                  )}
                </button>
              )}

              {mode === "admin" && (
                <div className="space-y-2">
                  <button
                    onClick={() => onEdit?.(session)}
                    className="flex justify-center items-center px-4 py-2 space-x-2 w-full text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Session</span>
                  </button>
                  <button
                    onClick={() => onDelete?.(session.id)}
                    className="flex justify-center items-center px-4 py-2 space-x-2 w-full text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Session</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Current Bookings */}
          {bookingsList.length > 0 && (
            <div className="pt-6 border-t">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Current Bookings ({bookingsList.length})
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {bookingsList.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {booking.friendName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.phoneMasked}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "canceled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {booking.status}
                      </span>
                      {mode === "admin" && booking.status === "confirmed" && (
                        <button
                          onClick={() => onCancelBooking?.(booking.id, booking.friendName)}
                          className="text-red-600 hover:text-red-800"
                          title="Cancel booking"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info for Public */}
          {mode === "public" && (
            <div className="p-4 mt-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="mb-3 text-lg font-semibold text-blue-900">
                What to Expect
              </h3>
              <ul className="space-y-2 text-blue-800">
                <li>• 2-hour wake surfing sessions</li>
                <li>• All equipment provided (boards, life jackets, etc.)</li>
                <li>• Experienced instructor and boat driver</li>
                <li>• Perfect for all skill levels</li>
                <li>• Bring water, sunscreen, and a positive attitude!</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EnhancedCalendar: React.FC<EnhancedCalendarProps> = ({
  sessions,
  mode,
  onSessionSelect,
  onSessionCreate,
  onSessionEdit,
  onSessionDelete,
  onBookingCreate,
  onBookingCancel,
  loading = false,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<Booking[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [createDate, setCreateDate] = useState<string>("");

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Get the first day of the week for the month start
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getSessionForDate = (date: Date) => {
    return sessions.find((s) => isSameDay(parseISO(s.session.date), date));
  };

  const getSessionStatus = (session: SessionInfo) => {
    const bookings = session.bookings || [];
    if (bookings.length >= session.session.capacity) {
      return "full";
    }
    if (bookings.length > 0) {
      return "partial";
    }
    return "empty";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "full":
        return "bg-red-500";
      case "partial":
        return "bg-yellow-500";
      case "empty":
        return "bg-green-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "full":
        return "Full";
      case "partial":
        return "Partial";
      case "empty":
        return "Available";
      default:
        return "No Session";
    }
  };

  const handleDayClick = (date: Date) => {
    const session = getSessionForDate(date);

    if (session) {
      // Show existing session
      setSelectedSession(session.session);
      setSelectedBookings(session.bookings || []);
      setIsModalOpen(true);
      onSessionSelect?.(session.session);
    } else if (mode === "admin") {
      // Show confirmation modal for creating new session
      const dateStr = format(date, "yyyy-MM-dd");
      setCreateDate(dateStr);
      setShowCreateConfirm(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
    setSelectedBookings([]);
  };

  const handleConfirmCreate = () => {
    onSessionCreate?.(createDate);
    setShowCreateConfirm(false);
    setCreateDate("");
  };

  const handleCancelCreate = () => {
    setShowCreateConfirm(false);
    setCreateDate("");
  };

  const handleBook = async (sessionId: string) => {
    await onBookingCreate?.(sessionId);
    // Refresh the session data after booking
    const session = sessions.find((s) => s.session.id === sessionId);
    if (session) {
      setSelectedBookings(session.bookings || []);
    }
  };

  const handleEdit = (session: Session) => {
    onSessionEdit?.(session);
    handleCloseModal();
  };

  const handleDelete = async (sessionId: string) => {
    if (confirm("Are you sure you want to delete this session?")) {
      await onSessionDelete?.(sessionId);
      handleCloseModal();
    }
  };

  const handleCancelBooking = async (bookingId: string, friendName: string) => {
    await onBookingCancel?.(bookingId, friendName);
    // Refresh the session data after cancellation
    if (selectedSession) {
      const session = sessions.find(
        (s) => s.session.id === selectedSession.id
      );
      if (session) {
        setSelectedBookings(session.bookings || []);
      }
    }
  };

  return (
    <>
      <div className="overflow-hidden bg-white rounded-lg shadow-lg">
        {/* Calendar Header */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg transition-colors hover:bg-gray-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg transition-colors hover:bg-gray-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="py-2 text-sm font-medium text-center text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const session = getSessionForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isPastDay = isPast(day) && !isCurrentDay;
              const sessionStatus = session ? getSessionStatus(session) : null;

              return (
                <div
                  key={index}
                  className={`
                    aspect-square p-2 border border-gray-200 rounded-lg transition-all relative
                    ${!isCurrentMonth ? "text-gray-400 bg-gray-50" : "bg-white"}
                    ${isCurrentDay ? "bg-blue-50 ring-2 ring-blue-500" : ""}
                    ${isPastDay ? "opacity-50" : ""}`}
                >
                  <div className="flex flex-col h-full">
                    {/* Day Number */}
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isCurrentDay
                          ? "text-blue-600"
                          : isCurrentMonth
                          ? "text-gray-900"
                          : "text-gray-400"
                      }`}
                    >
                      {format(day, "d")}
                    </div>

                    {/* Session Indicator */}
                    {session && (
                      <div
                        className="flex flex-col flex-1 justify-center p-1 rounded cursor-pointer hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(day);
                        }}
                      >
                        <div
                          className={`w-full h-2 rounded-full ${getStatusColor(
                            sessionStatus!
                          )} mb-1`}
                        ></div>
                        <div className="text-xs text-center text-gray-600">
                          {getStatusText(sessionStatus!)}
                        </div>
                        <div className="text-xs text-center text-gray-500">
                          {(session.bookings || []).length}/
                          {session.session.capacity}
                        </div>
                      </div>
                    )}

                    {/* Add Session Indicator for Admin */}
                    {mode === "admin" && !session && isCurrentMonth && (
                      <div className="flex flex-1 justify-center items-center">
                        <div className="w-2 h-2 bg-gray-300 rounded-full transition-colors hover:bg-blue-400"></div>
                      </div>
                    )}

                    {/* Add Session Button for Admin */}
                    {mode === "admin" && !session && isCurrentMonth && (
                      <div
                        className="flex absolute inset-0 justify-center items-center opacity-0 transition-opacity cursor-pointer hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(day);
                        }}
                      >
                        <div className="p-1 text-white bg-blue-600 rounded-full">
                          <Plus className="w-3 h-3" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex justify-center items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Partial</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Full</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <span className="text-gray-600">No Session</span>
            </div>
            {mode === "admin" && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-gray-600">Click to Create</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Modal */}
      <SessionModal
        session={selectedSession}
        bookings={selectedBookings}
        mode={mode}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onBook={handleBook}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancelBooking={handleCancelBooking}
        loading={loading}
      />

      {/* Create Session Confirmation Modal */}
      {showCreateConfirm && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="p-6 mx-4 w-full max-w-md bg-white rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Session
              </h3>
              <button
                onClick={handleCancelCreate}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-gray-600">
                Are you sure you want to create a new session for:
              </p>
              <p className="text-lg font-medium text-gray-900">
                {createDate &&
                  format(parseISO(createDate), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Default time: 7:00 AM - 9:00 AM
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancelCreate}
                className="flex-1 px-4 py-2 text-gray-700 rounded-lg border border-gray-300 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreate}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhancedCalendar;
