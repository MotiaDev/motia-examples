# Motia Examples

A comprehensive collection of examples demonstrating how to build event-driven applications with Motia. From beginner tutorials to production-ready systems, this repository covers the full spectrum of Motia's capabilities.

## 📚 Browse by Category

### [🚀 Getting Started](./getting-started/)
**Level**: Beginner  
**Start here if you're new to Motia**

Learn core concepts with simple, focused examples:
- API endpoints and event processing
- Middleware and authentication
- Queue management
- Real-time updates with SSE

**Time to Complete**: 2-4 hours  
**Examples**: 4

---

### [🔧 Foundational](./foundational/)
**Level**: Intermediate  
**Common patterns for real-world applications**

Master essential patterns for building production apps:
- **[API Patterns](./foundational/api-patterns/)** - File processing, text analysis
- **[Automation](./foundational/automation/)** - Content workflows, scheduling
- **[Infrastructure](./foundational/infrastructure/)** - Docker, monitoring, performance

**Time to Complete**: 1-2 days  
**Examples**: 9 across 3 subcategories

---

### [🤖 AI Agents](./ai-agents/)
**Level**: Intermediate to Expert  
**Build intelligent AI-powered applications**

From simple chatbots to complex multi-agent systems:
- **[Chat Agents](./ai-agents/chat-agents/)** - Conversational AI with memory
- **[Specialized Agents](./ai-agents/specialized-agents/)** - Code review, research, moderation
- **[Multi-Agent Systems](./ai-agents/multi-agent-systems/)** - Complex orchestration (app generator, travel planner, hedge fund)

**Time to Complete**: 2-5 days  
**Examples**: 18 across 3 subcategories  
**⭐ Featured**: [ai-app-generator](./ai-agents/multi-agent-systems/ai-app-generator) - Generate complete full-stack apps

---

### [📚 RAG and Search](./rag-and-search/)
**Level**: Advanced  
**Retrieval-Augmented Generation and semantic search**

Build AI applications with knowledge bases:
- **[RAG Fundamentals](./rag-and-search/rag-fundamentals/)** - ChromaDB, Weaviate, local vs cloud
- **[RAG Applications](./rag-and-search/rag-applications/)** - Property search, documentation, research assistants

**Time to Complete**: 3-5 days  
**Examples**: 9 across 2 subcategories  
**Databases**: ChromaDB, Weaviate, LanceDB, Pinecone

---

### [🔌 Integrations](./integrations/)
**Level**: Intermediate  
**Connect with popular platforms and services**

Integrate Motia with external services:
- **[GitHub](./integrations/github/)** - CI/CD, webhooks, automation
- **[Communication](./integrations/communication/)** - Gmail, Trello
- **[Payment](./integrations/payment/)** - Stripe integration
- **[Social Media](./integrations/social-media/)** - Engagement, content distribution
- **[Google Workspace](./integrations/google-workspace/)** - Drive, Sheets, Calendar

**Time to Complete**: 1-2 days  
**Examples**: 9 across 5 subcategories  
**⭐ Featured**: [stripe-payment-demo](./integrations/payment/stripe-payment-demo) - Production-ready payment flow

---

### [📊 Monitoring and Alerts](./monitoring-and-alerts/)
**Level**: Intermediate  
**Build intelligent monitoring systems**

Scheduled monitoring with smart alerts:
- Air quality monitoring
- Mortgage rate tracking
- Vehicle maintenance alerts

**Time to Complete**: 1 day  
**Examples**: 3  
**Key Concept**: Cron Steps + Event-driven alerts

---

### [📧 Content and Marketing](./content-and-marketing/)
**Level**: Intermediate to Advanced  
**Automate content and marketing workflows**

Marketing automation and content management:
- Email marketing automation
- User-generated content workflows
- Multi-modal content analysis

**Time to Complete**: 2-3 days  
**Examples**: 3  
**⭐ Featured**: [email-marketing-automation](./content-and-marketing/email-marketing-automation) - Complete email platform

---

### [🚀 Advanced Use Cases](./advanced-use-cases/)
**Level**: Expert  
**Production-ready, complex implementations**

Enterprise-grade applications:
- AI room renovation (computer vision + design)
- Competitor price scraping
- Meeting transcription and analysis
- Intelligent form routing
- Computer vision examples

**Time to Complete**: 1-2 weeks  
**Examples**: 5  
**Note**: These are production-ready systems, not tutorials

---

## 🎯 Quick Start

### Choose Your Path

#### Path 1: "I'm New to Motia"
1. Start with [Getting Started](./getting-started/)
2. Pick the [middleware-auth-handler-example](./getting-started/middleware-auth-handler-example)
3. Progress through all 4 getting-started examples
4. Move to [Foundational](./foundational/)

#### Path 2: "I Want to Build AI Apps"
1. Quick review of [Getting Started](./getting-started/)
2. Jump to [AI Agents](./ai-agents/) → [Chat Agents](./ai-agents/chat-agents/)
3. Explore [RAG and Search](./rag-and-search/) for knowledge bases
4. Build [Multi-Agent Systems](./ai-agents/multi-agent-systems/)

#### Path 3: "I Need to Integrate Services"
1. Review [Getting Started](./getting-started/) → [queue-example](./getting-started/queue-example)
2. Go to [Integrations](./integrations/)
3. Pick the service you need (GitHub, Stripe, Gmail, etc.)

#### Path 4: "I Want Production-Ready Examples"
1. Browse [Advanced Use Cases](./advanced-use-cases/)
2. Check [AI Agents](./ai-agents/) → [Multi-Agent Systems](./ai-agents/multi-agent-systems/)
3. Explore [RAG Applications](./rag-and-search/rag-applications/)

---

## 📊 At a Glance

| Category | Level | Examples | Time | Best For |
|----------|-------|----------|------|----------|
| Getting Started | Beginner | 4 | 2-4h | Learning Motia basics |
| Foundational | Intermediate | 9 | 1-2d | Common app patterns |
| AI Agents | Int-Expert | 18 | 2-5d | AI applications |
| RAG and Search | Advanced | 9 | 3-5d | Knowledge bases |
| Integrations | Intermediate | 9 | 1-2d | External services |
| Monitoring | Intermediate | 3 | 1d | Alert systems |
| Content/Marketing | Int-Advanced | 3 | 2-3d | Marketing automation |
| Advanced | Expert | 5 | 1-2w | Production systems |

**Total Examples**: 60+

---

## 🎓 Learning Resources

### Documentation
- [Motia Docs](https://motia.dev/docs) - Official documentation
- [API Steps Guide](../.cursor/rules/motia/api-steps.mdc) - HTTP endpoints
- [Event Steps Guide](../.cursor/rules/motia/event-steps.mdc) - Background processing
- [Cron Steps Guide](../.cursor/rules/motia/cron-steps.mdc) - Scheduled tasks
- [Real-time Streaming](../.cursor/rules/motia/realtime-streaming.mdc) - SSE and WebSockets
- [State Management](../.cursor/rules/motia/state-management.mdc) - Cache and state

### Community
- [GitHub](https://github.com/MotiaDev/motia) - Source code
- [Discord](https://motia.dev/discord) - Community support
- [Twitter](https://twitter.com/motiadev) - Updates and tips

---

## 🏗️ Project Structure

Each example follows a consistent structure:

```
example-name/
├── README.md           # Documentation and setup instructions
├── package.json        # Dependencies (for JS/TS examples)
├── requirements.txt    # Dependencies (for Python examples)
├── .env.example        # Environment variable template
├── motia-workbench.json # Workbench configuration (optional)
├── steps/              # Step definitions
│   ├── api/           # API endpoints
│   ├── events/        # Event handlers
│   └── cron/          # Scheduled tasks
├── src/               # Source code
│   ├── services/      # Business logic
│   └── utils/         # Utilities
└── docs/              # Additional documentation
    └── images/        # Screenshots and diagrams
```

---

## 🚀 Running an Example

### General Steps

```bash
# 1. Navigate to the example
cd getting-started/middleware-auth-handler-example

# 2. Install dependencies
npm install              # for JS/TS
# or
pip install -r requirements.txt  # for Python

# 3. Configure environment
cp env.example .env
# Edit .env with your API keys

# 4. Start development server
npm run dev              # for JS/TS
# or
python -m motia dev      # for Python

# 5. Open Workbench
# http://localhost:3000
```

### Language Distribution

- **TypeScript/JavaScript**: ~70% of examples
- **Python**: ~20% of examples
- **Multi-language**: ~10% (both TS and Python)

---

## 💡 Tips and Best Practices

### For Beginners
- **Start Simple**: Don't skip the getting-started examples
- **Use Workbench**: Visual workflow helps understanding
- **Read READMEs**: Each example has detailed documentation
- **Ask Questions**: Join Discord for community support

### For Intermediate Users
- **Explore Categories**: Find patterns relevant to your use case
- **Combine Patterns**: Mix and match from different examples
- **Customize**: Adapt examples to your needs
- **Contribute**: Share your improvements

### For Advanced Users
- **Study Architecture**: Learn from advanced examples' structure
- **Performance**: Consider queues, caching, and scaling
- **Monitoring**: Implement proper logging and metrics
- **Production**: Add error handling and security

---

## 🔍 Find Examples by Feature

### By Motia Feature
- **API Steps**: All categories, especially [Getting Started](./getting-started/)
- **Event Steps**: [AI Agents](./ai-agents/), [Integrations](./integrations/)
- **Cron Steps**: [Monitoring and Alerts](./monitoring-and-alerts/), [Foundational](./foundational/automation/)
- **Streaming (SSE)**: [AI Agents](./ai-agents/chat-agents/), [Getting Started](./getting-started/realtime-todo-app/)
- **Middleware**: [Getting Started](./getting-started/middleware-auth-handler-example/)
- **State Management**: [AI Agents](./ai-agents/chat-agents/), [Getting Started](./getting-started/realtime-todo-app/)
- **Queues**: [Getting Started](./getting-started/queue-example/), [Advanced](./advanced-use-cases/)

### By Technology
- **OpenAI**: [AI Agents](./ai-agents/), [RAG and Search](./rag-and-search/)
- **Anthropic Claude**: [AI Agents](./ai-agents/multi-agent-systems/)
- **Vector Databases**: [RAG and Search](./rag-and-search/)
- **GitHub**: [Integrations](./integrations/github/)
- **Stripe**: [Integrations](./integrations/payment/)
- **Docker**: [Foundational](./foundational/infrastructure/motia-docker/)
- **Computer Vision**: [Advanced](./advanced-use-cases/vision-example/)

### By Use Case
- **Chatbots**: [AI Agents](./ai-agents/chat-agents/)
- **Search**: [RAG and Search](./rag-and-search/)
- **E-commerce**: [Integrations](./integrations/payment/), [Monitoring](./monitoring-and-alerts/)
- **Content**: [Content and Marketing](./content-and-marketing/)
- **Analytics**: [Advanced](./advanced-use-cases/)
- **Automation**: [Foundational](./foundational/automation/)
- **Monitoring**: [Monitoring and Alerts](./monitoring-and-alerts/)

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Issues**: Found a bug? [Open an issue](https://github.com/MotiaDev/motia-examples/issues)
2. **Improve Examples**: Submit PRs to enhance existing examples
3. **Add Examples**: Share your Motia applications
4. **Documentation**: Help improve READMEs and guides
5. **Community**: Help others in Discord

### Adding a New Example

1. Choose the appropriate category
2. Follow the project structure template
3. Include comprehensive README
4. Add env.example with all required variables
5. Test thoroughly
6. Submit PR with description

---

## 📄 License

All examples are MIT licensed unless otherwise specified.

---

## 🙋 Need Help?

- **Documentation Issues**: Check the README in each example
- **Motia Questions**: [Motia Docs](https://motia.dev/docs)
- **Community Support**: [Discord](https://motia.dev/discord)
- **Bug Reports**: [GitHub Issues](https://github.com/MotiaDev/motia-examples/issues)

---

## ⭐ Featured Examples

### For Learning
- [middleware-auth-handler-example](./getting-started/middleware-auth-handler-example/) - Essential middleware patterns
- [realtime-todo-app](./getting-started/realtime-todo-app/) - Real-time with SSE

### For AI Development
- [ai-app-generator](./ai-agents/multi-agent-systems/ai-app-generator/) - Multi-agent app generation
- [streaming-ai-chatbot](./ai-agents/chat-agents/streaming-ai-chatbot/) - Real-time AI chat
- [motia-research-assistant](./rag-and-search/rag-applications/motia-research-assistant/) - Research automation

### For Production
- [stripe-payment-demo](./integrations/payment/stripe-payment-demo/) - Payment processing
- [email-marketing-automation](./content-and-marketing/email-marketing-automation/) - Email campaigns
- [competitor-price-scrapper](./advanced-use-cases/competitor-price-scrapper/) - Web scraping

---

**Built with ❤️ using [Motia](https://motia.dev)**

Start building event-driven applications today!
