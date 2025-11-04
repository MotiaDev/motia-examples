# Tuesday Wake Surf Club - Agent Workflow Guide

## 🚨 CRITICAL: READ THIS FILE FIRST

**BEFORE starting ANY work on this project, you MUST read this entire AGENTS.md file completely. This is MANDATORY and cannot be skipped.**

This guide contains essential workflow patterns, project structure, and development standards that are critical for maintaining code quality and consistency.

## 🎯 How to Work on This Project

This guide explains the proper workflow for agents working on the Tuesday Wake Surf Club application. Follow these steps for every task to ensure consistency and maintainability.

## 📋 Required Workflow

### 1. Create Task Documentation
**ALWAYS start by creating a task file:**

```bash
# Create a new task file
touch tasks/TASK_NAME.md
```

**Task file template:**
```markdown
# Task: [Brief Description]

## Objective
[What needs to be accomplished]

## Context
[Why this task is needed, related issues, etc.]

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Implementation Plan
1. Step 1
2. Step 2
3. Step 3

## Files to Modify
- `path/to/file1.ts`
- `path/to/file2.tsx`

## Testing Plan
- [ ] Test scenario 1
- [ ] Test scenario 2

## Notes
[Any additional context or considerations]
```

### 2. Read Context Files First
**BEFORE making any changes, read these files:**

1. **[APP_OVERVIEW.md](agents-context/APP_OVERVIEW.md)** - Complete application understanding
2. **[WORKFLOW_ARCHITECTURE.md](agents-context/WORKFLOW_ARCHITECTURE.md)** - Backend architecture and event flow
3. **[DATA_MODELS.md](agents-context/DATA_MODELS.md)** - Data structures, types, and validation
4. **[FRONTEND_COMPONENTS.md](agents-context/FRONTEND_COMPONENTS.md)** - React components and UI patterns
5. **[DEVELOPMENT_GUIDE.md](agents-context/DEVELOPMENT_GUIDE.md)** - Development workflow and common tasks
6. **[API_REFERENCE.md](agents-context/API_REFERENCE.md)** - Complete API documentation

### 3. Update Context Documentation
**AFTER making changes, update relevant context files:**

- **Backend changes** → Update `WORKFLOW_ARCHITECTURE.md` and `DATA_MODELS.md`
- **Frontend changes** → Update `FRONTEND_COMPONENTS.md`
- **API changes** → Update `API_REFERENCE.md`
- **New features** → Update `APP_OVERVIEW.md` and `DEVELOPMENT_GUIDE.md`

### 4. Follow Project Patterns
**Use existing patterns and conventions:**

- **Step files**: Follow naming convention `##-step-name.step.ts`
- **Components**: Use TypeScript with proper interfaces
- **State management**: Use hierarchical keys and proper cleanup
- **Error handling**: Include comprehensive logging and user feedback
- **Testing**: Test with real data using `pnpm seed`

## 🏄‍♂️ Project Overview

This is the **Tuesday Wake Surf Club** - a complete wake surfing club management system built with **Motia** (backend) and **React** (frontend). The app automates the entire booking and communication workflow for weekly Tuesday morning surf sessions.

## 🚀 Quick Start Commands

```bash
# Install dependencies
pnpm install

# Generate JWT secret and create .env
pnpm setup

# Start both backend and frontend
pnpm dev:full

# Or start individually
pnpm dev          # Motia backend only
pnpm dev:frontend # React frontend only
```

## 🏗️ Project Structure

```
wake-surf-club/
├── agents-context/           # 📚 Agent context files (READ THESE FIRST!)
│   ├── APP_OVERVIEW.md
│   ├── WORKFLOW_ARCHITECTURE.md
│   ├── DATA_MODELS.md
│   ├── FRONTEND_COMPONENTS.md
│   ├── DEVELOPMENT_GUIDE.md
│   └── API_REFERENCE.md
├── steps/                    # Motia workflow steps
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
│   ├── 14-calendar-download.step.ts  # Calendar download
│   ├── 15-handle-cancellation.step.ts # Cancellation handling
│   ├── 16-handle-session-events.step.ts # Session event handling
│   ├── 17-handle-friends-import.step.ts # Friends import handling
│   ├── 18-admin-friends-list.step.ts # Admin friends list
│   ├── 19-admin-friends-delete.step.ts # Admin friends delete
│   └── 20-seed-demo-data.step.ts # Demo data seeding
├── src/                      # React frontend
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles
│   └── components/          # React components
│       ├── UserInterface.tsx # Public booking interface
│       ├── AdminPanel.tsx   # Admin management interface
│       └── CalendarView.tsx # Calendar visualization
├── types/                    # TypeScript definitions
│   ├── models.ts            # Data models and schemas
│   └── utils.ts             # Utility functions
├── scripts/                  # Setup and utility scripts
│   ├── setup.js             # Environment setup
│   └── seed-test-data.js    # Test data generation
└── package.json             # Dependencies and scripts
```

## 🔄 Weekly Workflow

### Automated Schedule
1. **Friday 12:00pm**: `SeedNextTuesdaySession` creates next week's session
2. **Monday 3:00pm**: `SendInviteBlast` texts all active friends with booking links
3. **Tuesday 5:30am**: `SendMorningReminder` texts confirmed attendees with roster and location

### Booking Flow
1. Friend receives SMS with signed booking link
2. Taps link → lands on `/book?token=...` page
3. Clicks "Book My Spot" → `BookFromSignedLink` step processes
4. If successful → confirmation SMS + calendar invite
5. If full → "Session Full" message

## 🛠️ Development Patterns

### Adding New Features
1. **Read Context Files**: Start with `agents-context/` files
2. **Create Step**: Add new step file in `steps/` directory
3. **Define Events**: Set up event subscriptions and emissions
4. **Update Types**: Add TypeScript types in `types/`
5. **Add Frontend**: Create React components in `src/`
6. **Test**: Use Motia Workbench and test data

### Common Step Patterns

#### API Step (TypeScript)
```typescript
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'StepName',
  method: 'POST',
  path: '/api/endpoint',
  bodySchema: z.object({...}),
  responseSchema: { 200: z.object({...}) },
  emits: ['event.topic'],
  flows: ['wake-surf-club']
}
```

#### Event Step (TypeScript)
```typescript
export const config: EventConfig = {
  type: 'event',
  name: 'StepName',
  subscribes: ['input.topic'],
  emits: ['output.topic'],
  input: z.object({...}),
  flows: ['wake-surf-club']
}
```

#### Cron Step (TypeScript)
```typescript
export const config: CronConfig = {
  type: 'cron',
  name: 'StepName',
  cron: '0 12 * * FRI', // Every Friday at noon
  emits: ['event.topic'],
  flows: ['wake-surf-club']
}
```

## 🔐 Environment Variables

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890

# JWT Signing Secret (auto-generated by pnpm setup)
HOST_SIGNING_SECRET=your-super-secure-secret-key-here

# Public App URL (for generating links in SMS)
PUBLIC_APP_URL=http://localhost:3000

# Timezone (default: America/Chicago)
TIMEZONE=America/Chicago
```

## 📱 Key Data Models

### Friend
```typescript
interface Friend {
  id: string              // UUID for friend
  name: string            // Display name
  phoneE164: string       // E164 format: "+1234567890"
  active: boolean         // Whether to send invites
  createdAt: string       // ISO timestamp
}
```

### Session
```typescript
interface Session {
  id: string              // UUID for session
  date: string            // YYYY-MM-DD format
  startTime: string       // "07:00" format
  endTime: string         // "09:00" format
  capacity: number        // Max attendees (default: 3)
  status: 'draft' | 'published' | 'closed'
  location: string | null // Meeting location
  createdAt: string       // ISO timestamp
}
```

### Booking
```typescript
interface Booking {
  id: string              // UUID for booking
  sessionId: string       // Reference to session
  friendId: string        // Reference to friend
  phoneE164: string       // Friend's phone (for lookup)
  status: 'confirmed' | 'canceled' | 'waitlisted'
  createdAt: string       // ISO timestamp
  canceledAt?: string     // ISO timestamp if canceled
}
```

## 🎯 Common Tasks

### Adding New API Endpoint
1. Create step file in `steps/`
2. Define API config with method, path, schemas
3. Implement handler with proper error handling
4. Add to frontend if needed
5. Test with Motia Workbench

### Adding New Event Handler
1. Create step file in `steps/`
2. Define event config with subscribes/emits
3. Implement handler with state management
4. Test event flow
5. Add logging and error handling

### Adding New Frontend Component
1. Create component in `src/components/`
2. Add routing in `App.tsx` if needed
3. Implement API integration
4. Add proper error handling and loading states
5. Test responsive design

## 🐛 Debugging

### Backend Debugging
- Use Motia Workbench: http://localhost:8000/workbench
- Check step logs with traceId
- Verify event subscriptions and emissions
- Test with seed data: `pnpm seed`

### Frontend Debugging
- Check browser console for errors
- Use React DevTools
- Test API calls in Network tab
- Verify responsive design

### Common Issues
- **SMS not sending**: Check Twilio credentials and phone format
- **Booking not working**: Verify JWT token and session status
- **Admin panel issues**: Check admin token and API endpoints

## 🧪 Testing

### Test Data
```bash
# Generate test data and tokens
pnpm seed
```

### Manual Testing
1. Start app: `pnpm dev:full`
2. Visit: http://localhost:3000
3. Use admin panel: http://localhost:3000/admin
4. Test booking flow with generated links
5. Check SMS delivery in Twilio console

## 📁 Project Structure

```
wake-surf-club/
├── tasks/                    # 📝 Task documentation (CREATE THESE!)
│   ├── add-new-feature.md
│   ├── fix-booking-bug.md
│   └── update-sms-templates.md
├── agents-context/           # 📚 Context files (READ THESE FIRST!)
│   ├── APP_OVERVIEW.md
│   ├── WORKFLOW_ARCHITECTURE.md
│   ├── DATA_MODELS.md
│   ├── FRONTEND_COMPONENTS.md
│   ├── DEVELOPMENT_GUIDE.md
│   └── API_REFERENCE.md
├── steps/                    # Motia workflow steps
├── src/                      # React frontend
├── types/                    # TypeScript definitions
└── scripts/                  # Setup and utility scripts
```

## 🔄 Complete Workflow Example

### Step 1: Create Task File
```bash
# Example: Adding a new feature
touch tasks/add-waitlist-feature.md
```

### Step 2: Document the Task
```markdown
# Task: Add Waitlist Feature

## Objective
Allow friends to join a waitlist when sessions are full, with automatic promotion when spots open.

## Context
Currently when sessions are full, friends get a "Session Full" message. We need to capture their interest and notify them when spots become available.

## Requirements
- [ ] Add waitlist status to Booking model
- [ ] Create waitlist API endpoint
- [ ] Update booking flow to handle waitlist
- [ ] Add waitlist management to admin panel
- [ ] Send notifications when spots open

## Implementation Plan
1. Update Booking model with waitlist status
2. Create waitlist API endpoint
3. Update booking confirmation flow
4. Add admin waitlist management
5. Create notification system for waitlist promotions

## Files to Modify
- `types/models.ts` - Add waitlist status
- `steps/04-book-from-link.step.ts` - Handle waitlist bookings
- `steps/05-cancel-from-link.step.ts` - Check for waitlist promotions
- `src/components/AdminPanel.tsx` - Add waitlist management
- `src/components/UserInterface.tsx` - Show waitlist option

## Testing Plan
- [ ] Test booking when session is full
- [ ] Test waitlist promotion when someone cancels
- [ ] Test admin waitlist management
- [ ] Test SMS notifications for waitlist

## Notes
Consider implementing a first-come-first-served waitlist system.
```

### Step 3: Read Context Files
```bash
# Read all context files before starting
cat agents-context/APP_OVERVIEW.md
cat agents-context/WORKFLOW_ARCHITECTURE.md
cat agents-context/DATA_MODELS.md
# ... etc
```

### Step 4: Implement Changes
Follow the implementation plan, making changes to the specified files.

### Step 5: Update Context Documentation
```bash
# Update relevant context files
# Edit agents-context/DATA_MODELS.md - Add waitlist status
# Edit agents-context/WORKFLOW_ARCHITECTURE.md - Add waitlist flow
# Edit agents-context/API_REFERENCE.md - Add waitlist endpoints
# Edit agents-context/FRONTEND_COMPONENTS.md - Add waitlist UI
```

### Step 6: Test and Validate
```bash
# Test the implementation
pnpm dev:full
pnpm seed
# Test the new feature thoroughly
```

## 🎯 Task Categories

### Backend Tasks
- **New API endpoints** → Update `API_REFERENCE.md`
- **New steps** → Update `WORKFLOW_ARCHITECTURE.md`
- **Data model changes** → Update `DATA_MODELS.md`
- **Event flow changes** → Update `WORKFLOW_ARCHITECTURE.md`

### Frontend Tasks
- **New components** → Update `FRONTEND_COMPONENTS.md`
- **UI changes** → Update `FRONTEND_COMPONENTS.md`
- **New routes** → Update `FRONTEND_COMPONENTS.md`

### Feature Tasks
- **New features** → Update `APP_OVERVIEW.md`
- **Workflow changes** → Update `WORKFLOW_ARCHITECTURE.md`
- **New integrations** → Update `DEVELOPMENT_GUIDE.md`

## 📝 Documentation Standards

### Task File Naming
- Use kebab-case: `add-waitlist-feature.md`
- Be descriptive: `fix-sms-delivery-issue.md`
- Include action: `update-booking-flow.md`

### Context File Updates
- **Always update** relevant context files after changes
- **Include examples** of new code patterns
- **Update diagrams** if workflow changes
- **Add new API endpoints** to reference
- **Document new data models** and types

### Code Comments
- **Document complex logic** in step handlers
- **Explain business rules** in comments
- **Include examples** in JSDoc comments
- **Document state keys** and their purposes

## 🚨 Common Mistakes to Avoid

1. **Skipping task documentation** - Always create task files first
2. **Not reading context files** - Leads to inconsistent implementations
3. **Forgetting to update context** - Documentation becomes outdated
4. **Not following naming conventions** - Breaks project consistency
5. **Skipping testing** - Can break existing functionality
6. **Not considering SMS integration** - Many features need SMS notifications

## ✅ Success Checklist

Before considering any task complete:

- [ ] Task file created and documented
- [ ] Context files read and understood
- [ ] Implementation follows existing patterns
- [ ] All relevant context files updated
- [ ] Code tested with real data
- [ ] SMS integration considered (if applicable)
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] Mobile-first design maintained
- [ ] Security best practices followed

## 🎉 Remember

This is a production-ready system that handles real SMS communications and bookings. Always:
- **Test thoroughly** with real data
- **Follow established patterns**
- **Update documentation** as you go
- **Consider the user experience**
- **Think about edge cases**
- **Plan for error scenarios**

The context files in `agents-context/` are your best friends - they contain everything you need to understand and work on this system effectively!
