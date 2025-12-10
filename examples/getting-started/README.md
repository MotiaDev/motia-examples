# Getting Started with Motia

Welcome to Motia! This section contains beginner-friendly examples to help you learn core Motia concepts.

## 🎯 What You'll Learn

- Creating API endpoints (API Steps)
- Processing background events (Event Steps)
- Using middleware for authentication and validation
- Managing queues and job processing
- Building real-time applications with Server-Sent Events (SSE)

## 📚 Examples

### [middleware-auth-handler-example](./middleware-auth-handler-example)
**Concepts**: Middleware, Authentication, Request/Response Processing

Learn how to create reusable middleware for authentication, validation, and error handling in your Motia applications.

**Key Features**:
- JWT authentication middleware
- Request validation
- Error handling patterns
- Middleware composition

---

### [ollama-chat](./ollama-chat)
**Concepts**: API Steps, Local LLM Integration

Build a simple chat interface using Ollama for local AI model inference.

**Key Features**:
- API endpoint creation
- Ollama integration
- Basic chat flow
- Local AI inference

---

### [queue-example](./queue-example)
**Concepts**: Queues, Event Steps, Background Processing

Understand how to manage job queues and process tasks asynchronously.

**Key Features**:
- Queue management
- Job processing
- Event-driven architecture
- Retry mechanisms

---

### [realtime-todo-app](./realtime-todo-app)
**Concepts**: Real-time Streaming, SSE, State Management

Create a real-time todo application with Server-Sent Events for instant updates.

**Key Features**:
- Server-Sent Events (SSE)
- Real-time updates
- State management
- CRUD operations

---

## 🚀 Getting Started

1. **Choose an example** that matches what you want to learn
2. **Navigate to the example directory**
3. **Follow the README** in each example
4. **Run `npm install`** (or `pip install -r requirements.txt` for Python)
5. **Start the dev server** with `npm run dev` (or `python -m motia dev`)
6. **Open the Workbench** at `http://localhost:3000`

## 📖 Learning Path

We recommend following this order:

1. **middleware-auth-handler-example** - Understand middleware basics
2. **queue-example** - Learn event-driven architecture
3. **ollama-chat** - Build your first API endpoint
4. **realtime-todo-app** - Add real-time capabilities

## 🔗 Next Steps

Once you're comfortable with these examples, move on to:
- **[Foundational Examples](../foundational/)** - Common patterns for real-world apps
- **[AI Agents](../ai-agents/)** - AI-powered applications

## 📚 Resources

- [Motia Documentation](https://motia.dev/docs)
- [API Steps Guide](../../.cursor/rules/motia/api-steps.mdc)
- [Event Steps Guide](../../.cursor/rules/motia/event-steps.mdc)
- [Middleware Guide](../../.cursor/rules/motia/middlewares.mdc)
