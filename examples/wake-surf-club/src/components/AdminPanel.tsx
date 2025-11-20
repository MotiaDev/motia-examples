import React, { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  Settings,
  Plus,
  Edit,
  Trash2,
  Send,
  Download,
  X,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import EnhancedCalendar from "./EnhancedCalendar";
import {
  loadSessionsFromAPI,
  SessionInfo,
  Session,
} from "../utils/sessionData";

interface Friend {
  id: string;
  name: string;
  phone: string;
  phoneE164: string;
  active: boolean;
  createdAt: string;
}

interface SettingsConfig {
  capacity: number;
  startTime: string;
  endTime: string;
  location: string | null;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"users" | "sessions" | "settings">(
    "sessions"
  );
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Settings state
  const [settings, setSettings] = useState<SettingsConfig>({
    capacity: 3,
    startTime: "07:00",
    endTime: "09:00",
    location: null,
  });

  // User management state
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<Friend | null>(null);
  const [newUser, setNewUser] = useState({ name: "", phone: "" });

  // Booking cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingBooking, setCancelingBooking] = useState<{
    id: string;
    friendName: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    loadFriends();
    loadSessions();
    loadSettings();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    console.log("Showing toast:", message, type);
    setToast({ message, type });
    setTimeout(() => {
      console.log("Auto-hiding toast");
      setToast(null);
    }, 5000); // Auto-hide after 5 seconds
  };

  const loadSettings = async () => {
    try {
      // For now, we'll use the hardcoded defaults since we don't have a GET endpoint
      // In the future, you could create a GET /admin/settings endpoint
      setSettings({
        capacity: 3,
        startTime: "07:00",
        endTime: "09:00",
        location: null,
      });
    } catch (err) {
      console.log("Failed to load settings, using defaults");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validate time logic on frontend
      const [startHour, startMin] = settings.startTime.split(":").map(Number);
      const [endHour, endMin] = settings.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        showToast("End time must be after start time", "error");
        return;
      }

      const response = await fetch("/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || "Settings saved successfully!", "success");
        // Update local state with response to ensure consistency
        setSettings(data.settings);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to save settings", "error");
      }
    } catch (err) {
      showToast("Failed to save settings. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async (retryCount = 0) => {
    try {
      const response = await fetch("/admin/friends");
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      } else {
        console.log("Failed to load friends:", response.status);
        setFriends([]); // Set empty array on failure
      }
    } catch (err) {
      console.log("Error loading friends:", err);
      // If backend isn't ready yet, retry after a delay
      if (retryCount < 3) {
        setTimeout(() => {
          loadFriends(retryCount + 1);
        }, 1000); // Wait 1 second before retry
      } else {
        showToast(
          "Backend is not responding. Please check if the server is running.",
          "error"
        );
        setFriends([]); // Set empty array on final failure
      }
    }
  };

  const loadSessions = async (retryCount = 0) => {
    try {
      const sessionsInfo = await loadSessionsFromAPI(true);
      setSessions(sessionsInfo);
    } catch (err) {
      console.log("Error loading sessions:", err);
      // If backend isn't ready yet, retry after a delay
      if (retryCount < 3) {
        setTimeout(() => {
          loadSessions(retryCount + 1);
        }, 1000); // Wait 1 second before retry
      } else {
        showToast(
          "Backend is not responding. Please check if the server is running.",
          "error"
        );
        setSessions([]); // Set empty array on final failure
      }
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.phone) return;

    try {
      const response = await fetch("/admin/friends/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          friends: [newUser],
        }),
      });

      if (response.ok) {
        setNewUser({ name: "", phone: "" });
        setShowAddUser(false);
        loadFriends();
      }
    } catch (err) {
      showToast("Failed to add user", "error");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin/friends/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingUser.name,
          phone: editingUser.phoneE164,
          active: editingUser.active,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || "Friend updated successfully", "success");
        setEditingUser(null);
        loadFriends();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to update friend", "error");
      }
    } catch (err) {
      showToast("Failed to update friend. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (friendId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/admin/friends/${friendId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || "Friend deleted successfully", "success");
        loadFriends(); // Refresh the list - removes from UI
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to delete friend", "error");
      }
    } catch (err) {
      showToast("Failed to delete friend. Please try again.", "error");
    }
  };

  const handleSendInvites = async () => {
    try {
      const response = await fetch("/admin/invite/send", {
        method: "POST",
      });

      if (response.ok) {
        alert("Invites sent successfully!");
      }
    } catch (err) {
      showToast("Failed to send invites", "error");
    }
  };

  // Calendar handlers
  const handleSessionCreate = async (date: string) => {
    try {
      setLoading(true);

      const response = await fetch("/admin/session/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          startTime: "07:00",
          endTime: "09:00",
          capacity: 3,
          status: "published",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Session created:", data);
        showToast(`Session created successfully for ${date}!`, "success");
        // Refresh the sessions list
        await loadSessions();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to create session", "error");
      }
    } catch (err) {
      showToast("Failed to create session", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSessionEdit = async (session: Session) => {
    try {
      // This would open an edit modal or navigate to edit page
      alert(
        `Editing session for ${session.date}. This would integrate with your session edit API.`
      );
    } catch (err) {
      showToast("Failed to edit session", "error");
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      // This would call an API to delete the session
      alert(
        `Deleting session ${sessionId}. This would integrate with your session deletion API.`
      );
      loadSessions();
    } catch (err) {
      showToast("Failed to delete session", "error");
    }
  };

  const handleBookingCancel = async (bookingId: string, friendName: string) => {
    // Show the cancellation modal
    setCancelingBooking({ id: bookingId, friendName });
    setShowCancelModal(true);
    setCancelReason("");
  };

  const confirmBookingCancellation = async () => {
    if (!cancelingBooking) return;

    try {
      setCanceling(true);

      // Log booking details before API call
      console.log("=== Canceling Booking ===");
      console.log("Booking ID:", cancelingBooking.id);
      console.log("Friend Name:", cancelingBooking.friendName);
      console.log("Reason:", cancelReason);
      console.log("API URL:", `/admin/booking/${cancelingBooking.id}/cancel`);
      console.log("========================");

      const response = await fetch(
        `/admin/booking/${cancelingBooking.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: cancelReason || undefined,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        showToast(
          data.message ||
            "Booking canceled successfully. User notified via SMS.",
          "success"
        );
        setShowCancelModal(false);
        setCancelingBooking(null);
        setCancelReason("");
        loadSessions(); // Refresh to show updated bookings
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to cancel booking", "error");
      }
    } catch (err) {
      showToast("Failed to cancel booking. Please try again.", "error");
    } finally {
      setCanceling(false);
    }
  };

  const handleBookingCreate = async (sessionId: string) => {
    try {
      setLoading(true);

      // For demo purposes, we'll use a demo friend
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
        console.log("Booking response:", data); // Debug log

        // Handle different response statuses
        switch (data.status) {
          case "confirmed":
            showToast(
              data.message ||
                "Successfully booked! You will receive a confirmation SMS.",
              "success"
            );
            loadSessions(); // Refresh to show updated booking count
            break;

          case "already_booked":
            showToast(
              data.message || "You are already booked for this session!",
              "error"
            );
            break;

          case "full":
            showToast(data.message || "Sorry, this session is full.", "error");
            break;

          case "waitlisted":
            showToast(
              data.message || "You are on the waitlist for this session.",
              "success"
            );
            loadSessions(); // Refresh to show updated booking count
            break;

          default:
            showToast("Unknown booking status received.", "error");
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Booking failed", "error");
      }
    } catch (err) {
      showToast("Booking failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
        6
      )}`;
    }
    return phone;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Wake Surf Club Admin
              </h1>
              <p className="text-gray-600">Manage your wake surfing sessions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: "users", label: "Users", icon: Users },
              { id: "sessions", label: "Sessions", icon: Calendar },
              { id: "settings", label: "Settings", icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Friends Management
              </h2>
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center px-4 py-2 space-x-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Friend</span>
              </button>
            </div>

            {/* Add User Modal */}
            {showAddUser && (
              <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
                <div className="p-6 w-full max-w-md bg-white rounded-lg">
                  <h3 className="mb-4 text-lg font-semibold">Add New Friend</h3>
                  <form onSubmit={handleAddUser}>
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="name-input"
                          className="block mb-1 text-sm font-medium text-gray-700"
                        >
                          Name
                        </label>
                        <input
                          id="name-input"
                          type="text"
                          value={newUser.name}
                          onChange={(e) =>
                            setNewUser({ ...newUser, name: e.target.value })
                          }
                          className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="phone-input"
                          className="block mb-1 text-sm font-medium text-gray-700"
                        >
                          Phone Number
                        </label>
                        <input
                          id="phone-input"
                          type="tel"
                          value={newUser.phone}
                          onChange={(e) =>
                            setNewUser({ ...newUser, phone: e.target.value })
                          }
                          className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="(555) 123-4567"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-6 space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowAddUser(false)}
                        className="px-4 py-2 text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Add Friend
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
              <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
                <div className="p-6 w-full max-w-md bg-white rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold">Edit Friend</h3>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Close edit modal"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleUpdateUser}>
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="edit-name-input"
                          className="block mb-1 text-sm font-medium text-gray-700"
                        >
                          Name
                        </label>
                        <input
                          id="edit-name-input"
                          type="text"
                          value={editingUser.name}
                          onChange={(e) =>
                            setEditingUser({
                              ...editingUser,
                              name: e.target.value,
                            })
                          }
                          className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="edit-phone-input"
                          className="block mb-1 text-sm font-medium text-gray-700"
                        >
                          Phone Number
                        </label>
                        <input
                          id="edit-phone-input"
                          type="tel"
                          value={editingUser.phoneE164}
                          onChange={(e) =>
                            setEditingUser({
                              ...editingUser,
                              phoneE164: e.target.value,
                            })
                          }
                          className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="+15551234567"
                          required
                        />
                      </div>
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editingUser.active}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                active: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Active (receives invites)
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end mt-6 space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        disabled={loading}
                        className="px-4 py-2 text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Updating..." : "Update Friend"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="overflow-hidden bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Added
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {friends && friends.length > 0 ? (
                    friends.map((friend) => (
                      <tr key={friend.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {friend.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatPhone(friend.phone)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              friend.active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {friend.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {format(parseISO(friend.createdAt), "MMM d, yyyy")}
                        </td>
                        <td className="px-6 py-4 space-x-2 text-sm font-medium whitespace-nowrap">
                          <button
                            onClick={() => setEditingUser(friend)}
                            className="text-blue-600 hover:text-blue-900"
                            aria-label={`Edit ${friend.name}`}
                            title={`Edit ${friend.name}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(friend.id)}
                            className="text-red-600 hover:text-red-900"
                            aria-label={`Delete ${friend.name}`}
                            title={`Delete ${friend.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No friends found. Add some friends to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Session Management
              </h2>
              <div className="flex space-x-4">
                <button
                  onClick={handleSendInvites}
                  className="flex items-center px-4 py-2 space-x-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Invites</span>
                </button>
              </div>
            </div>

            {/* Calendar */}
            <EnhancedCalendar
              sessions={sessions}
              mode="admin"
              onSessionCreate={handleSessionCreate}
              onSessionEdit={handleSessionEdit}
              onSessionDelete={handleSessionDelete}
              onBookingCreate={handleBookingCreate}
              onBookingCancel={handleBookingCancel}
              loading={loading}
            />

            {/* Quick Stats */}
            {sessions && sessions.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="p-6 bg-white rounded-lg shadow">
                  <h3 className="mb-2 text-lg font-semibold">Total Sessions</h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {sessions.length}
                  </p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                  <h3 className="mb-2 text-lg font-semibold">Total Bookings</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {sessions.reduce(
                      (total, session) =>
                        total + (session.bookings?.length || 0),
                      0
                    )}
                  </p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                  <h3 className="mb-2 text-lg font-semibold">Active Friends</h3>
                  <p className="text-3xl font-bold text-purple-600">
                    {friends ? friends.filter((f) => f.active).length : 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

            {/* Session Configuration */}
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="mb-4 text-lg font-semibold">
                Session Configuration
              </h3>
              <form onSubmit={handleSaveSettings}>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="session-capacity"
                      className="block mb-1 text-sm font-medium text-gray-700"
                    >
                      Session Capacity
                    </label>
                    <input
                      id="session-capacity"
                      type="number"
                      min="1"
                      max="20"
                      value={settings.capacity}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          capacity: parseInt(e.target.value),
                        })
                      }
                      className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="session-start-time"
                      className="block mb-1 text-sm font-medium text-gray-700"
                    >
                      Session Start Time
                    </label>
                    <input
                      id="session-start-time"
                      type="time"
                      value={settings.startTime}
                      onChange={(e) =>
                        setSettings({ ...settings, startTime: e.target.value })
                      }
                      className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="session-end-time"
                      className="block mb-1 text-sm font-medium text-gray-700"
                    >
                      Session End Time
                    </label>
                    <input
                      id="session-end-time"
                      type="time"
                      value={settings.endTime}
                      onChange={(e) =>
                        setSettings({ ...settings, endTime: e.target.value })
                      }
                      className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="session-location"
                      className="block mb-1 text-sm font-medium text-gray-700"
                    >
                      Default Location
                    </label>
                    <input
                      id="session-location"
                      type="text"
                      value={settings.location || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          location: e.target.value || null,
                        })
                      }
                      placeholder="Lake location or address"
                      className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </form>
            </div>

            {/* Current Settings Display */}
            <div className="p-6 bg-gray-50 rounded-lg">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Current Configuration
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600">Session Capacity</p>
                  <p className="text-lg font-medium text-gray-900">
                    {settings.capacity} people
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Session Time</p>
                  <p className="text-lg font-medium text-gray-900">
                    {settings.startTime} - {settings.endTime}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Default Location</p>
                  <p className="text-lg font-medium text-gray-900">
                    {settings.location || "No default location set"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && cancelingBooking && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="p-6 w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Cancel Booking
              </h3>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelingBooking(null);
                  setCancelReason("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel the booking for{" "}
                <span className="font-semibold text-gray-900">
                  {cancelingBooking.friendName}
                </span>
                ?
              </p>
            </div>

            <div className="mb-4">
              <label
                htmlFor="cancel-reason"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Reason (optional but recommended for records)
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g., Weather conditions, Equipment issue, Emergency..."
              />
            </div>

            <div className="flex gap-3 items-start p-3 mb-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertTriangle className="flex-shrink-0 mt-0.5 w-5 h-5 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                <p className="mb-1 font-medium">This action will:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Notify the user via SMS</li>
                  <li>• Free up the spot</li>
                  <li>• Promote waitlist if available</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelingBooking(null);
                  setCancelReason("");
                }}
                disabled={canceling}
                className="px-4 py-2 text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBookingCancellation}
                disabled={canceling}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canceling ? "Canceling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300 ease-in-out transform">
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

export default AdminPanel;
