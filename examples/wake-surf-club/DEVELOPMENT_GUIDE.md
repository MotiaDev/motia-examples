# Wake Surf Club - Development Guide

## Quick Start

### 1. Environment Setup
```bash
# Clone and install
git clone <repository>
cd wake-surf-club
pnpm install

# Generate JWT secret and create .env
pnpm setup

# Edit .env with your Twilio credentials
# TWILIO_ACCOUNT_SID=your_account_sid
# TWILIO_AUTH_TOKEN=your_auth_token
# TWILIO_FROM_NUMBER=+1234567890
```

### 2. Development Server
```bash
# Start both backend and frontend
pnpm dev:full

# Or start individually
pnpm dev          # Motia backend only
pnpm dev:frontend # React frontend only
```

### 3. Access Points
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
│   ├── 14-calendar-download.step.ts  # Calendar download
│   ├── 15-handle-cancellation.step.ts # Cancellation handling
│   ├── 16-handle-session-events.step.ts # Session event handling
│   ├── 17-handle-friends-import.step.ts # Friends import handling
│   ├── 18-admin-friends-list.step.ts # Admin friends list
│   ├── 19-admin-friends-delete.step.ts # Admin friends delete
│   └── 20-seed-demo-data.step.ts # Demo data seeding
├── src/                       # React frontend
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # React entry point
│   ├── index.css             # Global styles
│   └── components/           # React components
│       ├── UserInterface.tsx # Public booking interface
│       ├── AdminPanel.tsx    # Admin management interface
│       └── CalendarView.tsx  # Calendar visualization
├── types/                     # TypeScript definitions
│   ├── models.ts             # Data models and schemas
│   └── utils.ts              # Utility functions
├── scripts/                   # Setup and utility scripts
│   ├── setup.js              # Environment setup
│   └── seed-test-data.js     # Test data generation
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project documentation
```

## Development Workflow

### Adding New Features

#### 1. Backend Step
```typescript
// steps/new-feature.step.ts
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'NewFeature',
  description: 'Description of what this step does',
  subscribes: ['input.topic'],
  emits: ['output.topic'],
  input: z.object({
    // Define input schema
  }),
  flows: ['wake-surf-club']
}

export const handler: Handlers['NewFeature'] = async (input, { emit, logger, state, traceId }) => {
  try {
    // Process input
    // Update state if needed
    // Emit events
    
    await emit({
      topic: 'output.topic',
      data: { /* result data */ }
    })
    
    logger.info('Feature completed', { /* context */ })
  } catch (error: any) {
    logger.error('Feature failed', { error: error.message, traceId })
  }
}
```

#### 2. Frontend Component
```typescript
// src/components/NewComponent.tsx
import React, { useState, useEffect } from 'react'

interface NewComponentProps {
  // Define props
}

const NewComponent: React.FC<NewComponentProps> = ({ /* props */ }) => {
  const [state, setState] = useState(initialValue)
  
  useEffect(() => {
    // Load data
  }, [])
  
  const handleAction = async () => {
    try {
      const response = await fetch('/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ /* data */ })
      })
      
      if (response.ok) {
        // Handle success
      } else {
        // Handle error
      }
    } catch (error) {
      // Handle error
    }
  }
  
  return (
    <div className="container">
      {/* JSX content */}
    </div>
  )
}

export default NewComponent
```

#### 3. Update Types
```typescript
// types/models.ts
export const NewFeatureSchema = z.object({
  // Define schema
})

export type NewFeature = z.infer<typeof NewFeatureSchema>
```

### Testing New Features

#### 1. Unit Testing
```typescript
// Test step handler
import { handler } from '../steps/new-feature.step'

test('should process input correctly', async () => {
  const input = { /* test input */ }
  const mockContext = { /* mock context */ }
  
  await handler(input, mockContext)
  
  expect(mockContext.emit).toHaveBeenCalledWith({
    topic: 'output.topic',
    data: { /* expected data */ }
  })
})
```

#### 2. Integration Testing
```typescript
// Test complete flow
test('should handle complete booking flow', async () => {
  // 1. Create session
  // 2. Send invite
  // 3. Process booking
  // 4. Verify confirmation
})
```

#### 3. Manual Testing
```bash
# Use test data script
pnpm seed

# Test with Motia Workbench
# Visit http://localhost:8000/workbench
```

## Common Development Tasks

### Adding New API Endpoint
```typescript
// steps/new-api.step.ts
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'NewApi',
  method: 'POST',
  path: '/api/new-endpoint',
  bodySchema: z.object({
    // Request schema
  }),
  responseSchema: {
    200: z.object({
      // Response schema
    }),
    400: z.object({ error: z.string() })
  },
  emits: ['event.topic'],
  flows: ['wake-surf-club']
}
```

### Adding New Cron Job
```typescript
// steps/new-cron.step.ts
export const config: CronConfig = {
  type: 'cron',
  name: 'NewCron',
  cron: '0 12 * * MON', // Every Monday at noon
  emits: ['event.topic'],
  flows: ['wake-surf-club']
}
```

### Adding New Event Handler
```typescript
// steps/new-event.step.ts
export const config: EventConfig = {
  type: 'event',
  name: 'NewEventHandler',
  subscribes: ['input.topic'],
  emits: ['output.topic'],
  input: z.object({
    // Input schema
  }),
  flows: ['wake-surf-club']
}
```

### Adding New Frontend Route
```typescript
// src/App.tsx
<Routes>
  <Route path="/new-route" element={<NewComponent />} />
</Routes>
```

## Debugging

### Backend Debugging
```bash
# Check step logs
motia logs steps/01-send-sms.step.ts

# Use Workbench for visualization
# Visit http://localhost:8000/workbench

# Check state data
motia state get friends +15551234567
```

### Frontend Debugging
```bash
# Check browser console
# Use React DevTools
# Check network tab for API calls
```

### Common Issues

#### SMS Not Sending
1. Check Twilio credentials in `.env`
2. Verify phone number format (E164)
3. Check Twilio console for delivery status
4. Review SMS step logs

#### Booking Not Working
1. Check JWT token validity
2. Verify session exists and is published
3. Check capacity limits
4. Review booking step logs

#### Admin Panel Not Loading
1. Check admin token in localStorage
2. Verify API endpoints are accessible
3. Check browser console for errors
4. Review admin step logs

## Environment Configuration

### Required Environment Variables
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

### Optional Environment Variables
```bash
# Database URL (if using external database)
DATABASE_URL=postgresql://user:pass@localhost:5432/wakesurf

# Redis URL (if using external Redis)
REDIS_URL=redis://localhost:6379
```

## Deployment

### Backend Deployment (Motia Cloud)
```bash
# Build and deploy
pnpm build
motia deploy

# Set environment variables in Motia Cloud dashboard
```

### Frontend Deployment (Vercel)
```bash
# Build frontend
pnpm build:frontend

# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
```

### Production Checklist
- [ ] Environment variables configured
- [ ] Twilio credentials set
- [ ] JWT secret configured
- [ ] Public app URL set
- [ ] Timezone configured
- [ ] Health checks working
- [ ] Error tracking configured
- [ ] Monitoring set up

## Performance Optimization

### Backend Optimization
- Use efficient state queries
- Implement proper caching
- Optimize SMS delivery
- Monitor step execution times

### Frontend Optimization
- Use React.memo for expensive components
- Implement proper loading states
- Optimize bundle size
- Use CDN for static assets

## Security Considerations

### Backend Security
- Validate all inputs with Zod schemas
- Use proper JWT token validation
- Implement rate limiting
- Secure admin endpoints

### Frontend Security
- Sanitize user inputs
- Use HTTPS in production
- Implement proper error handling
- Secure API calls

## Monitoring & Observability

### Logging
- Structured JSON logs
- Trace ID for request tracking
- Error context and stack traces
- Performance metrics

### Health Checks
- Step health monitoring
- State storage health
- External service health
- API endpoint health

### Alerting
- SMS delivery failures
- Booking system errors
- Admin panel issues
- Performance degradation

This development guide provides a comprehensive foundation for working with the wake surf club application.
