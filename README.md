# Motia Examples 🚀

Welcome to the official examples repository for [Motia](https://motia.dev/) - a modern backend framework for building event-driven applications with built-in observability and state management.

**✨ Newly Reorganized:** 60+ examples now organized into 8 logical categories from beginner to expert level. **[Browse the organized catalog →](examples/)**

## 📖 Documentation & Guided Tours

For detailed tutorials and guided walkthroughs of these examples, visit our comprehensive documentation:

- **[Examples Documentation](https://www.motia.dev/docs/examples)** - Step-by-step guides with code explanations
- **[Getting Started](https://www.motia.dev/docs/getting-started/quick-start)** - Quick start guide for Motia
- **[Core Concepts](https://www.motia.dev/docs/concepts/overview)** - Understanding Steps, Events, and Flows

## 🗂 Organized Examples Collection

We've organized 60+ examples into 8 logical categories based on complexity and use case.

**[Browse all examples →](examples/)**

### Quick Navigation

| Category | Level | Examples | Description |
|----------|-------|----------|-------------|
| [🚀 Getting Started](examples/getting-started/) | Beginner | 5 | Core Motia concepts - API steps, events, middleware, queues, real-time |
| [🔧 Foundational](examples/foundational/) | Intermediate | 9 | Common patterns - automation, infrastructure, APIs |
| [🤖 AI Agents](examples/ai-agents/) | Int-Expert | 20 | Chat agents, specialized agents, multi-agent systems |
| [📚 RAG & Search](examples/rag-and-search/) | Advanced | 9 | Vector databases, embeddings, knowledge bases |
| [🔌 Integrations](examples/integrations/) | Intermediate | 9 | GitHub, Stripe, Gmail, social media platforms |
| [📊 Monitoring](examples/monitoring-and-alerts/) | Intermediate | 3 | Cron-based monitoring and intelligent alerts |
| [📧 Marketing](examples/content-and-marketing/) | Int-Advanced | 3 | Email campaigns, content automation |
| [🚀 Advanced](examples/advanced-use-cases/) | Expert | 7 | Production-ready systems, computer vision, e-commerce automation |

**[View full catalog with descriptions →](examples/)**

---

## 🌟 Production-Ready Cloud Examples

### 🏆 ChessArena AI - LLM Chess Leaderboard

An advanced **AI chess battleground** where language models compete in real-time, evaluated by Stockfish for move-by-move quality analysis.

![ChessArena AI Demo](https://github.com/MotiaDev/chessarena-ai/raw/main/public/images/chessarena.gif)


**Key Features:**
- **Multi-LLM Competition:** Multiple AI models compete simultaneously with live leaderboards  
- **Move-by-Move Evaluation:** Stockfish engine analyzes every move for quality scoring
- **Real-Time Streaming:** Live game updates using Motia Streams architecture
- **Advanced Analytics:** Comprehensive statistics tracking blunders, accuracy, and insights
- **Production Scalability:** Built for high-throughput concurrent games

**Evaluation System:**
- Every move scored against Stockfish recommendations
- Centipawn loss tracking for precise skill measurement  
- Blunder detection (>100 centipawn swings)
- Quality-based leaderboards over simple win/loss ratios

**Technologies:** TypeScript, Python, Stockfish Engine, OpenAI, Motia Streams

**🎯 Live Platform:** [ChessArena.ai](https://chessarena.ai)

[View Source Code →](https://github.com/MotiaDev/chessarena-ai)

### ⭐ GitHub Stars Counter

A **real-time GitHub stars counter** showcasing production-ready deployment capabilities - this exact implementation powers the live star count on the Motia website!

![Live Stars Counter](https://github.com/MotiaDev/github-stars-counter/raw/main/public/motia-star.gif)

**Key Features:**
- **Real-Time Updates:** Instant star count updates across all connected clients using Motia Streams
- **Production Security:** GitHub webhook signature verification and request validation
- **One-Click Deployment:** Deploy instantly to Motia Cloud with built-in monitoring
- **Type-Safe Development:** Full TypeScript support with auto-generated types
- **Minimal Code:** Built with just 2 simple steps - webhook handler and real-time stream

**Technologies:** TypeScript, GitHub Webhooks, Motia Streams

**🚀 Live Demo:** [See it running on Motia.dev](https://motia.dev)

[View Source Code →](https://github.com/MotiaDev/github-stars-counter)

---

*Both examples demonstrate Motia's power for building production-ready, real-time applications that scale in the cloud with minimal infrastructure complexity.*

## 🎯 Featured Examples

### AI App Generator - Multi-Agent System

Generate complete full-stack applications using 7 specialized AI agents working together.

**Key Features:**
- Architect, Engineer, Test Designer, and Code Refiner agents
- Produces production-ready code with tests
- Download complete applications
- Real-time progress streaming

**[View Example →](examples/ai-agents/multi-agent-systems/ai-app-generator)**

---

### Stripe Payment Demo - Production Integration

Complete payment processing implementation with webhook security.

**Key Features:**
- Payment intent creation and management
- Webhook signature verification
- Comprehensive error handling
- Production-ready flow

**[View Example →](examples/integrations/payment/stripe-payment-demo)**

---

### Email Marketing Automation - Marketing Platform

Full-featured email marketing platform with segmentation and analytics.

**Key Features:**
- Campaign management with drip sequences
- Advanced audience segmentation
- A/B testing capabilities
- Analytics and reporting

**[View Example →](examples/content-and-marketing/email-marketing-automation)**

---

## 📚 Browse by Category

### 🚀 [Getting Started](examples/getting-started/) - Begin Here
Perfect for newcomers to Motia. Learn core concepts:
- [Middleware Authentication](examples/getting-started/middleware-auth-handler-example/) - Auth patterns
- [Queue Management](examples/getting-started/queue-example/) - Background jobs
- [Real-time Todo App](examples/getting-started/realtime-todo-app/) - SSE streaming
- [Ollama Chat](examples/getting-started/ollama-chat/) - Local AI integration

---

### 🤖 [AI Agents](examples/ai-agents/) - Build Intelligent Apps

**[Chat Agents](examples/ai-agents/chat-agents/)** - Conversational AI
- Streaming chatbots with real-time responses
- Memory and conversation history
- Multi-modal capabilities

**[Specialized Agents](examples/ai-agents/specialized-agents/)** - Domain-specific AI
- Sales intelligence and lead scoring
- ReAct pattern with tool integration
- Code review and analysis
- Research automation
- Content moderation
- Financial analysis

**[Multi-Agent Systems](examples/ai-agents/multi-agent-systems/)** - Complex orchestration
- [AI App Generator](examples/ai-agents/multi-agent-systems/ai-app-generator/) - 7 agents building apps
- [SmartTravel](examples/ai-agents/multi-agent-systems/smarttravel-multi-agent/) - Travel planning
- [AI Hedge Fund](examples/ai-agents/multi-agent-systems/ai-hedgefund/) - Financial analysis

---

### 📚 [RAG & Search](examples/rag-and-search/) - Knowledge Bases

**[RAG Fundamentals](examples/rag-and-search/rag-fundamentals/)**
- Local RAG with ChromaDB and Ollama
- Cloud RAG with Weaviate
- Documentation search

**[RAG Applications](examples/rag-and-search/rag-applications/)**
- Property search with semantic understanding
- Documentation Q&A systems
- Research assistants

---

### 🔌 [Integrations](examples/integrations/) - Connect Services

- **[GitHub](examples/integrations/github/)** - CI/CD, webhooks, automation
- **[Payment](examples/integrations/payment/)** - Stripe integration
- **[Communication](examples/integrations/communication/)** - Gmail, Trello
- **[Social Media](examples/integrations/social-media/)** - Engagement automation

---

### 🔧 [Foundational](examples/foundational/) - Real-World Patterns

- **[API Patterns](examples/foundational/api-patterns/)** - Complete todo app demo, file processing, analysis
- **[Automation](examples/foundational/automation/)** - Content workflows
- **[Infrastructure](examples/foundational/infrastructure/)** - Docker, monitoring

---

### 🚀 [Advanced Use Cases](examples/advanced-use-cases/) - Production Systems

Complex, production-ready implementations:
- [AI Room Renovate](examples/advanced-use-cases/ai-room-renovate/) - Computer vision + AI design
- [Competitor Price Scraper](examples/advanced-use-cases/competitor-price-scrapper/) - Web scraping at scale
- [Meeting Transcription](examples/advanced-use-cases/meeting-transcription/) - Audio processing pipeline
- [ShopFlow (Shopify + WhatsApp)](examples/advanced-use-cases/ecommerce-shopify-whatsapp/) - Conversational commerce support automation

---

## 📖 Additional Example Highlights

Below are additional examples from our collection. For the complete organized catalog with descriptions and learning paths, visit **[examples/](examples/)**.

> **💡 Tip:** All examples below are now organized into categories. Use the [full catalog](examples/) to browse by difficulty level and use case.

### ReACT Research Assistant

An intelligent research assistant implementing the **ReAct (Reason + Act) pattern** to answer complex, multi-hop questions with adaptive tool usage.

![ReACT Agent](examples/ai-agents/specialized-agents/ai-ReACT-agent/img/workbench.png)

**Key Features:**
- ReAct Pattern: Reasons about information needs, acts with tools, observes results, iterates
- Multi-Tool Integration: Web search (Tavily), financial data (Alpha Vantage), custom APIs
- Adaptive Loop: LLM orchestrates tool selection and reasoning iterations
- Production Ready: Built-in error handling, retries, and comprehensive logging

**Technologies:** TypeScript, Anthropic Claude / Google Gemini, Tavily, Alpha Vantage

[View Example →](examples/ai-agents/specialized-agents/ai-ReACT-agent)


### ProspectAI - Sales Intelligence Platform

AI-powered sales prospect research and scoring platform that automates lead qualification at scale.

![ProspectAI](examples/ai-agents/specialized-agents/ai-prospect-agent/docs/img/workbench.png)

**Key Features:**
- CSV Upload: Batch process prospect lists automatically
- AI Fit Scoring: Gemini 3 Pro or Claude Opus 4.5 generates 0-100 fit scores
- Email Drafts: AI-generated personalized outreach emails
- Signal Collection: 15+ data points via NewsAPI
- Slack Alerts: Real-time notifications for high-scoring prospects
- AI Assistant: Natural language queries like "Who should I call this week?"
- Multi-Flow Architecture: Upload, Research, and Assistant flows
- CopilotKit Integration: Conversational AI interface

**Technologies:** TypeScript, Gemini 3 Pro / Claude Opus 4.5, NewsAPI, Slack, React, CopilotKit

[View Example →](examples/ai-agents/specialized-agents/ai-prospect-agent)

### AI Planning Agent

A planning agent that uses the **Planning Architecture** to decompose tasks into subtasks and execute them with AI-powered planning, intelligent failure handling, and human-in-the-loop approvals.

![AI Planning Agent](examples/ai-agents/specialized-agents/ai-planning-agent/docs/img/workbench.png)

**Key Features:**
- Planning Architecture: Decomposes tasks into subtasks and executes them with AI-powered planning, intelligent failure handling, and human-in-the-loop approvals
- AI-powered planning
- Intelligent failure handling
- Human-in-the-loop approvals
- Task decomposition
- Task execution
- Task monitoring

**Technologies:** TypeScript, Google Gemini

[View Example →](examples/ai-agents/specialized-agents/ai-planning-agent)

### AI Deep Research Agent

A powerful research assistant that performs comprehensive web research on any topic or question, providing in-depth analysis and reports.

![AI Deep Research Agent](examples/ai-agents/specialized-agents/ai-deep-research-agent/docs/deep-research.png)

**Key Features:**
- Deep Web Research: Searches the web, extracts content, and synthesizes findings
- Iterative Research Process: Supports multiple research depths for comprehensive exploration
- API Endpoints: REST API for initiating research and retrieving reports
- Parallel Processing: Efficiently processes search results and content extraction

**Technologies:** TypeScript, OpenAI, Firecrawl API

[View Example →](examples/ai-agents/specialized-agents/ai-deep-research-agent)

### AI Hedge Fund - Comprehensive Financial Analysis Workflow

A sophisticated multi-agent financial analysis system that combines parallel processing, real-time market data, and specialized AI agents for comprehensive investment insights.

![AI Hedge Fund Workflow](examples/ai-agents/multi-agent-systems/ai-hedgefund/public/aihedgefund-workflow.png)

**Key Features:**
- **Multi-Agent Architecture**: 4 specialized AI analysts (Fundamental, Portfolio, Risk, Technical) running in parallel
- **Real-Time Market Data**: Integration with Alpha Vantage and Yahoo Finance APIs
- **Web Research Integration**: Automated web search for latest market news and analysis
- **Production-Ready Deployment**: Complete Docker containerization with docker-compose
- **State Management**: Persistent data storage across workflow steps with trace isolation
- **Interactive UI**: Custom React components for query input and result visualization
- **Comprehensive Analysis**: Generates detailed reports covering all aspects of investment analysis

**Architecture Highlights:**
- Parallel processing for maximum efficiency
- Error handling with graceful degradation
- TypeScript with full type safety and Zod validation
- Nebius AI integration for advanced analysis capabilities
- RESTful API endpoints for external integration

**Technologies:** TypeScript, Nebius AI, Alpha Vantage API, Yahoo Finance, Serper API, Docker

**🐳 Production Deployment:** Includes complete Docker setup with environment configuration

[View Example →](examples/ai-agents/multi-agent-systems/ai-hedgefund)

### Finance Agent

A powerful event-driven financial analysis workflow built with Motia that combines web search, financial data, and AI analysis to provide comprehensive investment insights.

![Finance Agent](examples/ai-agents/specialized-agents/finance-agent/docs/finance-example.gif)

**Key Features:**
- Real-time Financial Analysis: Combines multiple data sources for comprehensive insights
- AI-Powered Insights: Leverages OpenAI GPT-4 for intelligent market analysis
- Web Search Integration: Aggregates latest market news and analysis
- Financial Data Integration: Real-time stock and company information

**Technologies:** TypeScript, Alpha Vantage API, SerperDev, OpenAI

[View Example →](examples/ai-agents/specialized-agents/finance-agent)

### GitHub Integration Agent

A comprehensive agent for automating GitHub issue and pull request management using AI-powered classification and routing.

<div style="display: flex; gap: 10px;">
  <img src="examples/integrations/github/github-integration-workflow/docs/images/github-pr-management.png" width="49%" alt="GitHub PR Integration Agent" />
  <img src="examples/integrations/github/github-integration-workflow/docs/images/github-issue-management.png" width="49%" alt="GitHub Issue Integration Agent" />
</div>

**Key Features:**
- AI-powered issue and PR classification
- Automatic label assignment based on content
- Smart reviewer suggestions based on expertise
- Automatic movement between stages in the development lifecycle

**Technologies:** TypeScript, OpenAI, GitHub API

[View Example →](examples/integrations/github/github-integration-workflow)

### Gmail Account Manager

An intelligent Gmail agent that monitors, analyzes, and automatically responds to incoming emails.

![Gmail Agent](examples/integrations/communication/gmail-workflow/docs/images/gmail-flow.png)

**Key Features:**
- Email classification and urgency detection
- Automated responses based on content analysis
- Smart email organization
- Daily summaries via Discord

**Technologies:** TypeScript, Python, Google APIs, Discord, Hugging Face

[View Example →](examples/integrations/communication/gmail-workflow)



### PDF RAG Agent using Motia, Docling and Weaviate

An LLM chat-like question-answering system with RAG (Retrieval-Augmented Generation) to provide accurate answers from PDF documents.
The system leverages Docling to parse and intelligently chunk PDF documents, Weaviate as a vector database to store vectorized chunks, and OpenAI for embeddings and text generation.

<div style="display: flex; gap: 10px;">
  <img src="examples/rag-and-search/rag-fundamentals/rag-docling-weaviate-agent/docs/images/rag-example.gif" alt="PDF RAG Docling Weaviate Agent" />
</div>

**Key Features:**
- PDF document processing and chunking
- Vector storage using Weaviate
- Docling for PDF parsing and hybrid chunking
- OpenAI integration for embeddings and text generation
- Question answering using RAG pattern

**Technologies:** TypeScript, Python, Docling, Weaviate, OpenAI

[View Example →](examples/rag-and-search/rag-fundamentals/rag-docling-weaviate-agent)

### Real-Time Uptime Monitor

A production-ready website monitoring system that continuously checks site availability, sends intelligent Discord alerts, and provides comprehensive health reporting.

![Uptime Monitor](examples/foundational/infrastructure/motia-uptime-monitor/docs/images/uptime-monitor-architecture.png)

**Key Features:**
- Configurable cron-based website checking
- Smart Discord notifications with rate limiting
- Status change detection to prevent spam
- Built-in health check endpoint
- In-memory status storage with persistence
- Comprehensive error handling and logging

**Technologies:** JavaScript, Discord Webhooks, Cron Scheduling

[View Example →](examples/foundational/infrastructure/motia-uptime-monitor)

### Sentiment Analysis Workflow

A dynamic sentiment analysis application that uses an LLM to determine workflow routing, demonstrating event-driven decision making.

![Sentiment Analysis](examples/foundational/api-patterns/sentimental-analysis/docs/images/sentimental-analyzer-workbench.gif)

**Key Features:**
- Dynamic workflow routing based on sentiment
- OpenAI-powered sentiment analysis
- Event-driven architecture with conditional flows
- Real-time processing and response handling

**Technologies:** TypeScript, OpenAI

[View Example →](examples/foundational/api-patterns/sentimental-analysis)

### AI Health & Fitness Agent

An intelligent health and fitness assistant that analyzes user activity, provides personalized recommendations, and tracks wellness goals.

<div style="display: flex; gap: 10px;">
  <img src="examples/ai-agents/specialized-agents/ai-health-fitness/docs/images/image.png" width="49%" alt="Health Fitness Agent" />
  <img src="examples/ai-agents/specialized-agents/ai-health-fitness/docs/images/whatsapp-output.png" width="49%" alt="Health Analytics" />
</div>

**Key Features:**
- Activity tracking and analysis
- Personalized fitness recommendations
- Health goal monitoring
- AI-powered insights and coaching

**Technologies:** TypeScript, Health APIs, AI Analysis

[View Example →](examples/ai-agents/specialized-agents/ai-health-fitness)

### Blog to Tweet Automation

An automated content distribution system that transforms blog posts into engaging social media content.

<div style="display: flex; gap: 10px;">
  <img src="examples/foundational/automation/blog-to-tweet/assets/architecture.gif" alt="Blog to Tweet Architecture" />
</div>

**Key Features:**
- Automatic blog content extraction
- AI-powered tweet generation
- Social media scheduling
- Content optimization for platforms

**Technologies:** JavaScript, Social Media APIs, Content Processing

[View Example →](examples/foundational/automation/blog-to-tweet)

### LinkedIn Content Agent

An intelligent content creation and management system for LinkedIn professional networking.

<div style="display: flex; gap: 10px;">
  <img src="examples/ai-agents/specialized-agents/linkedIn-content-agent/assets/output.gif" alt="LinkedIn Content Agent" />
</div>

**Key Features:**
- Professional content generation
- LinkedIn API integration
- Engagement tracking and optimization
- Automated posting schedules

**Technologies:** JavaScript, LinkedIn API, Content Generation

[View Example →](examples/ai-agents/specialized-agents/linkedIn-content-agent)

### Todo App - Complete Motia Demo

A comprehensive todo application showcasing all Motia capabilities - APIs, background jobs, real-time streaming, and scheduled tasks.

![Todo App](examples/foundational/api-patterns/todo-app/docs/img/workbench.png)

**Key Features:**
- RESTful CRUD API for todo management
- Real-time updates via Motia Streams
- Background jobs (notifications, analytics, gamification)
- Scheduled tasks (cleanup, statistics)
- Visual Workbench plugin
- Redis-backed state persistence
- Complete production-ready application

**Technologies:** TypeScript, Motia Streams, Redis, BullMQ

**⭐ Highlights**: Perfect example demonstrating ALL Motia features in one cohesive application

[View Example →](examples/foundational/api-patterns/todo-app)

### Image Resizer Service

A high-performance image processing service that handles multiple formats and optimization strategies.

**Key Features:**
- Multiple image format support
- Batch processing capabilities
- Quality optimization
- Storage integration
- API-driven resizing operations

**Technologies:** TypeScript, Image Processing Libraries, Storage APIs

[View Example →](examples/foundational/api-patterns/image-resizer)

### Spamurai PR Agent

An intelligent GitHub PR management system that automatically detects and handles spam pull requests.

**Key Features:**
- Automated spam detection
- PR quality analysis
- Repository protection
- Intelligent filtering and classification

**Technologies:** TypeScript, GitHub API, Machine Learning

[View Example →](examples/ai-agents/specialized-agents/Spamurai-pr-agent)

### Motia Docker Integration

A comprehensive example demonstrating how to containerize and deploy Motia applications with Docker.

**Key Features:**
- Docker containerization
- Multi-stage builds
- Production deployment configurations
- Container orchestration examples

**Technologies:** Docker, TypeScript, Deployment Tools

[View Example →](examples/foundational/infrastructure/motia-docker)

### Real-Time Chat Application

A comprehensive demonstration of real-time chat functionality with asynchronous message processing using the Motia Framework.

![Chat Agent](examples/ai-agents/chat-agents/chat-agent/docs/images/chat-agent.png)

**Key Features:**
- Real-time messaging with WebSocket streaming
- Concurrent message processing (validation, sentiment analysis, moderation)
- Event-driven architecture with pub/sub messaging
- Type-safe message handling with Zod validation
- Live chat state updates and message aggregation

**Technologies:** TypeScript, Motia Streams, Event System

[View Example →](examples/ai-agents/chat-agents/chat-agent)



### Motia Parallel Execution

A demonstration of parallel task execution capabilities in Motia agents.

<div style="display: flex; gap: 10px;">
  <img src="examples/foundational/infrastructure/motia-parallel-execution/docs/images/motia-parallel-exec.gif" alt="Motia Parallel Execution" />
</div>

**Key Features:**
- Concurrent task processing
- Workload distribution
- Performance optimization
- Resource management

**Technologies:** TypeScript

[View Example →](examples/foundational/infrastructure/motia-parallel-execution)

### Research Assistant

An intelligent research assistant that helps gather and analyze information.

<div style="display: flex; gap: 10px;">
  <img src="examples/rag-and-search/rag-applications/research-assistant/docs/images/workbench-image.png" alt="Research Assistant" />
</div>

**Key Features:**
- Information gathering
- Data analysis
- Research synthesis
- Citation management

**Technologies:** TypeScript, OpenAI

[View Example →](examples/rag-and-search/rag-applications/research-assistant)

### Streaming AI Chatbot

A real-time streaming chatbot implementation with AI capabilities.

<div style="display: flex; gap: 10px;">
  <img src="examples/ai-agents/chat-agents/streaming-ai-chatbot/docs/images/streaming-ai-chatbot.gif" alt="Streaming AI Chatbot" />
</div>

**Key Features:**
- Real-time message streaming
- Interactive responses
- Token-by-token output
- WebSocket integration

**Technologies:** TypeScript, OpenAI Streaming

[View Example →](examples/ai-agents/chat-agents/streaming-ai-chatbot)

### Conversation Analyzer with Vision

An advanced agent that analyzes conversations with both text and visual understanding capabilities.

<div style="display: flex; gap: 10px;">
  <img src="examples/content-and-marketing/conversation-analyzer-with-vision/docs/images/conversation-analyzer-with-vision.png" alt="Conversation Analyzer with Vision" />
</div>

**Key Features:**
- Multi-modal conversation analysis
- Visual content processing
- Sentiment analysis
- Contextual understanding

**Technologies:** TypeScript, OpenAI Vision, Natural Language Processing

[View Example →](examples/content-and-marketing/conversation-analyzer-with-vision)

### Trello Task Automation

Streamline development processes with an intelligent task progression agent for Trello boards.

![Trello Agent](examples/integrations/communication/trello-flow/docs/images/trello-manager.png)

**Key Features:**
- Automated card movement between lists
- Task validation and requirement checking
- AI-generated task summaries
- Slack integration for notifications

**Technologies:** TypeScript, Trello API, OpenAI, Slack

[View Example →](examples/integrations/communication/trello-flow)

**Technologies:** TypeScript, Python, Claude, Flux, OpenAI

[View Example →](examples/advanced-use-cases/vision-example)

## 🚀 Getting Started

### Quick Start Guide

1. **Choose Your Learning Path:**
   - New to Motia? Start with [Getting Started](examples/getting-started/)
   - Building AI apps? Go to [AI Agents](examples/ai-agents/)
   - Need integrations? Check [Integrations](examples/integrations/)
   - Want production examples? Browse [Advanced Use Cases](examples/advanced-use-cases/)

2. **Run Any Example:**
   ```bash
   # Clone the repository
   git clone https://github.com/MotiaDev/motia-examples.git
   cd motia-examples
   
   # Navigate to an example
   cd examples/getting-started/middleware-auth-handler-example
   
   # Install dependencies
   npm install
   
   # Configure environment
   cp env.example .env
   # Edit .env with your API keys
   
   # Start the development server
   npm run dev
   
   # Open Workbench
   # Visit http://localhost:3000
   ```

3. **Explore the Workbench:**
   Each example includes visual workflow representations, real-time logs, and interactive testing capabilities.

### Learning Paths

**Path 1: Complete Beginner (2-4 hours)**
1. [middleware-auth-handler-example](examples/getting-started/middleware-auth-handler-example/)
2. [queue-example](examples/getting-started/queue-example/)
3. [realtime-todo-app](examples/getting-started/realtime-todo-app/)

**Path 2: AI Developer (2-5 days)**
1. Review [Getting Started](examples/getting-started/)
2. Build [Chat Agents](examples/ai-agents/chat-agents/)
3. Explore [RAG Systems](examples/rag-and-search/)
4. Create [Multi-Agent Systems](examples/ai-agents/multi-agent-systems/)

**Path 3: Integration Specialist (1-2 days)**
1. [Queue Example](examples/getting-started/queue-example/)
2. Choose integration: [GitHub](examples/integrations/github/), [Stripe](examples/integrations/payment/), or [Gmail](examples/integrations/communication/)
3. Build custom integration

**Path 4: Production Engineer (1-2 weeks)**
1. Review foundational patterns
2. Study [Advanced Use Cases](examples/advanced-use-cases/)
3. Implement monitoring and error handling
4. Deploy to production

### Meeting Transcription Example

A comprehensive example demonstrating local, privacy-friendly meeting audio processing using Motia, Whisper, and Streamlit.

**Key Features:**

- Complete Motia workflow from audio input to structured output
- Local AI processing with privacy-first approach
- Multiple step types (API, Event, Custom)
- Real-world meeting transcription with action item extraction
- Cross-platform UI with Streamlit

**Technologies:** TypeScript, Python, Whisper, Streamlit, Motia

[View Example →](examples/advanced-use-cases/meeting-transcription/)

### AI AQI Alert System

A comprehensive Air Quality Index (AQI) analysis backend providing real-time air quality monitoring, health recommendations, trend analysis, and alert notifications.

<div style="display: flex; gap: 10px;">
  <img src="examples/monitoring-and-alerts/ai-aqi-alert-system/docs/workbench.png" width="49%" alt="AQI Dashboard" />
  <img src="examples/monitoring-and-alerts/ai-aqi-alert-system/docs/output.png" width="49%" alt="AQI Analysis Output" />
</div>

**Key Features:**
- Real-time AQI analysis for any location
- AI-powered health recommendations based on AQI levels
- 7-day trend analysis
- Email alert system with customizable thresholds
- Beautiful dashboard plugin
- Multiple data sources (Firecrawl, OpenWeatherMap)

**Technologies:** TypeScript, OpenAI, Firecrawl, OpenWeatherMap, Resend

[View Example →](examples/monitoring-and-alerts/ai-aqi-alert-system)

### AI Mortgage Alert System

An intelligent, real-time mortgage rate monitoring and analysis system with OpenAI, Couchbase Vector Search, and Resend.

![Mortgage Rate Alert System](examples/monitoring-and-alerts/ai-morgage-alert-system/public/workbench.png)

**Key Features:**
- AI-powered mortgage rate trend analysis using OpenAI GPT-4
- Vector search with 1536-dimensional embeddings
- Beautiful HTML email alerts via Resend
- Automated monitoring with cron-based rate scraping
- CSV logging for all analyses
- Real-time processing of rate changes

**Technologies:** TypeScript, OpenAI, Couchbase, Resend

[View Example →](examples/monitoring-and-alerts/ai-morgage-alert-system)

### AI Home Renovation Planner

A full-stack AI-powered renovation planning application with personalized design plans, budget-aware recommendations, and photorealistic rendering using Gemini 2.5 Flash.

![AI Home Renovation](examples/advanced-use-cases/ai-room-renovate/public/motia-room-renovate.gif)

**Key Features:**
- AI-powered design planning with specific materials and colors
- Budget-aware recommendations tailored to constraints
- Complete project roadmap with timeline and budget breakdown
- Photorealistic rendering using Gemini 2.5 Flash Image
- Natural language editing of renderings
- Real-time frontend updates
- Smart room and budget detection

**Technologies:** TypeScript, Python, Google Gemini 2.5 Flash, React

[View Example →](examples/ai-room-renovate)

### Airbnb Guest Assistant

An AI-powered guest assistant for Airbnb properties with RAG capabilities, conversation history tracking in Notion, and local search functionality.

![Airbnb Assistant](examples/rag-and-search/rag-applications/airbnb-assistant/docs/img/workbench.png)

**Key Features:**
- Smart chat API with RAG architecture
- Vector search with Pinecone integration
- Conversation history in Notion database
- SerpAPI integration for restaurant/attraction recommendations
- Document processing for property manuals
- Beautiful Workbench visualization

**Technologies:** TypeScript, OpenAI, Pinecone, Notion, SerpAPI

[View Example →](examples/rag-and-search/rag-applications/airbnb-assistant)

### Currency Rate Monitor

A sophisticated Currency Rate Monitor with RAG using OpenAI embeddings, Weaviate vector database, Google Sheets logging, and Slack notifications.

![Currency Monitor](examples/foundational/automation/currency-rate-monitor/docs/img/workbench.png)

**Key Features:**
- Webhook endpoint for currency rate data
- Text processing with automatic chunking
- Vector embeddings with OpenAI
- Weaviate vector database for semantic search
- RAG agent with intelligent query processing
- Google Sheets logging
- Slack error notifications

**Technologies:** TypeScript, OpenAI, Weaviate, Google Sheets, Slack

[View Example →](examples/foundational/automation/currency-rate-monitor)

### GitHub Stars Video Generator

Generate beautiful animated videos showcasing your GitHub repository's star history using Motia and Remotion.

![GitHub Stars Video](examples/integrations/social-media/git-stars-video/public/images/workbench.png)

**Key Features:**
- Dual theme support (dark and light)
- Live video preview in Motia Workbench
- Real-time processing with live status updates
- High-quality output (1280x720 @ 60 FPS)
- Smooth animations with avatar scrolling
- One-click MP4 download

**Technologies:** TypeScript, Remotion, GitHub API

[View Example →](examples/integrations/social-media/git-stars-video)

### GitHub Commit Jenkins

A production-ready workflow that processes GitHub commits using AI-powered analysis with RAG (Retrieval-Augmented Generation).

![GitHub Commit Jenkins](examples/integrations/github/github-commit-jenkins/img/workbench.png)

**Key Features:**
- Webhook integration for GitHub commits
- Text processing with chunking
- Vector embeddings with OpenAI
- Vector storage in Supabase with pgvector
- RAG agent for commit analysis
- Google Sheets logging
- Slack error notifications

**Technologies:** TypeScript, Python, OpenAI, Supabase, Google Sheets, Slack

[View Example →](examples/integrations/github/github-commit-jenkins)

### Google ADK Agents on Motia

Build production-grade AI agents with Google's Agent Development Kit, simplified by Motia's event-driven architecture.

<div style="display: flex; gap: 10px;">
  <img src="examples/integrations/google-workspace/google-adk-motia/docs/agent-ui.png" width="49%" alt="Agent Dashboard" />
  <img src="examples/integrations/google-workspace/google-adk-motia/docs/agent-workbench.png" width="49%" alt="Workbench Flow" />
</div>

**Key Features:**
- Simple & multi-agent chat systems
- Fast polling for real-time updates (500ms)
- Beautiful formatted output with syntax highlighting
- Async event-driven processing
- Conversation history with session persistence
- Tool integration (search, code, weather, etc.)
- Full TypeScript with Zod validation

**Technologies:** TypeScript, Google Gemini 2.5 Flash, Motia

[View Example →](examples/integrations/google-workspace/google-adk-motia)

### Motia Research Assistant

A multi-agent research system combining Motia workflow orchestration with Mastra AI agents to deliver comprehensive business research reports in under 60 seconds.

**Key Features:**
- 8-step workflow pipeline
- Web search using Tavily API
- AI-powered analysis with OpenAI GPT-4o
- Fact verification with additional searches
- Professional report generation
- Quality metrics tracking

**Technologies:** TypeScript, Mastra, OpenAI, Tavily

[View Example →](examples/rag-and-search/rag-applications/motia-research-assistant)

### Property Search Agent

A high-performance, event-driven real estate search system built with Motia and Agno, featuring parallel processing and interactive dashboard.

<div style="display: flex; gap: 10px;">
  <img src="examples/rag-and-search/rag-applications/property-search-agent/docs/img/workbench.png" width="49%" alt="Property Search Workbench" />
  <img src="examples/rag-and-search/rag-applications/property-search-agent/docs/img/plugin-ui.png" width="49%" alt="Property Dashboard" />
</div>

**Key Features:**
- 4 parallel processors (57% faster than sequential)
- Concurrent website scraping with Firecrawl
- AI-powered market analysis with Agno + OpenAI
- Property enrichment (schools, crime stats, walkability)
- Neighborhood analysis
- Interactive React dashboard plugin
- Beautiful UI components for Workbench

**Technologies:** TypeScript, Python, Agno, OpenAI, Firecrawl

[View Example →](examples/rag-and-search/rag-applications/property-search-agent)

### Public Form Auto Triage

A Motia workflow implementing intelligent form triage using RAG with vector similarity search and LLM processing.

![Form Auto Triage](examples/advanced-use-cases/public-form-auto-triage/docs/img/workflow.png)

**Key Features:**
- Webhook integration for form submissions
- Text processing and embedding generation
- Vector storage in Supabase with pgvector
- RAG agent with Claude AI
- Window memory for conversation context
- Google Sheets logging
- Slack error notifications

**Technologies:** TypeScript, OpenAI, Anthropic, Supabase, Google Sheets, Slack

[View Example →](examples/advanced-use-cases/public-form-auto-triage)

### SmartTravel Multi-Agent System

An intelligent travel planning system powered by 6 specialized AI agents working in harmony to create comprehensive, personalized travel itineraries.

<div style="display: flex; gap: 10px;">
  <img src="examples/ai-agents/multi-agent-systems/smarttravel-multi-agent/public/frontend.png" width="49%" alt="SmartTravel Frontend" />
  <img src="examples/ai-agents/multi-agent-systems/smarttravel-multi-agent/public/workbench.png" width="49%" alt="SmartTravel Workbench" />
</div>

**Key Features:**
- 6 specialized AI agents (Destination Explorer, Flight Search, Hotel Search, Dining, Itinerary, Budget)
- Real-time status tracking
- Beautiful React frontend with TanStack Router
- API-driven architecture
- Multi-agent orchestration
- Personalized planning based on travel style and interests

**Technologies:** TypeScript, OpenAI GPT-4o, React, TanStack Router

[View Example →](examples/ai-agents/multi-agent-systems/smarttravel-multi-agent)

### AI Content Moderation

A complete content moderation system combining AI analysis with human review via Slack integration.

![Content Moderation](examples/ai-agents/specialized-agents/ai-content-moderation/assets/workflow.png)

**Key Features:**
- Dual content support (text and images)
- Confidence-based routing (auto vs human review)
- Interactive Slack messages for human review
- Channel prioritization for high-risk content
- Audit trail with reviewer information
- State management for complete workflow tracking

**Technologies:** TypeScript, OpenAI, Slack

[View Example →](examples/ai-agents/specialized-agents/ai-content-moderation)

### Car Alert System

AI-powered connected car alert processing system with intelligent response generation.

![Car Alert](examples/monitoring-and-alerts/car-alert/docs/img/workbench.png)

**Key Features:**
- Text chunking for large alerts
- OpenAI GPT-4 for intelligent responses
- Conversation memory per session
- Local JSON logging
- Optional Google Sheets integration
- No Redis required (uses Motia state)

**Technologies:** Python, OpenAI, Google Sheets

[View Example →](examples/monitoring-and-alerts/car-alert)

### Competitor Price Scraper

A Motia workflow implementing a full RAG system for analyzing competitor pricing data with vector storage.

![Competitor Scraper](examples/advanced-use-cases/competitor-price-scrapper/docs/img/workbench.png)

**Key Features:**
- Webhook endpoint for competitor data
- Text processing with configurable chunking
- OpenAI embeddings generation
- Supabase vector storage with pgvector
- RAG analysis using Anthropic Claude
- Window memory for conversation context
- Google Sheets logging
- Slack error notifications

**Technologies:** TypeScript, OpenAI, Anthropic, Supabase, Google Sheets, Slack

[View Example →](examples/advanced-use-cases/competitor-price-scrapper)

### Email Marketing Automation

A comprehensive email marketing automation platform featuring AI-powered personalization, behavioral triggers, and scalable campaign management.

<div style="display: flex; gap: 10px;">
  <img src="examples/content-and-marketing/email-marketing-automation/assets/email-dashboard.png" width="49%" alt="Email Dashboard" />
  <img src="examples/content-and-marketing/email-marketing-automation/assets/email-campaigns.png" width="49%" alt="Campaign Management" />
</div>

**Key Features:**
- Campaign creation and management API
- Smart user segmentation (VIP, new users, active, inactive)
- AI content personalization with Python
- Scheduled campaigns with automated delivery
- Real-time email analytics
- Behavioral trigger automation
- Welcome email series
- Unsubscribe management
- Beautiful React dashboard

**Technologies:** TypeScript, Python, OpenAI, Appwrite, SendGrid, React

[View Example →](examples/email-marketing-automation)

### Fast Likes Smart Feeds

A fast-response, event-driven like system demonstrating mixed TypeScript/Python microservices architecture with immediate API responses and asynchronous background processing.

![Fast Likes System](examples/integrations/social-media/fast-likes-smart-feeds/docs/img/architecture.png)

**Key Features:**
- Micro-actions pattern with real-time integrations
- Database sync with Supabase
- Firebase Cloud Messaging for push notifications
- WebSocket broadcasting capability
- Parallel processing for maximum performance
- Event-driven architecture

**Technologies:** TypeScript, Python, Firebase, Supabase

[View Example →](examples/integrations/social-media/fast-likes-smart-feeds)

### Harvest Logbook RAG

A hands-on demonstration of building a production-ready RAG system with fine-grained authorization using SpiceDB.

![Harvest Logbook](examples/rag-and-search/rag-applications/harvest-logbook-rag/docs/img/image.png)

**Key Features:**
- RAG pipeline with Motia's event-driven architecture
- Fine-grained authorization with SpiceDB
- Text chunking and embedding generation
- Vector storage with Pinecone
- Role-based access control
- Multi-tenant data access
- OpenAI and HuggingFace support

**Technologies:** TypeScript, OpenAI, Pinecone, SpiceDB

[View Example →](examples/rag-and-search/rag-applications/harvest-logbook-rag)

### NVIDIA Docs AI Generator

An intelligent documentation generation system that automatically analyzes GitHub repositories and creates comprehensive documentation with architecture diagrams, code analysis, and test generation.

![NVIDIA Docs](examples/rag-and-search/rag-fundamentals/nvidia-docs-motia/docs/image.png)

**Key Features:**
- AI-powered repository analysis using NVIDIA NIM LLMs
- Automatic architecture and workflow diagrams
- Comprehensive documentation generation
- Code quality analysis and improvement suggestions
- Automated test case generation
- Support for multiple programming languages

**Technologies:** TypeScript, NVIDIA NIM, Mermaid

[View Example →](examples/rag-and-search/rag-fundamentals/nvidia-docs-motia)

### Ollama Chat

A minimal example demonstrating real-time AI streaming and conversation state management using Motia with Ollama for local AI models.

**Key Features:**
- Real-time AI streaming with token-by-token responses
- Local AI models (Llama 3.1, CodeLlama, Mistral, etc.)
- Live state management with message history
- Event-driven architecture
- Privacy-focused (all processing local)
- No API keys required

**Technologies:** TypeScript, Ollama

[View Example →](examples/getting-started/ollama-chat)

### RAG Dockling ChromaDB Ollama Agent

Multi-format document RAG agent supporting PDF, Markdown, HTML, and TXT files with Docling and vector databases.

**Key Features:**
- Multi-format document processing
- Docling for document parsing and hybrid chunking
- ChromaDB vector storage
- OpenAI or Ollama integration
- Question answering using RAG pattern
- Docker support for easy deployment

**Technologies:** TypeScript, Python, Docling, ChromaDB, OpenAI, Ollama

[View Example →](examples/rag-and-search/rag-fundamentals/rag-dockling-chromadb-ollama-agent)

### Real-time Todo App

A modern todo application featuring real-time streaming capabilities, React frontend, and type-safe API backend built with Motia.

<div style="display: flex; gap: 10px;">
  <img src="examples/getting-started/realtime-todo-app/images/workbench.png" width="49%" alt="Workbench" />
  <img src="examples/getting-started/realtime-todo-app/images/webapp.png" width="49%" alt="Todo App" />
</div>

**Key Features:**
- Real-time synchronization via Motia Streams
- Type-safe end-to-end with Zod validation
- Modern UI with TailwindCSS
- Inline editing functionality
- Optimistic updates with loading states
- Virtual events for loose coupling

**Technologies:** TypeScript, React, Motia Streams, TailwindCSS

[View Example →](examples/getting-started/realtime-todo-app)

### UGC Workflow

An AI-powered pipeline that automatically transforms product images into professional user-generated content (UGC) videos for social media marketing.

**Key Features:**
- Multi-AI pipeline (GPT-4o, Gemini 2.5 Flash, Veo 3)
- Parallel processing for multiple variants
- Brand consistency maintenance
- Authentic UGC style creation
- Cloud storage with Box
- Event-driven architecture

**Technologies:** TypeScript, Python, OpenAI, Google Gemini, Veo 3, ImageKit, Box

[View Example →](examples/content-and-marketing/ugc-workflow)

### Wake Surf Club

A complete wake surf club booking and session management system with SMS notifications, calendar integration, and automated workflows.

**Key Features:**
- Session Management: Create and manage surf sessions with capacity limits
- Booking System: Direct booking with automatic waitlist handling
- SMS Notifications: Automated invites, confirmations, reminders via Twilio
- Calendar Integration: Generate ICS calendar files for sessions
- Admin Panel: Custom Workbench plugin for managing bookings
- Automated Workflows: Morning reminders, invite blasts, session seeding via cron jobs

**Technologies:** TypeScript, Motia, Redis, BullMQ, Twilio, React

[View Example →](examples/advanced-use-cases/wake-surf-club)

## 📊 Repository Statistics

- **Total Examples**: 64

**Latest Additions:**
- [todo-app](examples/foundational/api-patterns/todo-app/) - Complete Motia demo
- [ProspectAI](examples/ai-agents/specialized-agents/ai-prospect-agent/) - Sales intelligence platform
- **Categories**: 8 main categories
- **Languages**: TypeScript, JavaScript, Python
- **Difficulty Levels**: Beginner → Intermediate → Advanced → Expert
- **Topics Covered**: AI agents, RAG, integrations, monitoring, marketing, computer vision, and more

## 🗺️ Find Examples By

### By Motia Feature
- **API Steps**: [Getting Started](examples/getting-started/), [Integrations](examples/integrations/)
- **Event Steps**: [AI Agents](examples/ai-agents/), [Foundational](examples/foundational/)
- **Cron Steps**: [Monitoring](examples/monitoring-and-alerts/)
- **Streaming (SSE)**: [Getting Started](examples/getting-started/realtime-todo-app/), [AI Agents](examples/ai-agents/chat-agents/)
- **State Management**: Most AI and RAG examples
- **Queues**: [Queue Example](examples/getting-started/queue-example/)

### By Technology
- **OpenAI**: [AI Agents](examples/ai-agents/), [RAG](examples/rag-and-search/)
- **Anthropic Claude**: [Multi-Agent Systems](examples/ai-agents/multi-agent-systems/)
- **Vector Databases**: [RAG and Search](examples/rag-and-search/)
- **GitHub**: [GitHub Integrations](examples/integrations/github/)
- **Stripe**: [Payment Integration](examples/integrations/payment/)
- **Docker**: [Infrastructure](examples/foundational/infrastructure/)

### By Use Case
- **Chatbots**: [Chat Agents](examples/ai-agents/chat-agents/)
- **Search**: [RAG and Search](examples/rag-and-search/)
- **E-commerce**: [Integrations](examples/integrations/payment/), [Monitoring](examples/monitoring-and-alerts/)
- **Marketing**: [Content and Marketing](examples/content-and-marketing/)
- **Monitoring**: [Monitoring and Alerts](examples/monitoring-and-alerts/)

## 🤝 Contributing

We welcome contributions! If you've built an interesting application with Motia, please share it:

1. **Report Issues**: Found a bug? [Open an issue](https://github.com/MotiaDev/motia-examples/issues)
2. **Improve Examples**: Submit PRs to enhance existing examples
3. **Add Examples**: Share your Motia applications following our structure
4. **Update Documentation**: Help improve READMEs and guides

See our [contribution guidelines](CONTRIBUTING.md) for details.

## 📝 License

This repository and its contents are licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 📚 Resources

### Documentation
- **[Motia Documentation](https://motia.dev/docs)** - Complete framework documentation
- **[Examples Catalog](examples/)** - Organized examples with learning paths
- **[Examples Documentation](https://www.motia.dev/docs/examples)** - Detailed tutorials
- **[Getting Started Guide](https://www.motia.dev/docs/getting-started)** - Quick start tutorial
- **[Core Concepts](https://www.motia.dev/docs/concepts)** - Understanding Steps, Events, and Flows
- **[Deployment Guide](https://www.motia.dev/docs/deployment)** - Production deployment strategies

### Community
- **[GitHub Discussions](https://github.com/MotiaDev/motia/discussions)** - Ask questions and share ideas
- **[Discord](https://motia.dev/discord)** - Join the community
- **[Twitter](https://twitter.com/motiadev)** - Latest updates and tips

---

**Built with ❤️ by the Motia community**

[motia.dev](https://motia.dev) | [Documentation](https://motia.dev/docs) | [GitHub](https://github.com/MotiaDev/motia)
