import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UserInterface from "./components/UserInterface";
import MyBookings from "./components/MyBookings";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <nav className="bg-white shadow-sm">
          <div className="px-4 mx-auto max-w-6xl sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-gray-900">
                Wake Surf Club
              </h1>
              <div className="flex gap-4">
                <a
                  href="/"
                  className="font-medium text-gray-700 hover:text-blue-600"
                >
                  Calendar
                </a>
                <a
                  href="/my-bookings"
                  className="font-medium text-gray-700 hover:text-blue-600"
                >
                  My Bookings
                </a>
              </div>
            </div>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<UserInterface />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/book" element={<BookSession />} />
            <Route path="/cancel" element={<CancelSession />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function BookSession() {
  return (
    <div className="px-4 py-8 mx-auto max-w-2xl">
      <div className="p-8 text-center bg-white rounded-lg shadow-lg">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Book Your Session
        </h1>
        <p className="mb-4 text-gray-600">
          This page would normally be accessed via a signed link in your SMS
          invite.
        </p>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
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
    <div className="px-4 py-8 mx-auto max-w-2xl">
      <div className="p-8 text-center bg-white rounded-lg shadow-lg">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Cancel Your Booking
        </h1>
        <p className="mb-4 text-gray-600">
          This page would normally be accessed via a signed link in your
          confirmation SMS.
        </p>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> In a real implementation, this would be a
            signed link that automatically identifies the friend and allows them
            to cancel their booking.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
