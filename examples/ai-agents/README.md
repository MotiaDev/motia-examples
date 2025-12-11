# AI Agents

Build intelligent AI-powered applications with Motia. This section contains examples ranging from simple chat agents to complex multi-agent orchestration systems.

## 📂 Categories

### [Chat Agents](./chat-agents/)
Conversational AI interfaces with memory and streaming capabilities.

### [Specialized Agents](./specialized-agents/)
Domain-specific AI agents for code review, research, content moderation, and more.

### [Multi-Agent Systems](./multi-agent-systems/)
Complex orchestrations with multiple AI agents working together.

---

## 🎯 What You'll Learn

- Building conversational AI with memory
- Streaming AI responses in real-time
- Creating specialized AI agents for specific tasks
- Orchestrating multiple agents
- Managing agent state and context
- Implementing AI workflows with event-driven architecture

## 📚 Examples by Category

**Total Examples**: 20 (3 chat agents + 9 specialized agents + 8 multi-agent systems)

### Chat Agents

#### [chat-agent](./chat-agents/chat-agent)
**Level**: Intermediate  
**Concepts**: OpenAI Integration, Conversational AI

Build a basic conversational AI agent using OpenAI.

**Key Features**:
- OpenAI API integration
- Chat completions
- Message handling
- Context management

---

#### [ai-chat-agent-with-memory](./chat-agents/ai-chat-agent-with-memory)
**Level**: Intermediate  
**Concepts**: Stateful Conversations, Context Management

Create a chat agent that remembers previous conversations.

**Key Features**:
- Conversation history
- State persistence
- Context window management
- Memory optimization

---

#### [streaming-ai-chatbot](./chat-agents/streaming-ai-chatbot)
**Level**: Intermediate  
**Concepts**: Real-time Streaming, SSE, UI Integration

Build a real-time streaming chatbot with a modern UI.

**Key Features**:
- Server-Sent Events (SSE)
- Real-time AI responses
- Frontend integration
- Token streaming

---

### Specialized Agents

#### [ai-ReACT-agent](./specialized-agents/ai-ReACT-agent)
**Level**: Advanced  
**Concepts**: ReAct Pattern, Tool Integration, Multi-Hop Reasoning

Intelligent research assistant implementing the ReAct (Reason + Act) pattern for complex questions.

**Key Features**:
- Adaptive reasoning and tool selection
- Multi-tool integration (Tavily, Alpha Vantage)
- Iterative information gathering
- Production-ready with error handling

---

#### [ai-code-reviewer-agent](./specialized-agents/ai-code-reviewer-agent)
**Level**: Advanced  
**Concepts**: Code Analysis, GitHub Integration

Automatically review code and provide feedback on PRs.

**Key Features**:
- Code quality analysis
- PR comment generation
- Best practices checking
- GitHub webhook integration

---

#### [ai-deep-research-agent](./specialized-agents/ai-deep-research-agent)
**Level**: Advanced  
**Concepts**: Web Search, Information Synthesis

Conduct deep research on topics using web search and AI.

**Key Features**:
- Web search integration
- Information extraction
- Source citation
- Report generation

---

#### [ai-content-moderation](./specialized-agents/ai-content-moderation)
**Level**: Intermediate  
**Concepts**: Safety, Moderation, Classification

Moderate user-generated content for safety and compliance.

**Key Features**:
- Content classification
- Safety scoring
- Automated moderation
- Custom rule engine

---

#### [finance-agent](./specialized-agents/finance-agent)
**Level**: Advanced  
**Concepts**: Financial Analysis, Data Processing

Analyze financial data and generate insights.

**Key Features**:
- Market data analysis
- Financial metrics
- Trend detection
- Report generation

---

#### [ai-planning-agent](./specialized-agents/ai-planning-agent)
**Level**: Advanced  
**Concepts**: Planning Architecture, AI-powered planning, intelligent failure handling, and human-in-the-loop approvals.

Plan and execute tasks with AI-powered planning, intelligent failure handling, and human-in-the-loop approvals.

**Key Features**:

- AI-powered planning
- Intelligent failure handling
- Human-in-the-loop approvals
- Task decomposition
- Task execution
- Task monitoring
- Task reporting

---

#### [ai-health-fitness](./specialized-agents/ai-health-fitness)
**Level**: Intermediate  
**Concepts**: Health Tracking, Recommendations

Track health metrics and provide fitness recommendations.

**Key Features**:
- Activity tracking
- Personalized recommendations
- Goal setting
- Progress monitoring

---

#### [linkedIn-content-agent](./specialized-agents/linkedIn-content-agent)
**Level**: Intermediate  
**Concepts**: Content Generation, Social Media

Generate LinkedIn posts and content ideas.

**Key Features**:
- Content generation
- Post formatting
- Engagement optimization
- Topic suggestions

---

#### [Spamurai-pr-agent](./specialized-agents/Spamurai-pr-agent)
**Level**: Advanced  
**Concepts**: PR Management, Automation

Manage pull requests with AI-powered reviews and automation.

**Key Features**:
- PR analysis
- Automated reviews
- Comment management
- Merge strategies

---

### Multi-Agent Systems

#### [ai-app-generator](./multi-agent-systems/ai-app-generator)
**Level**: Expert  
**Concepts**: Multi-Agent Orchestration, Code Generation

Generate complete full-stack applications using multiple specialized AI agents.

**Key Features**:
- Architecture design agent
- Code generation agent
- Test designer agent
- UI/UX enhancement agent
- Complete app assembly

**⭐ Highlights**: 
- 7 specialized agents working together
- Produces production-ready code
- Full test suite generation
- Download complete applications

---

#### [multi-agent-game-generation](./multi-agent-systems/multi-agent-game-generation)
**Level**: Expert  
**Concepts**: Game Development, Multi-Agent Coordination

Generate playable games with multiple agents handling different aspects.

**Key Features**:
- Game design agent
- Code generation
- Asset creation
- Testing automation

---

#### [ai-vs-ai-tictactoe-game](./multi-agent-systems/ai-vs-ai-tictactoe-game)
**Level**: Advanced  
**Concepts**: Competitive AI, Game Theory

Watch two AI agents compete in tic-tac-toe.

**Key Features**:
- Dual agent setup
- Game state management
- Strategy learning
- Real-time visualization

---

#### [smarttravel-multi-agent](./multi-agent-systems/smarttravel-multi-agent)
**Level**: Expert  
**Concepts**: Travel Planning, Multi-Agent Workflow

Plan complete travel itineraries with specialized agents.

**Key Features**:
- Flight search agent
- Hotel booking agent
- Activity planner
- Itinerary coordination

---

#### [ai-hedgefund](./multi-agent-systems/ai-hedgefund)
**Level**: Expert  
**Concepts**: Investment Strategy, Financial AI

Simulate hedge fund operations with multiple AI agents.

**Key Features**:
- Market analysis agent
- Risk assessment agent
- Portfolio management
- Trading strategies

---

#### [motia-langgraph-lead-scoring](./multi-agent-systems/motia-langgraph-lead-scoring)
**Level**: Advanced  
**Concepts**: LangGraph Integration, Sales Automation

Score and qualify leads using LangGraph-powered agents.

**Key Features**:
- Lead analysis
- Scoring algorithms
- LangGraph workflows
- CRM integration

---

## 🚀 Getting Started

### Prerequisites
- OpenAI API key or Anthropic API key (depending on example)
- Basic understanding of AI/LLM concepts
- Familiarity with async programming

### Quick Start
1. Choose an example based on your experience level
2. Follow the specific README in each example
3. Configure your API keys in `.env`
4. Install dependencies
5. Start exploring!

## 📖 Learning Path

**For Beginners**: Start with Chat Agents
1. `chat-agent` - Basic conversational AI
2. `ai-chat-agent-with-memory` - Add state management
3. `streaming-ai-chatbot` - Real-time responses

**For Intermediate Users**: Explore Specialized Agents
1. `ai-content-moderation` - Single-purpose agent
2. `ai-health-fitness` - Domain-specific logic
3. `ai-ReACT-agent` - ReAct pattern with tool integration
4. `ai-planning-agent` - Planning Architecture with AI-powered planning, intelligent failure handling, and human-in-the-loop approvals.
5. `ai-code-reviewer-agent` - Complex analysis

**For Advanced Users**: Build Multi-Agent Systems
1. `ai-vs-ai-tictactoe-game` - Agent coordination  
2. `smarttravel-multi-agent` - Multi-agent workflow  
3. `ai-app-generator` - Full orchestration  

## 💡 Best Practices

- **Start Simple**: Begin with single-agent examples
- **Manage Costs**: Monitor API usage, especially in multi-agent systems
- **Handle Errors**: Implement retry logic and error handling
- **Stream Responses**: Use SSE for better UX with long-running tasks
- **State Management**: Use Motia's built-in state for agent memory
- **Test Thoroughly**: AI outputs are non-deterministic, test edge cases

## 🔗 Next Steps

- **[RAG and Search](../rag-and-search/)** - Add knowledge bases to your agents
- **[Advanced Use Cases](../advanced-use-cases/)** - Production-ready AI systems
- **[Integrations](../integrations/)** - Connect agents to external services

## 📚 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [Real-time Streaming Guide](../../.cursor/rules/motia/realtime-streaming.mdc)
- [State Management Guide](../../.cursor/rules/motia/state-management.mdc)
