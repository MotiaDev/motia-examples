# AI Content Moderation System

A comprehensive, event-driven AI content moderation system built with Motia workflows. This system automatically analyzes text and image content for toxicity and safety violations using OpenAI's moderation APIs, routes decisions based on confidence scores, and provides human oversight through Slack integration.

## 🎯 Project Overview

This AI-powered content moderation system provides:

- **Automated Content Analysis**: Uses OpenAI's text moderation and GPT-4 Vision for comprehensive content safety analysis
- **Intelligent Routing**: Automatically approves/rejects high-confidence decisions, routes uncertain content to human reviewers  
- **Human-in-the-Loop**: Slack integration with interactive buttons for human moderators
- **Real-time Processing**: Event-driven architecture ensures fast response times
- **Comprehensive Auditing**: Full audit trail with state management and logging
- **Scalable Architecture**: Built on Motia's event-driven workflow framework

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Content       │    │   AI Analysis    │    │   Decision      │
│   Submission    │───▶│   (OpenAI)       │───▶│   Routing       │
│   API           │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Action        │    │   Slack Webhook  │    │   Slack         │
│   Executor      │◀───│   Handler        │◀───│   Notification  │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Workflow Steps

1. **Content Submission** (`content-submit-api.step.ts`) - API endpoint for receiving content
2. **AI Analysis** (`content-analyzer.step.ts`) - OpenAI-powered content analysis  
3. **Decision Routing** (`content-router.step.ts`) - Routes based on confidence scores
4. **Slack Notification** (`slack-notifier.step.ts`) - Sends review requests to Slack
5. **Webhook Handler** (`slack-webhook.step.ts`) - Processes Slack button interactions
6. **Action Executor** (`action-executor.step.ts`) - Executes final decisions and cleanup

## 🔧 Prerequisites

- **Node.js** 18+ 
- **OpenAI API Key** with access to:
  - Text moderation API (`text-moderation-latest`)
  - GPT-4 Vision API (`gpt-4o-mini`)
- **Slack Bot** with permissions:
  - `chat:write`
  - `channels:read`
  - `im:write` 
- **Slack App** configured for interactive components

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install motia openai @slack/web-api zod crypto
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Slack Configuration  
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret

# Slack Channel IDs
SLACK_CHANNEL_MODERATION=C1234567890  # #content-moderation
SLACK_CHANNEL_URGENT=C1234567891      # #content-urgent  
SLACK_CHANNEL_ESCALATED=C1234567892   # #content-escalated
```

### 3. Slack App Setup

1. **Create Slack App** at https://api.slack.com/apps
2. **Enable Interactive Components**:
   - Request URL: `https://your-domain.com/webhook/slack-action`
3. **Add Bot Scopes**:
   - `chat:write`
   - `channels:read`
   - `im:write`
4. **Install to Workspace** and copy tokens to `.env`
5. **Create Channels**:
   - `#content-moderation` (general reviews)
   - `#content-urgent` (medium-high risk)
   - `#content-escalated` (high risk/escalations)

### 4. Run the Application

```bash
# Start development server with Workbench
npx motia dev --port 3000

# Or start in production mode
npx motia start
```

The Workbench will be available at `http://localhost:3000` for visual workflow monitoring.

## 📡 API Endpoints

### Content Submission

Submit content for moderation analysis:

```bash
POST /content/submit
Content-Type: application/json

{
  "text": "This is some text content to analyze",
  "imageUrl": "https://example.com/image.jpg", 
  "userId": "user123",
  "platform": "twitter"
}
```

**Response:**
```json
{
  "message": "Content submitted successfully for moderation",
  "submissionId": "sub_1672531200000_abc123def"
}
```

**Validation Rules:**
- At least `text` or `imageUrl` must be provided
- `userId` and `platform` are required
- `imageUrl` must be a valid URL if provided

### Slack Webhook

Handles Slack interactive button responses (automatically configured):

```
POST /webhook/slack-action
Content-Type: application/x-www-form-urlencoded

payload={...slack-payload...}
```

## 🔄 Workflow Explanation

### Step 1: Content Submission
- **Endpoint**: `POST /content/submit`
- **Validation**: Ensures text or image provided, validates required fields
- **Action**: Generates unique submission ID, emits `content.submitted`
- **State**: Stores original submission data

### Step 2: AI Analysis  
- **Trigger**: `content.submitted` event
- **Text Analysis**: OpenAI Moderation API for toxicity detection
- **Image Analysis**: GPT-4 Vision for safety assessment 
- **Output**: Risk scores (0-100), confidence levels, violation categories
- **Action**: Emits `content.analyzed` with complete analysis

### Step 3: Decision Routing
- **Trigger**: `content.analyzed` event  
- **Logic**: 
  - High confidence (>85%) + approve/reject → Auto-decision
  - Low confidence (<85%) or review → Human review
- **Action**: Emits `content.approved`, `content.rejected`, or `content.needsReview`

### Step 4: Slack Notification
- **Trigger**: `content.needsReview` event
- **Channel Selection**:
  - Risk ≥80: `#content-escalated` 
  - Risk 60-79 or confidence <30%: `#content-urgent`
  - Default: `#content-moderation`
- **Message**: Rich blocks with content preview, analysis, interactive buttons
- **Buttons**: Approve ✅, Reject ❌, Escalate ⚠️

### Step 5: Webhook Handler
- **Trigger**: Slack button interactions
- **Security**: Validates Slack signatures, prevents replay attacks
- **Processing**: Maps button actions to decisions, updates Slack message
- **Action**: Emits `content.reviewed` with human decision

### Step 6: Action Executor  
- **Trigger**: `content.reviewed` event
- **Actions**:
  - **Approved**: Make content visible, notify user
  - **Rejected**: Remove content, notify user with reason
  - **Escalated**: Create support ticket, quarantine content
- **Cleanup**: Remove temporary state, keep audit records
- **Confirmation**: Send results back to Slack

## 🧪 Testing

### Manual Testing

1. **Test Content Submission**:
```bash
curl -X POST http://localhost:3000/content/submit \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test message with some potentially harmful content",
    "userId": "test-user-123", 
    "platform": "twitter"
  }'
```

2. **Test Event Emission**:
```bash
npx motia emit --topic content.submitted --message '{
  "submissionId": "test-123",
  "text": "Test content",
  "userId": "user123",
  "platform": "twitter",
  "timestamp": "2023-12-01T12:00:00Z"
}'
```

3. **Monitor in Workbench**: Visit `http://localhost:3000` to see real-time flow execution

### Test Scenarios

- **Safe Content**: Low risk scores → Auto-approval
- **Toxic Text**: High toxicity → Auto-rejection  
- **Borderline Content**: Medium scores → Human review
- **Image Safety**: Unsafe images → Escalation
- **Low Confidence**: Uncertain analysis → Human review

## 🔧 Troubleshooting

### Common Issues

#### 1. OpenAI API Errors
**Problem**: `Text analysis failed: API key invalid`
**Solution**: 
- Verify `OPENAI_API_KEY` in `.env`
- Check API key has moderation and vision access
- Ensure billing is set up on OpenAI account

#### 2. Slack Integration Issues  
**Problem**: `Slack notification failed: channel_not_found`
**Solutions**:
- Verify channel IDs in `.env` are correct (not channel names)
- Ensure bot is added to all channels
- Check bot has `chat:write` permission

#### 3. Webhook Signature Validation
**Problem**: `Invalid Slack signature` 
**Solutions**:
- Verify `SLACK_SIGNING_SECRET` matches Slack app config
- Ensure webhook URL is publicly accessible
- Check system time is synchronized

#### 4. State Management Issues
**Problem**: Content analysis data not found in state
**Solutions**:
- Check `traceId` consistency across steps
- Verify state adapter configuration  
- Monitor state cleanup timing

#### 5. High Error Rates
**Problem**: Many content submissions failing analysis
**Solutions**:
- Check OpenAI API rate limits and quotas
- Monitor API response times and timeouts
- Implement exponential backoff for retries

### Debug Mode

Enable detailed logging:

```bash
npx motia dev --debug --port 3000
```

### State Inspection

Check current state data:

```bash
npx motia state list
```

### Log Analysis

Key log messages to monitor:
- `Content submission received` - API requests
- `Starting content analysis` - Analysis initiation
- `Content analysis completed` - Analysis results
- `Routing content decision` - Decision logic
- `Slack notification sent` - Notification success
- `Content moderation workflow completed` - End-to-end completion

## 🔐 Security Considerations

- **API Keys**: Never commit secrets to version control
- **Slack Signatures**: Always validate webhook signatures  
- **Input Validation**: Sanitize all user inputs
- **Rate Limiting**: Implement rate limits on public endpoints
- **Audit Trail**: Maintain logs for compliance and debugging
- **HTTPS**: Use HTTPS in production for webhook endpoints

## 📈 Monitoring & Analytics

### Key Metrics to Track

- **Processing Volume**: Submissions per hour/day
- **Analysis Accuracy**: Human override rates
- **Response Times**: End-to-end workflow duration  
- **Decision Distribution**: Auto vs manual decision ratios
- **Error Rates**: Failed analysis/notification rates
- **Channel Distribution**: Which risk channels used most

### Recommended Dashboards

- Real-time submission feed
- Analysis confidence distribution
- Human moderator response times
- Error rate trends by component

## 🔮 Future Enhancements

- **Multi-language Support**: Expand beyond English content
- **Custom Models**: Train domain-specific moderation models
- **Batch Processing**: Handle multiple submissions efficiently
- **Advanced Analytics**: ML-powered insights and trends
- **Mobile Notifications**: Push alerts for urgent reviews
- **Escalation Workflows**: Complex approval chains
- **Content Appeals**: User appeal and review process

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For issues and questions:
- Create GitHub issue for bugs/feature requests
- Check troubleshooting section above
- Review Motia documentation at https://docs.motia.io
- Monitor Workbench at `http://localhost:3000` for real-time debugging