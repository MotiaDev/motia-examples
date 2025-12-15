import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import EnhancedCalendar from "./EnhancedCalendaer";
import { loadSessionsFromAPI, type SessionInfo } from "../utils/sessionData";

const UserInterface: React.FC = () => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<
    "idle" | "booking" | "success" | "error"
  >("idle");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const loadSessions = async (retryCount = 0) => {
    try {
      setLoading(true);
      const sessionsInfo = await loadSessionsFromAPI();
      setSessions(sessionsInfo);
    } catch (err) {
      if (retryCount < 5) {
        setTimeout(() => {
          loadSessions(retryCount + 1);
        }, 2000);
      } else {
        setError(
          "Backend is not responding. Please check if the server is running."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = async (sessionId: string) => {
    setBookingStatus("booking");

    try {
      const response = await fetch("/api/book/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          friendName: "Demo Friend",
          phoneE164: "+15551234567",
        }),
      });

      if (response.ok) {
        const data = await response.json();

        switch (data.status) {
          case "confirmed":
            setBookingStatus("success");
            showToast(
              data.message ||
                "Successfully booked! You will receive a confirmation SMS.",
              "success"
            );
            loadSessions();
            break;

          case "already_booked":
            setBookingStatus("error");
            showToast(
              data.message || "You are already booked for this session!",
              "error"
            );
            break;

          case "full":
            setBookingStatus("error");
            showToast(data.message || "Sorry, this session is full.", "error");
            break;

          case "waitlisted":
            setBookingStatus("success");
            showToast(
              data.message || "You are on the waitlist for this session.",
              "success"
            );
            loadSessions();
            break;

          default:
            setBookingStatus("error");
            showToast("Unknown booking status received.", "error");
        }
      } else {
        const errorData = await response.json();
        setBookingStatus("error");
        showToast(errorData.error || "Booking failed", "error");
      }
    } catch (err) {
      setBookingStatus("error");
      showToast("Booking failed. Please try again.", "error");
    } finally {
      setTimeout(() => {
        setBookingStatus("idle");
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading session information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 w-12 h-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-8 mx-auto max-w-6xl sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-2 text-4xl font-bold text-gray-900">
              Wake Surf Club
            </h1>
            <p className="text-xl text-gray-600">
              Join us for an epic morning on the water!
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-8 mx-auto max-w-6xl sm:px-6 lg:px-8">
        {/* Calendar */}
        <div className="mb-8">
          <EnhancedCalendar
            sessions={sessions}
            mode="public"
            onBookingCreate={handleBookSession}
            loading={bookingStatus === "booking"}
          />
        </div>

        {/* Additional Info */}
        <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
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

        {/* Contact Info */}
        <div className="mt-6 text-center text-gray-600">
          <p>Questions? Contact the host directly via SMS</p>
          <p className="mt-1 text-sm">
            You'll receive booking confirmations and reminders via text message
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] transform transition-all duration-300 ease-in-out">
          <div
            className={`px-6 py-4 rounded-lg shadow-xl max-w-sm border-l-4 ${
              toast.type === "success"
                ? "bg-green-50 text-green-800 border-green-500"
                : "bg-red-50 text-red-800 border-red-500"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-3 ${
                    toast.type === "success" ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <span className="font-medium">{toast.message}</span>
              </div>
              <button
                onClick={() => setToast(null)}
                className="ml-4 text-xl leading-none text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInterface;
