# Email Marketing Automation Engine

A comprehensive email marketing automation platform built with the Motia framework, featuring AI-powered personalization, behavioral triggers, and enterprise-scale campaign management.

## Overview

This project demonstrates how to build a complete email marketing automation system using Motia's event-driven architecture. It includes campaign creation, user segmentation, AI-powered content personalization, behavioral triggers, analytics tracking, and multi-provider email delivery.

## Features

### 📧 Campaign Management

- **Campaign Creation API** - REST endpoint for creating email campaigns with comprehensive validation
- **User Segmentation** - Advanced audience targeting with multiple segmentation criteria
- **Scheduled Campaigns** - Time-based campaign scheduling with automated triggers

### 🤖 AI-Powered Personalization

- **Content Personalization** - Python-based AI content generation using language models
- **Dynamic Subject Lines** - Personalized subject lines based on user data and behavior
- **Template Customization** - Flexible template system with user-specific customization

### ⚡ Email Delivery System

- **Batch Processing** - Efficient email delivery with rate limiting and parallel processing
- **Multi-Provider Support** - Support for SendGrid, Resend, Mailgun, and other providers
- **Delivery Tracking** - Real-time delivery status and performance monitoring

### 📊 Analytics & Tracking

- **Real-Time Analytics** - Comprehensive email engagement tracking (opens, clicks, bounces)
- **Campaign Metrics** - Detailed performance analytics with delivery, open, and click rates
- **Daily Reporting** - Automated daily analytics reports with anomaly detection

### 🎯 Behavioral Marketing

- **User Activity Tracking** - Comprehensive user behavior monitoring and engagement scoring
- **Behavioral Triggers** - Automated campaigns based on cart abandonment, inactivity, and engagement
- **Welcome Series** - Multi-step onboarding email sequences with smart progression

### 🔗 Integrations & Webhooks

- **Multi-Provider Webhooks** - Secure webhook processing from various email service providers
- **External System Integration** - Support for Appwrite, Stripe, and other third-party services
- **Audit Trails** - Complete compliance logging for GDPR and CAN-SPAM requirements

### 🛡️ User Management

- **Preference Management** - User-friendly preference update and unsubscribe handling
- **Compliance Features** - Built-in GDPR and CAN-SPAM compliance with audit logging
- **Referral Tracking** - Automated referral campaign detection and processing

## Architecture

The system is built using Motia's event-driven architecture with 15 interconnected steps:

1. **Campaign Creation** (`01-create-campaign.step.ts`) - API endpoint for campaign creation
2. **User Segmentation** (`02-user-segmentation.step.ts`) - Audience targeting and filtering
3. **Content Personalization** (`03-content-personalization_step.py`) - AI-powered content generation
4. **Email Delivery** (`04-email-delivery.step.ts`) - Batch email processing and sending
5. **Email Scheduler** (`05-email-scheduler.step.ts`) - Cron-based scheduled campaign management
6. **Analytics Tracker** (`06-email-analytics-tracker.step.ts`) - Real-time engagement tracking
7. **Campaign Monitor** (`07-campaign-status-monitor.step.ts`) - Campaign health monitoring
8. **Webhook Handler** (`08-webhook-handler.step.ts`) - Multi-provider webhook processing
9. **User Registration** (`09-user-registration-handler.step.ts`) - New user onboarding
10. **Preference Updates** (`10-user-preference-update.step.ts`) - User preference management
11. **Unsubscribe Handler** (`11-unsubscribe-handler.step.ts`) - One-click unsubscribe processing
12. **Activity Tracker** (`12-user-activity-tracker.step.ts`) - User behavior monitoring
13. **Welcome Series** (`13-welcome-email-series.step.ts`) - Onboarding email sequences
14. **Behavioral Triggers** (`14-behavioral-trigger-engine.step.ts`) - Automated behavioral campaigns
15. **Daily Reports** (`15-daily-analytics-report.step.ts`) - Business intelligence reporting

## Technology Stack

- **Framework**: Motia
- **Languages**: TypeScript, Python
- **Database**: Appwrite
- **Email Providers**: SendGrid, Resend, Mailgun
- **Authentication**: Appwrite Auth
- **State Management**: Motia State
- **Scheduling**: Motia Cron Jobs
- **Validation**: Zod schemas

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python 3.8+
- Motia CLI installed
- Appwrite instance (local or cloud)
- Email service provider credentials

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/motia-email-automation-engine.git
cd motia-email-automation-engine
```

2. Install dependencies:

```bash
npm install
pip install -r requirements.txt
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up Appwrite database:

```bash
# Configure your Appwrite endpoint and project ID
# Create necessary collections for campaigns, users, and analytics
```

5. Start the development server:

```bash
npm run dev
```

### Configuration

Configure the following environment variables:

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://your-appwrite-instance.com
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Email Provider Configuration
SENDGRID_API_KEY=your-sendgrid-key
RESEND_API_KEY=your-resend-key
MAILGUN_API_KEY=your-mailgun-key

# AI Configuration (optional)
OPENAI_API_KEY=your-openai-key

# Webhook Security
WEBHOOK_SIGNING_SECRET=your-signing-secret
```

## API Endpoints

### Campaign Management

- `POST /campaigns` - Create new email campaign
- `GET /campaigns/:id` - Get campaign details
- `PUT /campaigns/:id` - Update campaign settings

### User Management

- `PUT /users/:id/preferences` - Update user email preferences
- `GET /unsubscribe` - Process unsubscribe requests

### Webhooks

- `POST /webhooks/:source` - Handle email provider webhooks

## Testing

Run the test suite:

```bash
npm test
```

Test individual components:

```bash
npm run test:campaigns
npm run test:segmentation
npm run test:delivery
```

## Monitoring & Observability

The system includes comprehensive monitoring through Motia's built-in observability tools:

- **Tracing** - Complete request tracing across all workflow steps
- **Logging** - Structured logging with correlation IDs
- **Metrics** - Real-time performance and business metrics
- **State Management** - Persistent state tracking for debugging

Access the Motia Workbench at `http://localhost:3000` to view:

- Flow visualizations
- Real-time traces
- Campaign analytics
- System health metrics

## Tutorial

An interactive tutorial is available in the Motia Workbench that walks through:

- Creating your first campaign
- Understanding the segmentation engine
- Exploring AI personalization features
- Monitoring campaign performance
- Setting up behavioral triggers

## Production Deployment

### Prerequisites for Production

- Configure email provider rate limits
- Set up proper database indexing
- Enable webhook signature verification
- Configure monitoring and alerting
- Set up backup and recovery procedures

### Performance Considerations

- The system processes emails in configurable batches (default: 50 per batch)
- Rate limiting prevents overwhelming email providers
- Cron jobs run at optimized intervals to balance performance and resource usage
- State cleanup prevents data bloat over time
