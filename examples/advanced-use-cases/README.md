# Advanced Use Cases

Production-ready, complex implementations showcasing the full power of Motia's event-driven architecture. These examples combine multiple concepts and demonstrate real-world applications.

## 🎯 What You'll Learn

- Complex multi-step workflows
- Computer vision and AI design
- Web scraping at scale
- Audio/video processing pipelines
- Intelligent form routing
- Multi-modal AI applications
- Production architecture patterns

## 📚 Examples

### [ai-room-renovate](./ai-room-renovate)
**Level**: Expert  
**Concepts**: Computer Vision, AI Design, Full-Stack Application

Complete room renovation application using computer vision and AI-powered design suggestions.

**Key Features**:
- Image upload and analysis
- Room detection with computer vision
- AI-generated design suggestions
- Style transfer and visualization
- Full-stack React frontend
- Real-time preview
- 3D rendering (optional)

**Tech Stack**:
- Frontend: React, TailwindCSS
- Backend: Motia, TypeScript
- AI: OpenAI Vision API, Stable Diffusion
- Image Processing: Sharp, Canvas

**Use Cases**:
- Interior design platforms
- Real estate staging
- Home improvement apps

**⭐ Highlights**: 
- Production-ready full-stack app
- Complex AI pipeline
- Beautiful UI/UX

---

### [competitor-price-scrapper](./competitor-price-scrapper)
**Level**: Expert  
**Concepts**: Web Scraping, Price Monitoring, Anti-Bot Evasion

Enterprise-grade price monitoring system with intelligent scraping and anti-detection.

**Key Features**:
- Multi-site scraping
- Proxy rotation
- Anti-bot evasion
- Price history tracking
- Competitor analysis
- Alert system
- Rate limiting
- Retry logic with exponential backoff

**Tech Stack**:
- Scraping: Playwright, Cheerio
- Storage: PostgreSQL, Redis
- Scheduling: Cron Steps
- Notifications: Email, Webhook

**Use Cases**:
- E-commerce price monitoring
- Market research
- Dynamic pricing strategies
- Competitive intelligence

**⭐ Highlights**: 
- Production-grade scraping
- Robust error handling
- Scalable architecture

---

### [ecommerce-shopify-whatsapp](./ecommerce-shopify-whatsapp)
**Level**: Expert  
**Concepts**: Shopify Integration, WhatsApp Cloud API, Conversational AI, E-commerce Automation

AI-powered WhatsApp customer support automation for Shopify stores (order tracking, product recommendations, cart recovery, and support escalations).

**Key Features**:
- WhatsApp webhook receiver + message sender (Cloud API)
- Intent classification and response generation (Gemini)
- Shopify Admin API integration (products, orders, draft orders)
- Refund requests and human escalation workflow
- Dashboard + analytics endpoints

**Tech Stack**:
- Backend: Motia, TypeScript
- Integrations: Shopify Admin API, WhatsApp Cloud API
- AI: Google Gemini

**Use Cases**:
- Shopify merchants
- Conversational commerce support
- Cart recovery automation
- Support triage and escalation

**⭐ Highlights**: 
- End-to-end webhook integration
- Real-world e-commerce automation
- Production-ready integration patterns

---

### [meeting-transcription](./meeting-transcription)
**Level**: Expert  
**Concepts**: Audio Processing, Speech-to-Text, Meeting Intelligence

Complete meeting transcription and analysis pipeline with AI-powered insights.

**Key Features**:
- Audio upload and processing
- Speech-to-text with timestamps
- Speaker diarization
- Topic extraction
- Action item detection
- Meeting summary generation
- Searchable transcripts
- Export to multiple formats

**Tech Stack**:
- Audio: FFmpeg, Whisper
- AI: OpenAI, Anthropic
- Storage: S3, Database
- Processing: Queue-based pipeline

**Use Cases**:
- Corporate meetings
- Interviews
- Podcast production
- Legal depositions

**⭐ Highlights**: 
- Multi-stage pipeline
- Speaker identification
- AI-powered insights

---

### [public-form-auto-triage](./public-form-auto-triage)
**Level**: Advanced  
**Concepts**: Intelligent Routing, Form Processing, AI Classification

Automatically triage and route form submissions using AI classification.

**Key Features**:
- Dynamic form builder
- AI-powered categorization
- Priority scoring
- Intelligent routing
- Assignee recommendation
- Custom workflows
- Response templates
- Analytics dashboard

**Tech Stack**:
- Forms: React Hook Form
- AI: OpenAI, Anthropic
- Routing: Event-driven workflow
- UI: React, TailwindCSS

**Use Cases**:
- Customer support
- Lead qualification
- Bug reporting
- Content submission
- Application processing

**⭐ Highlights**: 
- Intelligent automation
- Reduces manual triage
- Customizable workflows

---

### [vision-example](./vision-example)
**Level**: Advanced  
**Concepts**: Computer Vision, Multi-Modal AI, Image Analysis

Comprehensive computer vision capabilities with object detection, OCR, and scene understanding.

**Key Features**:
- Object detection
- Image classification
- OCR (text extraction)
- Face detection
- Scene understanding
- Image captioning
- Visual Q&A
- Batch processing

**Tech Stack**:
- Vision: OpenAI Vision API, Google Cloud Vision
- Processing: Sharp, Canvas
- Storage: S3, Database

**Use Cases**:
- Document processing
- Content moderation
- Asset management
- Accessibility tools
- Security systems

---

### [wake-surf-club](./wake-surf-club)
**Level**: Expert  
**Concepts**: Booking System, SMS Integration, Calendar Management, Full-Stack App

Complete wake surf club booking and session management system with event-driven workflows.

**Key Features**:
- Session management with capacity limits
- Automated booking with waitlist handling
- SMS notifications via Twilio (invites, confirmations, reminders)
- Calendar integration (ICS file generation)
- Admin panel plugin for Workbench
- React frontend for viewing and booking
- Cron jobs for automated workflows

**Tech Stack**:
- Backend: Motia, TypeScript, Redis, BullMQ
- Frontend: React, TailwindCSS
- SMS: Twilio
- Calendar: ICS generation

**Use Cases**:
- Club booking systems
- Event management platforms
- Session-based services
- Membership management

---

## 🚀 Getting Started

### Prerequisites
- Strong understanding of Motia concepts
- Experience with event-driven architecture
- Familiarity with the technologies used
- Production mindset (error handling, monitoring, etc.)

### Before You Start

1. **Review Fundamentals**: These are complex examples. Make sure you're comfortable with:
   - API Steps and Event Steps
   - State management
   - Error handling
   - Queues and background processing

2. **Check Requirements**: Each example has specific requirements:
   - API keys (can be expensive for heavy usage)
   - External services (S3, databases)
   - System resources (video/audio processing)

3. **Understand Costs**: 
   - AI APIs can be expensive at scale
   - Scraping may require proxy services
   - Audio/video processing is resource-intensive

### Quick Start

```bash
# 1. Choose an example
cd ai-room-renovate  # or another example

# 2. Read the README thoroughly
cat README.md

# 3. Install dependencies
npm install

# 4. Configure all required services
cp env.example .env
# Fill in ALL required credentials

# 5. Test with sample data first
# Don't start with production scale

# 6. Start development server
npm run dev

# 7. Monitor in Workbench
# http://localhost:3000
```

## 📖 Learning Path

### Prerequisites
Complete these first:
1. **[Getting Started](../getting-started/)** - Core concepts
2. **[Foundational](../foundational/)** - Common patterns
3. **[AI Agents](../ai-agents/)** or **[RAG](../rag-and-search/)** - Depending on interest

### Recommended Order

#### For Computer Vision Focus
1. **vision-example** - Vision basics
2. **ai-room-renovate** - Complex vision + AI

#### For Data Processing Focus
1. **public-form-auto-triage** - Form processing
2. **meeting-transcription** - Audio pipeline
3. **competitor-price-scrapper** - Web scraping

## 💡 Best Practices

### Production Readiness

#### Error Handling
- **Graceful Degradation**: System continues working if one component fails
- **Retry Logic**: Exponential backoff for transient failures
- **Circuit Breakers**: Prevent cascading failures
- **Error Logging**: Comprehensive error tracking

#### Monitoring
- **Health Checks**: Regular health check endpoints
- **Metrics**: Track performance and usage
- **Alerting**: Alert on critical failures
- **Tracing**: Distributed tracing for debugging

#### Scalability
- **Queue-Based**: Use queues for async processing
- **Rate Limiting**: Protect APIs and external services
- **Caching**: Cache expensive operations
- **Horizontal Scaling**: Design for multiple instances

#### Security
- **Input Validation**: Validate all user input
- **Authentication**: Secure all endpoints
- **Rate Limiting**: Prevent abuse
- **Data Privacy**: Handle PII appropriately

### Cost Optimization

#### AI APIs
- **Cache Responses**: Don't re-process same input
- **Batch Requests**: Combine requests when possible
- **Use Cheaper Models**: Use GPT-3.5 instead of GPT-4 when appropriate
- **Prompt Optimization**: Shorter prompts = lower cost

#### Processing
- **Optimize Media**: Compress before processing
- **Lazy Loading**: Process on-demand
- **Cleanup**: Delete temporary files
- **Resource Limits**: Set memory and timeout limits

#### External Services
- **Connection Pooling**: Reuse connections
- **Batch Operations**: Combine database queries
- **CDN**: Use CDN for static assets
- **Smart Caching**: Cache aggressively

## 🔧 Architecture Patterns

### Multi-Stage Pipeline

```
API Request → Queue → Processing → Analysis → Results
```

**Example**: Meeting Transcription
1. Upload audio (API Step)
2. Queue processing (Event emit)
3. Transcribe audio (Event Step)
4. Extract insights (Event Step)
5. Generate summary (Event Step)
6. Store results (Event Step)

### Parallel Processing

```
Input → Split → [Process A, Process B, Process C] → Merge → Output
```

**Example**: Room Renovation
1. Upload image
2. Split tasks: [Detect room, Extract colors, Identify style]
3. Process in parallel
4. Merge results
5. Generate designs

### Event-Driven Workflow

```
Trigger → Classify → Route → Process → Notify
```

**Example**: Form Triage
1. Form submitted (API Step)
2. AI classifies submission (Event Step)
3. Route to appropriate team (Event Step)
4. Assign to team member (Event Step)
5. Send notifications (Event Step)

## 📊 Production Metrics

### Performance
- **Response Time**: P50, P95, P99 latencies
- **Throughput**: Requests/jobs per second
- **Queue Depth**: Number of pending jobs
- **Processing Time**: Time per stage

### Reliability
- **Uptime**: Service availability %
- **Error Rate**: % of failed requests
- **Retry Rate**: % of retried operations
- **Success Rate**: % of successful completions

### Cost
- **API Costs**: Cost per request/job
- **Infrastructure**: Server costs
- **Storage**: Data storage costs
- **Bandwidth**: Data transfer costs

## 🔗 Resources

### Documentation
- [Motia Documentation](https://motia.dev/docs)
- [Architecture Guide](../../.cursor/architecture/architecture.mdc)
- [Error Handling Guide](../../.cursor/architecture/error-handling.mdc)

### External Services
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic Claude](https://docs.anthropic.com/)
- [Playwright Docs](https://playwright.dev/)
- [FFmpeg Guide](https://ffmpeg.org/documentation.html)

### Best Practices
- [Twelve-Factor App](https://12factor.net/)
- [API Design Best Practices](https://swagger.io/resources/articles/best-practices-in-api-design/)
- [Microservices Patterns](https://microservices.io/patterns/index.html)

## 💡 Extension Ideas

### For All Examples
- Add monitoring dashboards
- Implement A/B testing
- Add user analytics
- Create admin panels
- Add team collaboration features
- Implement audit logs
- Add webhooks for integrations
- Create mobile apps

### Specific Extensions

**ai-room-renovate**:
- 3D room visualization
- AR preview (mobile)
- Furniture recommendations
- Cost estimation
- Contractor matching

**competitor-price-scrapper**:
- Machine learning for price prediction
- Automated repricing
- Market trend analysis
- API for pricing data
- Alerting dashboard

**meeting-transcription**:
- Live transcription
- Multi-language support
- Custom vocabulary
- Integration with calendar
- Automated follow-ups

**public-form-auto-triage**:
- Custom fields builder
- Conditional logic
- Approval workflows
- SLA tracking
- Reports and analytics

**vision-example**:
- Video analysis
- Live camera feeds
- Batch processing UI
- Custom model training
- API marketplace

---

## ⚠️ Important Notes

1. **Not Beginner-Friendly**: Start with simpler examples first
2. **Resource Intensive**: These examples consume significant resources
3. **Cost Awareness**: Monitor API and infrastructure costs
4. **Production Considerations**: Additional work needed for production deployment
5. **Security**: Implement proper authentication and authorization
6. **Compliance**: Consider data privacy regulations (GDPR, CCPA, etc.)

---

Built with [Motia](https://motia.dev) - Event-driven backend framework
