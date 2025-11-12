# Tuesday WakeSurf Club

A complete wake surfing club management system built with **Motia** (backend) and **React** (frontend). This app handles SMS invitations, booking management, calendar integration, and automated reminders for weekly Tuesday morning surf sessions.

## Features

### 🏄‍♂️ Core Functionality
- **Automated SMS Invitations**: Send booking links to friends every Monday at 3pm
- **One-Click Booking**: Friends tap SMS links to book spots instantly
- **Calendar Integration**: Automatic ICS calendar invite generation
- **Morning Reminders**: Tuesday 5:30am reminders with roster and location
- **Capacity Management**: Hard limit of 3 spots (plus host)
- **Cancellation Handling**: 12-hour cancellation window with SMS notifications

### 🔧 Admin Features
- **Friend Management**: Import friends with name and phone number
- **Manual Invite Triggers**: Send invites on-demand
- **Session Overview**: View bookings, roster, and availability
- **Real-time Updates**: Live roster and booking status

### 📱 User Experience
- **Mobile-First Design**: Optimized for phone booking
- **Signed Links**: Secure, token-based authentication
- **Real-time Status**: Live availability and roster updates
- **Error Handling**: Clear feedback for all scenarios

## Tech Stack

### Backend (Motia)
- **Event-Driven Architecture**: Steps communicate via topics
- **Multi-Language Support**: TypeScript for APIs, Python for ML, Ruby for jobs
- **Real-time State**: Persistent data with automatic cleanup
- **Scheduled Tasks**: Cron jobs for invites and reminders
- **SMS Integration**: Twilio with retry logic and deduplication

### Frontend (React + Vite)
- **Modern React**: Hooks, TypeScript, responsive design
- **Vite Build**: Fast development and optimized production builds
- **React Router**: Client-side routing for different pages
- **Mobile-First**: Responsive design optimized for phones

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Setup
Copy the example environment file and configure your settings:
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890

# JWT Signing Secret (generate a secure random string)
HOST_SIGNING_SECRET=your-super-secure-secret-key-here

# Public App URL (for generating links in SMS)
PUBLIC_APP_URL=http://localhost:3000

# Timezone (default: America/Chicago)
TIMEZONE=America/Chicago
```

### 3. Start Development
```bash
# Start both backend and frontend
pnpm dev:full

# Or start individually:
pnpm dev          # Motia backend only
pnpm dev:frontend # React frontend only
```

### 4. Access the App
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Motia Workbench**: http://localhost:8000/workbench

## Project Structure

```
wake-surf-club/
├── steps/                     # Motia workflow steps
│   ├── 01-send-sms.step.ts           # SMS integration
│   ├── 02-generate-ics.step.ts       # Calendar invites
│   ├── 03-seed-next-session.step.ts  # Session creation
│   ├── 04-book-from-link.step.ts     # Booking API
│   ├── 05-cancel-from-link.step.ts   # Cancellation API
│   ├── 06-send-invite-blast.step.ts  # Monday invites
│   ├── 07-send-morning-reminder.step.ts # Tuesday reminders
│   ├── 08-booking-confirmation.step.ts # Confirmation flow
│   ├── 09-admin-friends-import.step.ts # Admin friend management
│   ├── 10-admin-session-info.step.ts # Admin session view
│   ├── 11-admin-send-invites.step.ts # Manual invite trigger
│   ├── 12-manual-invite-trigger.step.ts # Manual invite handler
│   ├── 13-public-session-info.step.ts # Public session API
│   └── 14-calendar-download.step.ts  # Calendar download
├── src/                       # React frontend
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # React entry point
│   └── index.css             # Styling
├── types/                     # TypeScript definitions
│   ├── models.ts             # Data models and schemas
│   └── utils.ts              # Utility functions
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite configuration
└── README.md                 # This file
```

## API Endpoints

### Public Endpoints
- `POST /api/book` - Book a session from signed link
- `POST /api/cancel` - Cancel a booking from signed link
- `GET /api/session/next` - Get current session info
- `GET /api/calendar/download` - Download ICS calendar file

### Admin Endpoints (require Bearer token)
- `POST /admin/friends/import` - Import friends list
- `GET /admin/session/next` - Get detailed session info
- `POST /admin/invite/send` - Trigger manual invite blast

## Workflow Overview

### Weekly Cycle
1. **Friday 12:00pm**: `SeedNextTuesdaySession` creates next week's session
2. **Monday 3:00pm**: `SendInviteBlast` texts all active friends with booking links
3. **Tuesday 5:30am**: `SendMorningReminder` texts confirmed attendees with roster and location

### Booking Flow
1. Friend receives SMS with signed booking link
2. Taps link → lands on `/book?token=...` page
3. Clicks "Book My Spot" → `BookFromSignedLink` step processes
4. If successful → confirmation SMS + calendar invite
5. If full → "Session Full" message

### Cancellation Flow
1. Friend receives confirmation SMS with cancellation link
2. Taps cancellation link → lands on `/cancel?token=...` page
3. Clicks "Cancel My Spot" → `CancelFromSignedLink` step processes
4. Booking marked as canceled, roster updated

## Data Models

### Friend
```typescript
{
  id: string
  name: string
  phoneE164: string // "+1XXXXXXXXXX"
  active: boolean
  createdAt: string
}
```

### Session
```typescript
{
  id: string
  date: string // "YYYY-MM-DD"
  startTime: string // "07:00"
  endTime: string // "09:00"
  capacity: number // 3
  status: "draft" | "published" | "closed"
  location: string | null
  createdAt: string
}
```

### Booking
```typescript
{
  id: string
  sessionId: string
  friendId: string
  phoneE164: string
  status: "confirmed" | "canceled" | "waitlisted"
  createdAt: string
  canceledAt?: string
}
```

## SMS Message Templates

### Invite (Monday 3pm)
```
Tuesday Surf Club is on! 7–9am. Book your spot: {bookingLink}
```

### Confirmation
```
You're in for Tue 7–9am. Add to calendar: {calendarLink}. Need to cancel? {cancelLink}
```

### Morning Reminder (Tuesday 5:30am)
```
See you at 7:00! Roster: {rosterNames}. Meet at {location}.
```

## Deployment

### Backend (Motia Cloud)
```bash
# Build and deploy to Motia Cloud
pnpm build
motia deploy
```

### Frontend (Vercel)
```bash
# Build frontend
pnpm build:frontend

# Deploy to Vercel
vercel --prod
```

### Environment Variables
Set these in your deployment environment:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `HOST_SIGNING_SECRET`
- `PUBLIC_APP_URL` (your deployed frontend URL)

## Development

### Adding New Features
1. Create new step files in `steps/` directory
2. Define event subscriptions and emissions
3. Update TypeScript types in `types/`
4. Add frontend components in `src/`
5. Test with Motia Workbench

### Testing
```bash
# Run Motia tests
pnpm test

# Test individual steps
motia test steps/01-send-sms.step.ts
```

### Debugging
- Use Motia Workbench for step visualization
- Check logs in development console
- Use `traceId` for request tracing
- Monitor SMS delivery in Twilio console

## Security

- **Signed Tokens**: All booking links use JWT with 24-hour expiry
- **Admin Authentication**: Bearer token required for admin endpoints
- **Phone Validation**: E164 format validation for all phone numbers
- **Rate Limiting**: Built into Motia framework
- **Input Validation**: Zod schemas for all API inputs

## Monitoring

- **Structured Logging**: JSON logs with traceId context
- **Error Tracking**: Failed SMS and booking attempts logged
- **Audit Trail**: All bookings and cancellations tracked
- **Health Checks**: Built-in Motia health monitoring

## Cost Optimization

- **SMS Costs**: Only send to active friends
- **State Cleanup**: Automatic TTL for temporary data
- **Efficient Queries**: Optimized state access patterns
- **Minimal Infrastructure**: Serverless Motia deployment

## Support

For issues or questions:
1. Check the Motia documentation
2. Review step logs in Workbench
3. Verify environment configuration
4. Test with Twilio sandbox numbers first

---

**Built with ❤️ using Motia and React**# wake-surf-club
