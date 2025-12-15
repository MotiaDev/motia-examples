# Wake Surf Club

A complete wake surf club booking and session management system built with **Motia** - demonstrating event-driven workflows, state management, SMS notifications, and calendar integration.

## Overview

This project showcases a real-world application for managing wake surf club sessions, bookings, and member communications. It includes:

- **Session Management**: Create, list, and manage surf sessions with capacity limits
- **Booking System**: Direct booking with automatic waitlist handling
- **Friend Management**: Import and manage club members
- **SMS Notifications**: Automated invites, confirmations, reminders, and cancellations via Twilio
- **Calendar Integration**: Generate and download ICS calendar files for sessions
- **Admin Panel**: Manage bookings, sessions, and friends through a custom Workbench plugin
- **Frontend UI**: React-based calendar interface for viewing and booking sessions

## Features

### Public API Endpoints

- `GET /api/sessions/list` - List all published sessions with bookings
- `GET /api/sessions/:id` - Get detailed session information
- `POST /api/book/direct` - Book a session directly
- `POST /api/book/cancel` - Cancel a booking via token
- `GET /api/calendar/:sessionId` - Download session calendar file

### Admin API Endpoints

- `POST /api/admin/sessions/create` - Create a new session
- `POST /api/admin/friends/import` - Import friends from CSV/data
- `GET /api/admin/friends/list` - List all friends
- `POST /api/admin/friends/delete` - Remove a friend
- `POST /api/admin/bookings/delete` - Cancel a booking
- `POST /api/admin/invites/trigger` - Send invite SMS to all active friends

### Automated Workflows

- **Morning Reminders**: Cron job sends SMS reminders the morning of each session
- **Invite Blasts**: Scheduled SMS invites to all active friends for upcoming sessions
- **Session Seeding**: Automatic creation of next week's session
- **Booking Confirmations**: Event-driven SMS confirmations when bookings are created
- **Calendar Generation**: Automatic ICS file generation for confirmed bookings

## Quick Start

### Prerequisites

- Node.js 18+
- Twilio account (for SMS functionality)
- Redis (for BullMQ queue and state management)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Environment Setup

Edit `.env` with your configuration:

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# JWT Secret for cancellation tokens
JWT_SECRET=your_secret_key

# Redis Configuration (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Running the Application

```bash
# Start the development server
npm run dev
```

This starts:

- **Motia Runtime** - Backend API and workflows
- **Workbench** - Development UI at `http://localhost:3000`
- **Frontend** - React app (if configured)

### Accessing the Workbench

1. Open [`http://localhost:3000`](http://localhost:3000) in your browser
2. Use the **Surf Admin** plugin (top navigation) to manage sessions and bookings
3. View API endpoints, event flows, and logs in the Workbench

## Project Structure

```
wake-surf-club/
├── steps/                    # Step definitions
│   ├── api/                  # API endpoints
│   │   ├── public/          # Public booking endpoints
│   │   └── admin/           # Admin management endpoints
│   ├── events/              # Event-driven workflows
│   │   ├── confirm-booking.step.ts
│   │   ├── send-sms.step.ts
│   │   ├── generate-calendar.step.ts
│   │   └── handle-cancellation.step.ts
│   └── cron/                # Scheduled jobs
│       ├── send-morning-reminder.step.ts
│       ├── send-invite-blast.step.ts
│       └── seed-next-session.step.ts
├── src/
│   ├── types/               # TypeScript models and schemas
│   │   ├── models.ts        # Core data models (Session, Booking, Friend)
│   │   └── utils.ts         # Helper functions
│   └── services/            # Shared services
├── plugins/
│   └── surf-admin/          # Custom Workbench admin panel
├── frontend/                # React frontend application
├── motia.config.ts          # Motia configuration
└── package.json
```

## Step Types Used

| Type        | Purpose                | Examples                                                |
| ----------- | ---------------------- | ------------------------------------------------------- |
| **`api`**   | HTTP endpoints         | Booking, session listing, admin operations              |
| **`event`** | Event-driven workflows | Booking confirmations, SMS sending, calendar generation |
| **`cron`**  | Scheduled tasks        | Morning reminders, invite blasts, session seeding       |

## Key Workflows

### Booking Flow

1. User books session via `POST /api/book/direct`
2. System checks capacity and creates booking
3. `booking.created` event is emitted
4. Event triggers SMS confirmation
5. Calendar file is generated for confirmed bookings

### Cancellation Flow

1. User receives SMS with cancellation link (JWT token)
2. User clicks link → `POST /api/book/cancel`
3. `booking.canceled` event is emitted
4. Event triggers cancellation SMS and updates roster

### Session Management

1. Admin creates session via Workbench or API
2. Cron job seeds next week's session automatically
3. Invite blast sends SMS to all active friends
4. Morning reminder sent on session day

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm run start

# Generate TypeScript types from Step configs
npm run generate-types

# Build for deployment
npm run build

# Clean build artifacts
npm run clean
```

## State Management

The application uses Motia's state plugin to store:

- **Sessions**: `state.get("sessions", sessionId)` or `state.get("sessions", "list")`
- **Bookings**: `state.get("bookings", bookingId)` or `state.get("bookings", "list")`
- **Friends**: `state.get("friends", phoneE164)` or `state.get("friends", "list")`

All data is persisted and available across restarts.

## Frontend

The React frontend (`frontend/`) provides:

- **Calendar View**: Visual calendar showing all sessions
- **Booking Interface**: Book sessions directly from the calendar
- **My Bookings**: View and manage your bookings
- **Session Details**: View roster and session information

To run the frontend separately:

```bash
cd frontend
npm install
npm run dev
```

## Learn More

- [Motia Documentation](https://motia.dev/docs) - Complete guides and API reference
- [Quick Start Guide](https://motia.dev/docs/getting-started/quick-start) - Detailed getting started tutorial
- [Core Concepts](https://motia.dev/docs/concepts/overview) - Learn about Steps and Motia architecture
- [Discord Community](https://discord.gg/motia) - Get help and connect with other developers
