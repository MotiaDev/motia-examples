# Architecture Overview

## Google ADK on Motia - System Design

This document outlines the architecture of the Google ADK agents system built on Motia framework.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Motia Workbench UI                          │
│  (Agent Dashboard Plugin - React-based Interactive Interface)   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP Requests
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API Steps (HTTP Endpoints)                   │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐ │
│  │  Simple Chat    │  │  Multi-Agent Research Workflow       │ │
│  │  POST /agents/  │  │  POST /agents/research               │ │
│  │  chat           │  │  GET  /agents/research/:id           │ │
│  │  GET  /agents/  │  │                                      │ │
│  │  chat/:id       │  │  Sequential • Parallel • Loop        │ │
│  └────────┬────────┘  └────────────┬─────────────────────────┘ │
└───────────┼───────────────────────┼──────────────────────────────┘
            │ Emit Events           │ Emit Events
            ↓                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Event Steps (Background Tasks)                │
│  ┌──────────────────────┐  ┌────────────────────────────────┐  │
│  │  ProcessAgentRequest │  │  ExecuteMultiAgent             │  │
│  │  • Load conversation │  │  • Orchestrate sub-agents      │  │
│  │  • Execute Gemini AI │  │  • Sequential execution        │  │
│  │  • Store result      │  │  • Parallel execution          │  │
│  │  • Update state      │  │  • Loop execution              │  │
│  └──────────┬───────────┘  └─────────────┬──────────────────┘  │
└─────────────┼───────────────────────────┼──────────────────────┘
              │ Uses Services             │ Uses Services
              ↓                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ GeminiAgent      │  │ MultiAgent       │  │ Tools        │ │
│  │ Service          │  │ Service          │  │ Executor     │ │
│  │                  │  │                  │  │              │ │
│  │ • Execute agent  │  │ • Sequential     │  │ • Search     │ │
│  │ • Manage context │  │ • Parallel       │  │ • Code exec  │ │
│  │ • Tool calling   │  │ • Loop           │  │ • Web scrape │ │
│  │ • Streaming      │  │ • Synthesis      │  │ • Calculator │ │
│  └────────┬─────────┘  └──────────────────┘  └──────────────┘ │
└───────────┼──────────────────────────────────────────────────────┘
            │ Calls External APIs
            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     External Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Google       │  │ Web Search   │  │ Other APIs         │   │
│  │ Gemini API   │  │ APIs         │  │ (OpenAI, Claude)   │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   State Management (Redis-like)                 │
│  • agent-requests       • conversations                         │
│  • agent-results        • sessions                              │
│  • multi-agent-results  • tool-results                          │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. API Steps Layer

**Purpose**: HTTP endpoints that accept requests and return immediate responses

**Key Components:**
- `simple-chat.step.ts`: Basic chat endpoint
- `get-chat-result.step.ts`: Retrieve chat results
- `research-workflow.step.ts`: Multi-agent research endpoint
- `get-research-result.step.ts`: Retrieve research results

**Pattern**: Request → Validate → Store → Emit Event → Return 202 Accepted

### 2. Event Steps Layer

**Purpose**: Asynchronous background processing of agent tasks

**Key Components:**
- `process-agent.step.ts`: Execute single agent
- `execute-multi-agent.step.ts`: Orchestrate multiple agents

**Pattern**: Receive Event → Load State → Execute → Store Result → Update State

### 3. Service Layer

**Purpose**: Business logic and external API integration

**Key Services:**

#### GeminiAgentService
```typescript
- execute(message, history): Execute agent with context
- prepareMessages(): Format messages for Gemini API
- callGeminiAPI(): Make API calls to Gemini
- executeTool(): Execute tool functions
```

#### MultiAgentService
```typescript
- executeSequential(): Run agents in sequence
- executeParallel(): Run agents concurrently
- executeLoop(): Iterative agent execution
- synthesizeFinalOutput(): Merge agent results
```

#### Tools
```typescript
- Google Search: Web search capability
- Code Execution: Python sandbox
- Web Scraping: Content extraction
- Calculator: Math operations
- Weather: Weather data
- DateTime: Time utilities
```

### 4. State Management

**Purpose**: Persist data across async operations

**State Groups:**
```typescript
- agent-requests: Ongoing requests
- agent-results: Completed results
- conversations: Chat history
- sessions: User sessions
- multi-agent-results: Research outputs
- tool-results: Tool execution results
```

## Data Flow Examples

### Simple Chat Flow

```
1. User sends message via UI/API
   POST /agents/chat { message: "Hello" }
   
2. API Step validates and stores request
   → Generates requestId
   → Stores in 'agent-requests' state
   → Returns 202 Accepted { request_id }
   
3. API Step emits 'process-agent-request' event
   
4. Event Step receives event
   → Loads conversation history from state
   → Calls GeminiAgentService.execute()
   → Stores result in 'agent-results' state
   → Updates request status to 'completed'
   
5. User polls GET /agents/chat/:requestId
   → Returns result from 'agent-results' state
```

### Multi-Agent Research Flow

```
1. User submits research query
   POST /agents/research { 
     query: "Research renewable energy",
     workflow_type: "sequential"
   }
   
2. API Step creates workflow
   → Defines 3 sub-agents (Research, Summarize, Critique)
   → Stores in 'multi-agent-requests' state
   → Emits 'execute-multi-agent' event
   → Returns 202 Accepted { request_id }
   
3. Event Step orchestrates agents
   → MultiAgentService.executeSequential()
   
   a. Research Agent executes
      → Searches web, analyzes data
      → Returns comprehensive findings
      
   b. Summarizer Agent executes
      → Receives research findings
      → Extracts key insights
      → Returns summary
      
   c. Critic Agent executes
      → Receives summary
      → Analyzes quality
      → Provides recommendations
      
   d. Synthesis
      → Combines all outputs
      → Formats final report
      
4. Results stored in 'multi-agent-results'
   
5. User retrieves GET /agents/research/:requestId
   → Returns synthesized research report
```

## Key Design Decisions

### 1. Async-First Architecture

**Why**: AI operations are slow (1-10 seconds). Blocking HTTP requests would timeout.

**How**: 
- API endpoints return immediately with request ID
- Processing happens in background via events
- Clients poll for results

**Benefits**:
- Scalable under load
- No timeout issues
- Better user experience

### 2. Event-Driven Processing

**Why**: Decouple request handling from processing

**How**:
- API steps emit events
- Event steps subscribe to topics
- Automatic retry on failure

**Benefits**:
- Resilient to failures
- Easy to add new workflows
- Clear separation of concerns

### 3. State Management for Persistence

**Why**: Need to maintain conversation history and session data

**How**:
- Key-value storage grouped by domain
- Accessible across all steps
- TTL support for cleanup

**Benefits**:
- Maintain context across requests
- Support multi-turn conversations
- Easy debugging and monitoring

### 4. Multi-Agent Orchestration Patterns

**Why**: Complex tasks benefit from specialized agents

**How**:
- Sequential: Linear pipeline
- Parallel: Independent analysis
- Loop: Iterative refinement

**Benefits**:
- Better quality outputs
- Specialized expertise
- Flexible workflows

## Type Safety

All components use TypeScript with Zod validation:

```typescript
// Types defined in src/types/
- agent.types.ts: Agent schemas
- state.types.ts: State structures

// Validation at boundaries
- API requests: Zod schema validation
- Event inputs: Type-safe handlers
- Service calls: TypeScript interfaces
```

## Error Handling

```
API Layer:
→ Zod validation errors → 400 Bad Request
→ System errors → 500 Internal Server Error

Event Layer:
→ Processing errors stored in state
→ Request marked as 'error' status
→ Details available in error field

Service Layer:
→ Try-catch blocks
→ Detailed error messages
→ Stack traces in logs
```

## Monitoring & Observability

Built-in Motia plugins provide:

- **Logs Plugin**: Structured logging
- **Observability Plugin**: Traces and metrics
- **States Plugin**: State inspection
- **Endpoint Plugin**: API documentation

## Scalability Considerations

### Horizontal Scaling
- Stateless API steps
- Event processing can be distributed
- Shared state via Motia's state plugin

### Performance
- Async processing prevents blocking
- Parallel agent execution for speed
- State caching reduces lookups

### Resource Management
- Background tasks don't block HTTP
- Connection pooling to external APIs
- Rate limiting on API calls

## Security

- API key management via environment variables
- Input validation with Zod schemas
- Sandboxed code execution for tools
- No direct user code execution

## Future Enhancements

1. **Streaming Responses**: Real-time token streaming
2. **Tool Marketplace**: Extensible tool system
3. **Multi-Model Support**: OpenAI, Anthropic integration
4. **RAG Integration**: Document retrieval
5. **Voice Capabilities**: Speech-to-text/text-to-speech
6. **Agent Marketplace**: Pre-built agent templates

---

Built with Motia's event-driven architecture for production-grade AI agents.

