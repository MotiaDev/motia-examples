# Integrations

Connect your Motia applications with popular platforms and services. Learn how to integrate with GitHub, Gmail, Stripe, social media platforms, and more.

## 📂 Categories

### [GitHub](./github/)
GitHub repository automation, CI/CD workflows, and documentation sync.

### [Communication](./communication/)
Email automation and project management integrations.

### [Payment](./payment/)
Payment processing with Stripe.

### [Social Media](./social-media/)
Social engagement and content distribution.

### [Google Workspace](./google-workspace/)
Google APIs and workspace integration.

---

## 🎯 What You'll Learn

- Webhook handling and event processing
- OAuth authentication flows
- API integration patterns
- Webhook signature verification
- Rate limiting and retry strategies
- Error handling for external services

## 📚 Examples by Category

### GitHub Integrations

#### [github-commit-jenkins](./github/github-commit-jenkins)
**Level**: Intermediate  
**Concepts**: CI/CD, Webhooks, Jenkins Integration

Trigger Jenkins builds on GitHub commits using webhooks.

**Key Features**:
- GitHub webhook handling
- Jenkins API integration
- Build triggering
- Status updates

---

#### [github-integration-workflow](./github/github-integration-workflow)
**Level**: Intermediate  
**Concepts**: Repository Automation, GitHub API

Automate GitHub repository workflows and management tasks.

**Key Features**:
- Issue automation
- PR management
- Label automation
- Workflow triggers

---

#### [github-notion-sync](./github/github-notion-sync)
**Level**: Advanced  
**Concepts**: Documentation Sync, Bidirectional Integration

Sync GitHub issues and PRs with Notion databases.

**Key Features**:
- Bidirectional sync
- Notion database management
- GitHub API integration
- Real-time updates

---

### Communication Integrations

#### [gmail-workflow](./communication/gmail-workflow)
**Level**: Intermediate  
**Concepts**: Email Automation, Gmail API, OAuth

Automate Gmail workflows for email processing and responses.

**Key Features**:
- Gmail API integration
- OAuth authentication
- Email parsing
- Automated responses
- Label management

---

#### [trello-flow](./communication/trello-flow)
**Level**: Intermediate  
**Concepts**: Project Management, Trello API

Integrate Trello boards with automated workflows.

**Key Features**:
- Trello API integration
- Card automation
- Board management
- Webhook handling

---

### Payment Integrations

#### [stripe-payment-demo](./payment/stripe-payment-demo)
**Level**: Advanced  
**Concepts**: Payment Processing, Webhook Security, PCI Compliance

Complete Stripe payment integration with webhook handling.

**Key Features**:
- Payment intent creation
- Webhook verification
- Payment status tracking
- Refund processing
- Event handling

**⭐ Highlights**: 
- Production-ready payment flow
- Secure webhook verification
- Comprehensive error handling

---

### Social Media Integrations

#### [fast-likes-smart-feeds](./social-media/fast-likes-smart-feeds)
**Level**: Advanced  
**Concepts**: Social Engagement, Real-time Processing, Multi-Database

High-performance social media engagement system with real-time updates.

**Key Features**:
- Supabase integration
- Firebase notifications
- Real-time feed updates
- Like processing at scale
- Multi-database sync

**Stack**: Supabase, Firebase, Python, TypeScript

---

#### [git-stars-video](./social-media/git-stars-video)
**Level**: Advanced  
**Concepts**: Video Generation, GitHub Stats, Remotion

Generate videos from GitHub star history using Remotion.

**Key Features**:
- GitHub API integration
- Video rendering with Remotion
- Data visualization
- Automated video generation

---

### Google Workspace Integrations

#### [google-adk-motia](./google-workspace/google-adk-motia)
**Level**: Intermediate  
**Concepts**: Google APIs, Workspace Automation

Integrate with Google Workspace services (Drive, Sheets, Calendar).

**Key Features**:
- Google API integration
- OAuth flow
- Service account setup
- Drive file management

---

## 🚀 Getting Started

### Prerequisites
- API keys/credentials for the services you want to integrate
- Understanding of OAuth flows (for some integrations)
- Webhook endpoint setup (for event-driven integrations)

### Quick Start
1. Choose an integration based on your needs
2. Follow the specific README in each example
3. Set up API credentials in `.env`
4. Configure webhook endpoints (if needed)
5. Test with the Workbench

### Common Setup Steps

1. **Get API Credentials**
   - Create developer accounts
   - Generate API keys or OAuth apps
   - Configure redirect URLs

2. **Set Environment Variables**
   ```bash
   cp env.example .env
   # Add your API keys
   ```

3. **Configure Webhooks** (if needed)
   - Expose your local server (use ngrok for development)
   - Register webhook URLs in the service
   - Verify webhook signatures

4. **Test Integration**
   - Start Motia dev server
   - Trigger events manually
   - Monitor in Workbench

## 📖 Learning Path

### Level 1: Simple API Integrations
1. **google-adk-motia** - Basic API calls
2. **gmail-workflow** - OAuth flow
3. **trello-flow** - REST API integration

### Level 2: Webhook Processing
1. **github-integration-workflow** - Webhook handling
2. **github-commit-jenkins** - Event processing
3. **stripe-payment-demo** - Webhook verification

### Level 3: Complex Integrations
1. **github-notion-sync** - Bidirectional sync
2. **fast-likes-smart-feeds** - Multi-database, real-time
3. **git-stars-video** - Data processing + rendering

## 💡 Best Practices

### API Integration
- **Rate Limiting**: Implement exponential backoff
- **Error Handling**: Handle API errors gracefully
- **Retries**: Use retry logic for transient failures
- **Caching**: Cache responses when appropriate

### Webhook Security
- **Verify Signatures**: Always verify webhook signatures
- **Idempotency**: Handle duplicate webhooks
- **Timeout**: Set appropriate timeouts
- **Logging**: Log all webhook events

### Authentication
- **Secure Storage**: Never commit API keys
- **Token Refresh**: Implement OAuth token refresh
- **Scope Minimization**: Request minimum required scopes
- **Key Rotation**: Support key rotation

### Development Tips
- **Use ngrok**: Expose local webhooks for testing
- **Mock Services**: Use mocks for development
- **Test Thoroughly**: Test error cases and edge cases
- **Monitor Usage**: Track API usage and quotas

## 🔧 Service Comparison

| Service | Type | Auth | Webhooks | Docs Quality |
|---------|------|------|----------|--------------|
| **GitHub** | REST | OAuth/Token | ✅ | Excellent |
| **Gmail** | REST | OAuth | ❌ (Push available) | Good |
| **Stripe** | REST | API Key | ✅ | Excellent |
| **Trello** | REST | OAuth/Token | ✅ | Good |
| **Google APIs** | REST | OAuth/Service Account | Varies | Good |

## 🔗 Next Steps

- **[AI Agents](../ai-agents/)** - Add AI to your integrations
- **[Monitoring and Alerts](../monitoring-and-alerts/)** - Monitor your integrations
- **[Advanced Use Cases](../advanced-use-cases/)** - Complex integration patterns

## 📚 Resources

- [GitHub Webhooks Documentation](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Gmail API Guide](https://developers.google.com/gmail/api)
- [OAuth 2.0 Guide](https://oauth.net/2/)
- [Event Steps Guide](../../.cursor/rules/motia/event-steps.mdc)
