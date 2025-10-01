# Email Marketing Automation Engine

A comprehensive email marketing automation platform built with Motia and Appwrite, featuring AI-powered personalization, behavioral triggers, and scalable campaign management.

![Motia Email Marketing System](./assets/motia-workbench.gif)

## Overview

This project demonstrates building a complete email marketing automation system using Motia's event-driven architecture integrated with Appwrite as the backend service. The system handles campaign creation, user segmentation, AI-powered content personalization, email delivery, and analytics tracking.

## Features

- **Campaign Creation API** - REST endpoint for creating and managing email campaigns
- **Smart User Segmentation** - Advanced audience targeting (VIP, new users, active, inactive)
- **AI Content Personalization** - Python-based content generation with dynamic customization
- **Scheduled Campaigns** - Time-based campaign scheduling and automated delivery
- **Email Analytics** - Real-time tracking of delivery, opens, clicks, and engagement metrics
- **Behavioral Triggers** - Automated campaigns based on user actions and engagement patterns
- **Welcome Email Series** - Multi-step onboarding sequences for new users
- **Unsubscribe Management** - Compliant one-click unsubscribe handling

## Architecture

The system uses Motia's workflow orchestration with 10 interconnected steps:

1. **Campaign Creation** (`01-create-campaign.step.ts`) - API endpoint for campaign setup
2. **User Segmentation** (`02-user-segmentation.step.ts`) - Audience targeting and filtering
3. **Content Personalization** (`03-content-personalization.step.py`) - AI-powered content generation
4. **Email Delivery** (`04-email-delivery.step.ts`) - Batch email processing with rate limiting
5. **Email Scheduler** (`05-email-scheduler.step.ts`) - Cron-based scheduled campaign management
6. **Analytics Tracker** (`06-email-analytics-tracker.step.ts`) - Real-time engagement tracking
7. **Campaign Monitor** (`07-campaign-status-monitor.step.ts`) - Campaign health monitoring
8. **Unsubscribe Handler** (`08-unsubscribe-handler.step.ts`) - Compliance-focused unsubscribe processing
9. **Welcome Series** (`09-welcome-email-series.step.ts`) - Automated onboarding sequences
10. **Behavioral Triggers** (`10-behavioral-trigger-engine.step.ts`) - User behavior-based automation

## Technology Stack

- **Framework**: Motia (workflow orchestration)
- **Backend**: Appwrite (database, authentication, messaging)
- **Languages**: TypeScript, Python
- **Email Delivery**: SendGrid (via Appwrite Messaging)
- **Validation**: Zod schemas
- **AI**: OpenAI GPT integration for content personalization

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python 3.8+
- Motia CLI installed
- Appwrite account (cloud or self-hosted)
- SendGrid/Mailgun account for email delivery

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd motia-email-automation-engine
```

2. Install dependencies:

```bash
npm install
npx motia install  # Install Python dependencies for AI step
```

3. Configure environment variables:

```bash
# Create .env file with:
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
OPENAI_API_KEY=your-openai-key  # Optional for AI personalization
```

4. Set up Appwrite:

   - Create database collections for campaigns, users, and analytics
   - Configure SendGrid as email provider in Appwrite Messaging console
   - Enable Users and Messaging services

5. Start the development server:

```bash
npx motia dev
```

## Usage

### Creating a Campaign

Send a POST request to create a campaign:

```json
POST /campaigns
{
  "name": "VIP Customer Exclusive Offer",
  "subject": "Exclusive VIP Benefits",
  "template": "vip",
  "targetAudience": "vip",
  "personalizeContent": true,
  "scheduledFor": "2025-09-25T10:00:00Z"  // Optional
}
```

### Campaign Types

**Basic Campaign:**

```json
{
  "name": "Weekly Newsletter",
  "subject": "This Week's Updates",
  "template": "newsletter",
  "targetAudience": "all",
  "personalizeContent": false
}
```

**Behavioral Campaign:**

```json
{
  "name": "Win-Back Campaign",
  "subject": "We miss you!",
  "template": "winback",
  "targetAudience": "inactive",
  "personalizeContent": true,
  "behaviorTrigger": "inactivity"
}
```

## User Segmentation

The system supports automatic user segmentation:

- **all** - All users in the database
- **vip** - High-value customers (based on purchase history)
- **new_users** - Recently registered users (last 30 days)
- **active** - Regularly engaged users
- **inactive** - Users with low recent engagement

## Monitoring

Access the Motia Workbench at `http://localhost:3000` to view:

- Real-time workflow execution
- Campaign performance metrics
- Email delivery status
- System traces and logs

## Configuration

### Email Provider Setup

1. Configure SendGrid in Appwrite Console:

   - Go to Messaging → Providers
   - Add SendGrid provider with API key
   - Set sender email and domain

2. Update API key scopes in Appwrite:
   - Ensure `users.read`, `users.write`, `messaging.read`, `messaging.write` are enabled

### Database Schema

The system expects these Appwrite collections:

- **campaigns** - Campaign data with scheduledFor datetime field
- **users** - User profiles with email, status, metadata
- **analytics** - Email engagement tracking data

## Testing Different Scenarios

Test various workflow paths:

1. **Immediate Campaign** - Basic campaign sent immediately
2. **Scheduled Campaign** - Future delivery with scheduler step
3. **VIP Segmentation** - Targeted campaign for high-value users
4. **Personalized Content** - AI-generated custom messages
5. **Behavioral Triggers** - Campaigns based on user actions

## Development

The system demonstrates advanced Motia features:

- Multi-language workflows (TypeScript + Python)
- Event-driven architecture
- State management across steps
- Cron job scheduling
- External service integration
- Error handling and retries

Each step is designed to be modular and can be extended or customized based on specific requirements.
