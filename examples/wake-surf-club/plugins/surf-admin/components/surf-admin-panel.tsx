/**
 * Surf Club Admin Panel
 *
 * Workbench plugin component for managing the Wake Surf Club booking system.
 * Provides interfaces for friends management, session creation, bookings overview, and analytics.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Badge, Button } from "@motiadev/ui";
import {
  Users,
  Calendar,
  Clock,
  Send,
  Trash2,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Home,
  TrendingUp,
  UserPlus,
  Download,
} from "lucide-react";
import BookingsTab from "./BookingsTab";

// Utility for className merging
const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(" ");
};

interface Friend {
  id: string;
  name: string;
  phone: string;
  phoneE164: string;
  active: boolean;
  createdAt: string;
}

interface RosterItem {
  name: string;
  phoneMasked: string;
}

interface Session {
  session: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
    status: string;
    location?: string;
    createdAt: string;
  };
  roster: RosterItem[];
  stats: {
    confirmed: number;
    available: number;
    waitlisted: number;
  };
  waitlist?: Array<{
    name: string;
    phone: string;
  }>;
}

type TabType = "friends" | "sessions" | "bookings" | "actions" | "analytics";

export const SurfAdminPanel = () => {
  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Forms state
  const [showImportForm, setShowImportForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [importText, setImportText] = useState("");
  const [sessionForm, setSessionForm] = useState({
    date: "",
    startTime: "07:00",
    endTime: "09:00",
    capacity: 3,
    location: "Main Lake Dock",
    status: "published",
  });

  // Fetch friends
  const fetchFriends = useCallback(async () => {
    try {
      setFriendsLoading(true);
      const response = await fetch("/admin/friends");
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (err: any) {
      setError("Failed to load friends");
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const response = await fetch("/api/sessions");
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err: any) {
      setError("Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // Auto-refresh data
  useEffect(() => {
    if (activeTab === "friends") {
      fetchFriends();
    } else if (activeTab === "sessions" || activeTab === "bookings") {
      fetchSessions();
    }
  }, [activeTab, fetchFriends, fetchSessions]);

  // Import friends
  const handleImportFriends = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Parse CSV-like input: "Name, Phone" per line
      const lines = importText.trim().split("\n");
      const friendsToImport = lines
        .map((line) => {
          const [name, phone] = line.split(",").map((s) => s.trim());
          return { name, phone };
        })
        .filter((f) => f.name && f.phone);

      const response = await fetch("/admin/friends/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friends: friendsToImport }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Imported ${data.imported} friends successfully`);
        setImportText("");
        setShowImportForm(false);
        fetchFriends();
      } else {
        setError(data.error || "Import failed");
      }
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  // Delete friend
  const handleDeleteFriend = async (friendId: string, friendName: string) => {
    if (!confirm(`Delete ${friendName}? This cannot be undone.`)) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/admin/friends/${friendId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccess(`Deleted ${friendName}`);
        fetchFriends();
      } else {
        const data = await response.json();
        setError(data.error || "Delete failed");
      }
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  };

  // Create session
  const handleCreateSession = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch("/admin/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionForm),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Session created for ${sessionForm.date}`);
        setShowSessionForm(false);
        setSessionForm({
          date: "",
          startTime: "07:00",
          endTime: "09:00",
          capacity: 3,
          location: "Main Lake Dock",
          status: "published",
        });
        fetchSessions();
      } else {
        setError(data.error || "Session creation failed");
      }
    } catch (err: any) {
      setError(err.message || "Session creation failed");
    } finally {
      setLoading(false);
    }
  };

  // Trigger invites
  const handleTriggerInvites = async () => {
    if (!confirm("Send invite SMS to all active friends?")) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch("/admin/invite/send", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || "Invites sent successfully");
      } else {
        setError(data.error || "Failed to send invites");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send invites");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "friends" as TabType, label: "Friends", icon: Users },
    { id: "sessions" as TabType, label: "Sessions", icon: Calendar },
    { id: "bookings" as TabType, label: "Bookings", icon: Home },
    { id: "actions" as TabType, label: "Actions", icon: Send },
    { id: "analytics" as TabType, label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="flex overflow-hidden flex-col h-full bg-background">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-zinc-900">
        <div className="flex gap-3 items-center">
          <Calendar className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Surf Club Admin</h1>
          <Badge variant="default">Tuesday 7-9am</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-zinc-900">
        <div className="flex px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-zinc-400 hover:text-zinc-300"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="overflow-auto flex-1">
        <div className="p-6 mx-auto space-y-6 max-w-7xl">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-500 dark:bg-red-950">
              <div className="flex gap-2 items-center text-red-700 dark:text-red-300">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-500 dark:bg-green-950">
              <div className="flex gap-2 items-center text-green-700 dark:text-green-300">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium">{success}</p>
              </div>
            </div>
          )}

          {/* Friends Tab */}
          {activeTab === "friends" && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="flex gap-2 items-center text-xl font-semibold">
                  <Users className="w-5 h-5" />
                  Friends Management ({friends.length})
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={fetchFriends}
                    disabled={friendsLoading}
                  >
                    <RefreshCw
                      className={cn(
                        "w-4 h-4",
                        friendsLoading && "animate-spin"
                      )}
                    />
                  </Button>
                  <Button onClick={() => setShowImportForm(!showImportForm)}>
                    <UserPlus className="mr-2 w-4 h-4" />
                    {showImportForm ? "Cancel" : "Import Friends"}
                  </Button>
                </div>
              </div>

              {/* Import Form */}
              {showImportForm && (
                <div className="p-6 rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
                  <h3 className="mb-4 text-lg font-semibold">Import Friends</h3>
                  <p className="mb-4 text-sm text-zinc-400">
                    Enter one friend per line in format: Name, Phone
                    <br />
                    Example: John Doe, 5551234567
                  </p>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full px-3 py-2 bg-background border rounded-md min-h-[120px] font-mono text-sm"
                    placeholder="Alice Smith, 5551234567&#10;Bob Johnson, 5559876543"
                  />
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleImportFriends}
                      disabled={loading || !importText.trim()}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 w-4 h-4" />
                          Import Friends
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowImportForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Friends Table */}
              <div className="overflow-hidden rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
                <table className="w-full">
                  <thead className="bg-zinc-800">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium text-left">
                        Name
                      </th>
                      <th className="px-4 py-3 text-sm font-medium text-left">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-sm font-medium text-left">
                        Status
                      </th>
                      <th className="px-4 py-3 text-sm font-medium text-left">
                        Added
                      </th>
                      <th className="px-4 py-3 text-sm font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {friendsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center">
                          <Loader2 className="mx-auto w-6 h-6 animate-spin text-zinc-400" />
                        </td>
                      </tr>
                    ) : friends.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-zinc-400"
                        >
                          No friends yet. Import some to get started!
                        </td>
                      </tr>
                    ) : (
                      friends.map((friend) => (
                        <tr key={friend.id} className="hover:bg-zinc-800/50">
                          <td className="px-4 py-3">{friend.name}</td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {friend.phone}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={friend.active ? "default" : "outline"}
                            >
                              {friend.active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-400">
                            {new Date(friend.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteFriend(friend.id, friend.name)
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Sessions Tab */}
          {activeTab === "sessions" && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="flex gap-2 items-center text-xl font-semibold">
                  <Calendar className="w-5 h-5" />
                  Sessions Management ({sessions.length})
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={fetchSessions}
                    disabled={sessionsLoading}
                  >
                    <RefreshCw
                      className={cn(
                        "w-4 h-4",
                        sessionsLoading && "animate-spin"
                      )}
                    />
                  </Button>
                  <Button onClick={() => setShowSessionForm(!showSessionForm)}>
                    <Plus className="mr-2 w-4 h-4" />
                    {showSessionForm ? "Cancel" : "Create Session"}
                  </Button>
                </div>
              </div>

              {/* Session Form */}
              {showSessionForm && (
                <div className="p-6 rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
                  <h3 className="mb-4 text-lg font-semibold">
                    Create New Session
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="session-date"
                        className="block mb-2 text-sm font-medium"
                      >
                        Date *
                      </label>
                      <input
                        id="session-date"
                        type="date"
                        value={sessionForm.date}
                        onChange={(e) =>
                          setSessionForm({
                            ...sessionForm,
                            date: e.target.value,
                          })
                        }
                        className="px-3 py-2 w-full rounded-md border bg-background"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="session-capacity"
                        className="block mb-2 text-sm font-medium"
                      >
                        Capacity *
                      </label>
                      <input
                        id="session-capacity"
                        type="number"
                        value={sessionForm.capacity}
                        onChange={(e) =>
                          setSessionForm({
                            ...sessionForm,
                            capacity: parseInt(e.target.value),
                          })
                        }
                        className="px-3 py-2 w-full rounded-md border bg-background"
                        min="1"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="session-start-time"
                        className="block mb-2 text-sm font-medium"
                      >
                        Start Time
                      </label>
                      <input
                        id="session-start-time"
                        type="time"
                        value={sessionForm.startTime}
                        onChange={(e) =>
                          setSessionForm({
                            ...sessionForm,
                            startTime: e.target.value,
                          })
                        }
                        className="px-3 py-2 w-full rounded-md border bg-background"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="session-end-time"
                        className="block mb-2 text-sm font-medium"
                      >
                        End Time
                      </label>
                      <input
                        id="session-end-time"
                        type="time"
                        value={sessionForm.endTime}
                        onChange={(e) =>
                          setSessionForm({
                            ...sessionForm,
                            endTime: e.target.value,
                          })
                        }
                        className="px-3 py-2 w-full rounded-md border bg-background"
                      />
                    </div>
                    <div className="col-span-2">
                      <label
                        htmlFor="session-location"
                        className="block mb-2 text-sm font-medium"
                      >
                        Location
                      </label>
                      <input
                        id="session-location"
                        type="text"
                        value={sessionForm.location}
                        onChange={(e) =>
                          setSessionForm({
                            ...sessionForm,
                            location: e.target.value,
                          })
                        }
                        className="px-3 py-2 w-full rounded-md border bg-background"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleCreateSession}
                      disabled={loading || !sessionForm.date}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 w-4 h-4" />
                          Create Session
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowSessionForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Sessions List */}
              <div className="space-y-4">
                {sessionsLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="mx-auto w-8 h-8 animate-spin text-zinc-400" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400">
                    No sessions yet. Create one to get started!
                  </div>
                ) : (
                  sessions.map(({ session, roster, stats }) => (
                    <div
                      key={session.id}
                      className="p-6 rounded-lg border shadow-lg bg-zinc-900 border-zinc-800"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {new Date(session.date).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </h3>
                          <p className="flex gap-2 items-center mt-1 text-sm text-zinc-400">
                            <Clock className="w-4 h-4" />
                            {session.startTime} - {session.endTime}
                            {session.location && ` • ${session.location}`}
                          </p>
                        </div>
                        <Badge
                          variant={
                            session.status === "published"
                              ? "default"
                              : "outline"
                          }
                        >
                          {session.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-zinc-800">
                          <p className="text-sm text-zinc-400">Confirmed</p>
                          <p className="text-2xl font-bold text-green-500">
                            {stats.confirmed}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-zinc-800">
                          <p className="text-sm text-zinc-400">Available</p>
                          <p className="text-2xl font-bold text-blue-500">
                            {stats.available}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-zinc-800">
                          <p className="text-sm text-zinc-400">Waitlisted</p>
                          <p className="text-2xl font-bold text-yellow-500">
                            {stats.waitlisted}
                          </p>
                        </div>
                      </div>

                      {roster.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium">Roster:</p>
                          <p className="text-sm text-zinc-400">
                            {roster.map((r) => r.name).join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Bookings Tab */}
          {activeTab === "bookings" && <BookingsTab />}

          {/* Actions Tab */}
          {activeTab === "actions" && (
            <>
              <h2 className="flex gap-2 items-center text-xl font-semibold">
                <Send className="w-5 h-5" />
                Manual Actions
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="p-6 rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
                  <h3 className="flex gap-2 items-center mb-2 text-lg font-semibold">
                    <Send className="w-5 h-5 text-blue-500" />
                    Send Invites
                  </h3>
                  <p className="mb-4 text-sm text-zinc-400">
                    Manually trigger invite SMS blast to all active friends for
                    next Tuesday's session.
                  </p>
                  <Button
                    onClick={handleTriggerInvites}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 w-4 h-4" />
                        Trigger Invite Blast
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-6 rounded-lg border shadow-lg opacity-50 bg-zinc-900 border-zinc-800">
                  <h3 className="flex gap-2 items-center mb-2 text-lg font-semibold">
                    <Clock className="w-5 h-5 text-green-500" />
                    Send Reminders
                  </h3>
                  <p className="mb-4 text-sm text-zinc-400">
                    Morning reminders are sent automatically at 5:30am on
                    Tuesday.
                  </p>
                  <Button disabled className="w-full">
                    <Clock className="mr-2 w-4 h-4" />
                    Automated Only
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <>
              <h2 className="flex gap-2 items-center text-xl font-semibold">
                <TrendingUp className="w-5 h-5" />
                Analytics & Stats
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="p-6 rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-zinc-400">Total Friends</p>
                      <p className="text-3xl font-bold">{friends.length}</p>
                    </div>
                    <Users className="w-10 h-10 text-blue-500 opacity-50" />
                  </div>
                </div>

                <div className="p-6 rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-zinc-400">Total Sessions</p>
                      <p className="text-3xl font-bold">{sessions.length}</p>
                    </div>
                    <Calendar className="w-10 h-10 text-green-500 opacity-50" />
                  </div>
                </div>

                <div className="p-6 rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-zinc-400">Total Bookings</p>
                      <p className="text-3xl font-bold">
                        {sessions.reduce(
                          (sum, s) => sum + s.stats.confirmed,
                          0
                        )}
                      </p>
                    </div>
                    <Home className="w-10 h-10 text-purple-500 opacity-50" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
                <h3 className="mb-4 text-lg font-semibold">Active Friends</h3>
                <div className="flex gap-2 items-center">
                  <progress
                    className="flex-1 h-4 rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-green-500 [&::-moz-progress-bar]:bg-green-500"
                    value={friends.filter((f) => f.active).length}
                    max={friends.length || 1}
                  />
                  <span className="text-sm font-medium">
                    {friends.filter((f) => f.active).length} / {friends.length}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
