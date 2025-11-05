import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import AdminPanel from "./components/AdminPanel";
import UserInterface from "./components/UserInterface";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600">
        <nav className="px-5 bg-white shadow-sm">
          <div className="flex justify-between items-center mx-auto max-w-7xl h-16">
            <Link
              to="/"
              className="text-xl font-bold text-gray-800 no-underline"
            >
              Wake Surf Club
            </Link>
            <Link
              to="/admin"
              className="px-4 py-2 text-sm font-medium text-gray-500 no-underline rounded-md transition-all duration-200 hover:text-gray-800 hover:bg-gray-100"
            >
              Admin
            </Link>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<UserInterface />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/book" element={<BookSession />} />
            <Route path="/cancel" element={<CancelSession />} />
            <Route path="/session/next" element={<NextSession />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function BookSession() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Book Your Session</h1>
        <p className="subtitle">
          This page would normally be accessed via a signed link in your SMS
          invite.
        </p>
        <div className="message info">
          <p>
            <strong>Note:</strong> In a real implementation, this would be a
            signed link that automatically identifies the friend and allows them
            to book with one click.
          </p>
        </div>
      </div>
    </div>
  );
}

function CancelSession() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Cancel Your Booking</h1>
        <p className="subtitle">
          This page would normally be accessed via a signed link in your
          confirmation SMS.
        </p>
        <div className="message info">
          <p>
            <strong>Note:</strong> In a real implementation, this would be a
            signed link that automatically identifies the friend and allows them
            to cancel their booking.
          </p>
        </div>
      </div>
    </div>
  );
}

function NextSession() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Next Session Info</h1>
        <p className="subtitle">
          This would show information about upcoming sessions.
        </p>
        <div className="message info">
          <p>
            <strong>API Endpoint:</strong> This would call /api/sessions to get
            session details.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
