# Motia Example Application Structure Guide

This document explains the architecture, patterns, and structure used in Motia example applications. Use this as a reference for creating new examples or understanding existing ones.

## Table of Contents

1. [Overview](#overview)
2. [Standard Directory Structure](#standard-directory-structure)
3. [Core Components](#core-components)
4. [Design Patterns](#design-patterns)
5. [Step-by-Step Creation Guide](#step-by-step-creation-guide)
6. [Best Practices](#best-practices)
7. [Prompt Templates for Building New Examples](#prompt-templates-for-building-new-examples)

---

## Overview

Motia examples follow an **event-driven, microservices-style architecture** where:

- **Steps** (event handlers) are isolated, single-purpose units
- Communication happens via **events** (pub/sub topics)
- **Services** encapsulate business logic and external integrations
- **State** is trace-scoped and persistent across workflow steps
- **Type safety** is enforced via Zod schemas and auto-generated TypeScript types

### Key Principles

1. **Separation of Concerns**: Steps handle orchestration, services handle logic
2. **Event-Driven**: Loose coupling via publish/subscribe
3. **Parallel Execution**: Steps subscribing to the same event run concurrently
4. **Type Safety**: Runtime validation + compile-time types
5. **Testability**: Services can be mocked via ServiceFactory

---

## Standard Directory Structure

Every Motia example follows this structure:

```
example-name/
├── package.json              # Dependencies, scripts, project metadata
├── tsconfig.json             # TypeScript configuration (ES2020, ESNext modules)
├── types.d.ts                # Auto-generated type definitions (DO NOT EDIT)
├── .gitignore                # Ignores node_modules, .env, dist, etc.
├── .env.example              # Template for required environment variables
├── README.md                 # Documentation (architecture, setup, deployment)
├── motia-workbench.json      # Visual workflow editor configuration
│
├── steps/                    # Workflow steps (event handlers)
│   ├── entry-point.step.ts   # API or event entry point
│   ├── process-*.step.ts     # Processing steps
│   ├── coordinator.step.ts   # Combines parallel results (optional)
│   ├── save-*.step.ts        # Persistence steps
│   └── result-*.step.ts      # Result retrieval endpoints
│
├── services/                 # Business logic layer
│   ├── ServiceFactory.ts     # Dependency injection container
│   ├── StateService.ts       # State management wrapper
│   └── *Service.ts           # Domain-specific services
│
├── docs/                     # Documentation assets
│   ├── *.png                 # Architecture diagrams
│   └── *.gif                 # Demo animations
│
└── .mermaid/                 # Workflow visualizations (optional)
    └── *.mmd                 # Mermaid diagram files
```

---

## Core Components

### 1. Package.json

**Standard Scripts** (consistent across all examples):

```json
{
  "name": "example-name",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "postinstall": "motia install",
    "dev": "motia dev",
    "dev:debug": "motia dev --verbose",
    "generate-types": "motia generate-types",
    "build": "motia build",
    "clean": "rm -rf dist node_modules python_modules .motia .mermaid"
  },
  "dependencies": {
    "motia": "^0.5.x",
    "zod": "^3.x",
    "dotenv": "^16.x",
    "react": "^19.x",
    "typescript": "^5.x"
    // Domain-specific dependencies
  }
}
```

### 2. Steps (Event Handlers)

Steps are the **core building blocks** of Motia workflows. Each step file exports:

#### Step Anatomy

```typescript
import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

// 1. INPUT VALIDATION SCHEMA
const inputSchema = z.object({
  query: z.string().min(1),
  options: z.object({}).optional()
});

// 2. STEP CONFIGURATION
export const config: EventConfig = {
  type: 'api',              // 'event' | 'api' | 'cron'
  name: 'QueryAPI',         // Unique identifier
  route: 'POST /query',     // For API type only
  subscribes: ['event.topic'], // For event type only
  emits: ['query.received'], // Events this step publishes
  input: inputSchema,       // Zod validation schema
  flows: ['main-workflow'], // Workflow grouping
  description: 'Entry point for user queries'
};

// 3. HANDLER FUNCTION
export const handler: Handlers['QueryAPI'] = async (input, context) => {
  const { logger, emit, state, traceId } = context;

  try {
    // Business logic
    logger.info('Processing query', { query: input.query });

    // Store in state
    await state.set('query', input.query);

    // Emit event to trigger next steps
    await emit('query.received', { query: input.query });

    // Return response (for API steps)
    return { traceId };
  } catch (error) {
    logger.error('Query failed', { error });
    throw error;
  }
};
```

#### Step Types

| Type | Purpose | Returns | Example Use Case |
|------|---------|---------|------------------|
| `api` | HTTP endpoint | Response to client | Query submission, result retrieval |
| `event` | Event subscriber | Nothing (emits events) | Data processing, analysis |
| `cron` | Scheduled task | Nothing | Periodic cleanup, data refresh |

### 3. Services

Services encapsulate **business logic** and **external integrations**.

#### ServiceFactory Pattern

```typescript
// ServiceFactory.ts
import type StateService from './StateService';

export class ServiceFactory {
  private static instances: Map<string, any> = new Map();

  static getStateService(traceId?: string): StateService {
    const key = `state-${traceId || 'default'}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new StateService(traceId));
    }
    return this.instances.get(key);
  }

  static getDataService(): DataService {
    if (!this.instances.has('data')) {
      this.instances.set('data', new DataService());
    }
    return this.instances.get('data');
  }

  // Add more service getters as needed
}
```

#### Service Example

```typescript
// FinanceDataService.ts
import axios from 'axios';

export class FinanceDataService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
  }

  async getStockData(symbol: string) {
    try {
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol,
          apikey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  }

  extractSymbols(query: string): string[] {
    // Extract stock symbols from natural language
    const regex = /\b[A-Z]{1,5}\b/g;
    return query.match(regex) || [];
  }
}
```

#### StateService Wrapper

```typescript
// StateService.ts
import { state } from 'motia';

export class StateService {
  private traceId?: string;

  constructor(traceId?: string) {
    this.traceId = traceId;
  }

  async get<T>(key: string): Promise<T | null> {
    return await state.get<T>(key, this.traceId);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await state.set(key, value, this.traceId);
  }

  async delete(key: string): Promise<void> {
    await state.delete(key, this.traceId);
  }

  async clear(): Promise<void> {
    await state.clear(this.traceId);
  }
}
```

### 4. Configuration Files

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "jsx": "react-jsx",
    "moduleResolution": "node",
    "allowJs": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "./dist"
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

#### .env.example

```bash
# API Keys
OPENAI_API_KEY=your_openai_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
SERPER_API_KEY=your_serper_key

# Optional Configuration
LOG_LEVEL=info
PORT=3000
```

#### .gitignore

```
node_modules/
dist/
.env
.DS_Store
*.log
.motia/
python_modules/
types.d.ts
```

---

## Design Patterns

### 1. Event-Driven Architecture

**Steps communicate via events**, not direct calls.

```typescript
// Step 1: Entry point
export const handler: Handlers['QueryAPI'] = async (input, context) => {
  await context.emit('query.received', { query: input.query });
  return { traceId: context.traceId };
};

// Step 2: Subscribes to event
export const config: EventConfig = {
  type: 'event',
  name: 'ProcessQuery',
  subscribes: ['query.received'], // Listens for this event
  emits: ['query.processed']
};
```

### 2. Parallel Execution Pattern

Multiple steps can subscribe to the same event and **run concurrently**.

```typescript
// Both run in parallel when 'query.received' is emitted
// web-search.step.ts
export const config: EventConfig = {
  subscribes: ['query.received'],
  emits: ['web.search.completed']
};

// finance-data.step.ts
export const config: EventConfig = {
  subscribes: ['query.received'],
  emits: ['finance.data.completed']
};
```

### 3. Coordinator Pattern

A step waits for **multiple events** before proceeding.

```typescript
// response-coordinator.step.ts
export const config: EventConfig = {
  type: 'event',
  name: 'ResponseCoordinator',
  subscribes: ['web.search.completed', 'finance.data.completed'], // Waits for both
  emits: ['response.completed']
};

export const handler: Handlers['ResponseCoordinator'] = async (input, context) => {
  const { state } = context;

  // Retrieve results from both parallel steps
  const webResults = await state.get('webSearchResults');
  const financeResults = await state.get('financeData');

  // Combine and process
  const combinedResults = {
    web: webResults,
    finance: financeResults
  };

  await state.set('combinedResults', combinedResults);
  await context.emit('response.completed', combinedResults);
};
```

### 4. API Request-Response Pattern

**POST endpoint** submits query, returns trace ID.
**GET endpoint** retrieves results by trace ID.

```typescript
// query-api.step.ts (POST)
export const config: EventConfig = {
  type: 'api',
  route: 'POST /finance-query'
};
export const handler: Handlers['FinanceQueryAPI'] = async (input, context) => {
  await context.emit('query.received', input);
  return { traceId: context.traceId };
};

// result-api.step.ts (GET)
export const config: EventConfig = {
  type: 'api',
  route: 'GET /finance-result/:traceId'
};
export const handler: Handlers['FinanceResultAPI'] = async (input, context) => {
  const results = await context.state.get('finalResults', input.traceId);
  if (!results) return { error: 'Not found' };
  return results;
};
```

### 5. Service Layer Pattern

**Encapsulate external APIs** and business logic in services.

```typescript
// In step file
import { ServiceFactory } from '../services/ServiceFactory';

export const handler: Handlers['FetchData'] = async (input, context) => {
  const dataService = ServiceFactory.getDataService();
  const results = await dataService.fetchData(input.query);
  await context.state.set('data', results);
};
```

### 6. Error Handling Pattern

**Try-catch** in all handlers, emit error events.

```typescript
export const handler: Handlers['ProcessData'] = async (input, context) => {
  try {
    const result = await processData(input);
    await context.emit('processing.completed', result);
  } catch (error) {
    context.logger.error('Processing failed', { error });
    await context.emit('processing.failed', { error: error.message });
    throw error; // Re-throw for Motia error handling
  }
};
```

---

## Step-by-Step Creation Guide

### Phase 1: Project Setup

1. **Create directory structure**:
   ```bash
   mkdir example-name
   cd example-name
   mkdir steps services docs .mermaid
   ```

2. **Initialize package.json**:
   ```bash
   npm init -y
   npm install motia zod dotenv typescript react ts-node
   ```

3. **Add standard scripts** to package.json (see [Package.json](#1-packagejson))

4. **Create tsconfig.json** (see [Configuration Files](#4-configuration-files))

5. **Create .env.example** with required API keys

6. **Create .gitignore** (see [Configuration Files](#4-configuration-files))

### Phase 2: Define Workflow

1. **Identify the workflow stages**:
   - Entry point (API or event trigger)
   - Processing steps (can be parallel)
   - Coordination (if parallel steps exist)
   - Output/storage
   - Result retrieval

2. **Map out events**:
   ```
   POST /query → emit('query.received')
   ├─→ web-search → emit('web.search.completed')
   └─→ finance-data → emit('finance.data.completed')
       ↓
   coordinator (waits for both) → emit('response.completed')
       ↓
   analysis → emit('analysis.completed')
       ↓
   save-result

   GET /result/:traceId → retrieve from state
   ```

3. **Create Mermaid diagram** (optional):
   ```mermaid
   graph TD
     A[POST /query] -->|emit query.received| B[Web Search]
     A -->|emit query.received| C[Finance Data]
     B -->|emit web.completed| D[Coordinator]
     C -->|emit finance.completed| D
     D -->|emit response.completed| E[Analysis]
     E -->|emit analysis.completed| F[Save Result]
     G[GET /result/:traceId] --> F
   ```

### Phase 3: Create Services

1. **Create ServiceFactory.ts** (see [ServiceFactory Pattern](#servicefactory-pattern))

2. **Create StateService.ts** (see [StateService Wrapper](#stateservice-wrapper))

3. **Create domain-specific services**:
   - Identify external APIs needed
   - Create service class for each integration
   - Add methods for data fetching/processing
   - Add to ServiceFactory

### Phase 4: Implement Steps

For each step in the workflow:

1. **Create step file** (`steps/stepname.step.ts`)

2. **Define input schema** with Zod:
   ```typescript
   const inputSchema = z.object({
     query: z.string(),
     options: z.object({}).optional()
   });
   ```

3. **Configure step** (type, name, route/subscribes, emits):
   ```typescript
   export const config: EventConfig = {
     type: 'api',
     name: 'StepName',
     route: 'POST /endpoint',
     emits: ['event.name'],
     input: inputSchema
   };
   ```

4. **Implement handler**:
   ```typescript
   export const handler: Handlers['StepName'] = async (input, context) => {
     const { logger, emit, state, traceId } = context;
     try {
       // 1. Get services
       const service = ServiceFactory.getService();

       // 2. Process data
       const result = await service.process(input);

       // 3. Store in state
       await state.set('key', result);

       // 4. Emit event
       await emit('next.event', result);

       // 5. Return (for API steps)
       return { success: true };
     } catch (error) {
       logger.error('Error', { error });
       throw error;
     }
   };
   ```

5. **Generate types**:
   ```bash
   npm run generate-types
   ```

### Phase 5: Testing & Documentation

1. **Create README.md** with:
   - Overview and architecture diagram
   - Prerequisites (API keys, etc.)
   - Installation steps
   - Usage examples (API calls with curl/fetch)
   - Deployment instructions

2. **Test workflow**:
   ```bash
   npm run dev
   # Test API endpoints with curl or Postman
   # Monitor Workbench at http://localhost:3000
   ```

3. **Add documentation assets** (diagrams, GIFs)

4. **Update motia-workbench.json** with visual layout

---

## Best Practices

### Step Design

- **Single Responsibility**: Each step does ONE thing well
- **Idempotent**: Steps should be safe to retry
- **Stateless Logic**: All state goes in StateService, not in memory
- **Clear Naming**: Use descriptive names (`fetch-user-data.step.ts`, not `step1.step.ts`)

### Service Design

- **Encapsulation**: Hide implementation details
- **Error Handling**: Throw meaningful errors, don't swallow them
- **Configuration**: Use environment variables for API keys/URLs
- **Testability**: Make services mockable via ServiceFactory

### State Management

- **Trace-Scoped**: Always use trace ID to isolate request data
- **Clear Keys**: Use descriptive keys (`financeData`, not `data`)
- **Cleanup**: Clear state when done if needed
- **Structured Data**: Store objects, not strings when possible

### Error Handling

- **Try-Catch All Handlers**: Prevent unhandled rejections
- **Log Errors**: Use `context.logger.error()` with details
- **Emit Error Events**: Allow other steps to react
- **Graceful Degradation**: Provide fallbacks when possible

### Type Safety

- **Zod Schemas**: Define for all inputs
- **Generate Types**: Run `motia generate-types` after config changes
- **Use Generated Types**: `Handlers['StepName']` ensures type safety
- **Strict TypeScript**: Enable all strict compiler options

### Documentation

- **Code Comments**: Explain WHY, not WHAT
- **README Structure**: Overview → Setup → Usage → Deployment
- **API Examples**: Provide curl/fetch examples
- **Architecture Diagrams**: Visual workflow representation

---

## Prompt Templates for Building New Examples

Use these templates when instructing an AI to build a new Motia example.

### Template 1: New Example from Scratch

```
Create a new Motia example application for [DOMAIN/USE CASE].

Requirements:
- Use event-driven architecture with Motia framework
- Integrate with [API 1], [API 2], [API 3]
- Implement the following workflow:
  1. [Entry point description]
  2. [Processing step 1]
  3. [Processing step 2] (runs in parallel with step 2)
  4. [Coordination step]
  5. [Final processing]
  6. [Result retrieval]

Follow the standard Motia example structure:
- Create steps/ directory with event handlers
- Create services/ directory with ServiceFactory, StateService, and [DomainService]
- Use Zod for input validation
- Implement error handling with try-catch
- Create comprehensive README with architecture diagram

Events to emit:
- query.received (entry point)
- [domain].processing
- [domain].completed
- results.ready

API endpoints:
- POST /[domain]-query (submit query, returns traceId)
- GET /[domain]-result/:traceId (retrieve results)

Required environment variables:
- [API_KEY_1]
- [API_KEY_2]
```

### Template 2: Add Feature to Existing Example

```
Add a new feature to the [EXAMPLE NAME] example that [FEATURE DESCRIPTION].

Current workflow:
[Describe current workflow]

New workflow should:
1. [New step or modification]
2. [Integration point with existing workflow]
3. [New events to emit/subscribe to]

Implementation requirements:
- Create new step file: steps/[feature-name].step.ts
- Create new service: services/[FeatureName]Service.ts
- Add service to ServiceFactory
- Subscribe to: [existing.event]
- Emit: [new.event.name]
- Update README with new API endpoint/functionality

Maintain existing architecture patterns:
- Use StateService for state management
- Use Zod for input validation
- Follow error handling patterns
- Keep steps single-purpose and focused
```

### Template 3: Create Parallel Processing Steps

```
Create parallel processing steps for [DOMAIN] that:

1. Listen to the same event: [trigger.event]
2. Run concurrently:
   - Step A: [Description of step A]
   - Step B: [Description of step B]
   - Step C: [Description of step C]
3. Each step emits completion event:
   - [stepA.completed]
   - [stepB.completed]
   - [stepC.completed]
4. Create coordinator step that:
   - Subscribes to ALL completion events
   - Waits for all to complete
   - Combines results
   - Emits [combined.results.ready]

Services needed:
- [ServiceA] for step A logic
- [ServiceB] for step B logic
- [ServiceC] for step C logic

State keys:
- stepAResults
- stepBResults
- stepCResults
- combinedResults
```

### Template 4: Add External API Integration

```
Integrate [API NAME] into the [EXAMPLE NAME] example.

API Details:
- Base URL: [url]
- Authentication: [method]
- Endpoints needed: [list endpoints]
- Rate limits: [if any]

Implementation:
1. Create services/[ApiName]Service.ts with:
   - Constructor that loads API key from env
   - Method for each API endpoint
   - Error handling with fallbacks
   - Response parsing/transformation

2. Update ServiceFactory to include new service

3. Create or update step that uses this service:
   - Step name: [step-name].step.ts
   - Subscribes to: [event]
   - Calls [ApiName]Service methods
   - Stores results in state
   - Emits: [completion.event]

4. Add environment variable:
   - [API_KEY_NAME] to .env.example

5. Update README with:
   - API key setup instructions
   - Link to API documentation
```

### Template 5: Create Coordinator Step

```
Create a coordinator step that combines results from parallel processing.

Requirements:
- Name: [CoordinatorName]
- Subscribes to: [[event1], [event2], [event3]]
- Waits for ALL events before proceeding
- Retrieves from state:
  - [stateKey1] from event1
  - [stateKey2] from event2
  - [stateKey3] from event3
- Combines results into structure:
  {
    [key1]: [data from event1],
    [key2]: [data from event2],
    [key3]: [data from event3],
    metadata: { timestamp, count, etc }
  }
- Stores combined results in state as: [combinedResultsKey]
- Emits: [coordination.completed]

Error handling:
- Check if any results are missing
- Log warnings for partial data
- Include error information in combined results
```

---

## Example Application Ideas

Use the patterns above to build:

1. **Research Assistant**: Web search + academic papers + AI summarization
2. **E-commerce Price Tracker**: Multiple retailers + price comparison + alerts
3. **Social Media Analyzer**: Twitter + Reddit + sentiment analysis
4. **Travel Planner**: Flights + hotels + activities + itinerary generation
5. **Health Tracker**: Wearables + nutrition + AI recommendations
6. **Code Review Bot**: GitHub + static analysis + AI suggestions
7. **News Aggregator**: Multiple sources + categorization + personalization
8. **Job Search Helper**: Job boards + company research + resume matching
9. **Real Estate Analyzer**: Listings + market data + neighborhood info
10. **Content Creator Assistant**: Topic research + outline generation + SEO analysis

---

## Conclusion

This structure guide provides a comprehensive framework for understanding and building Motia example applications. By following these patterns, you can create robust, maintainable, and scalable event-driven workflows.

**Key Takeaways**:

- Event-driven architecture enables loose coupling and parallel execution
- Services encapsulate business logic and external integrations
- Steps orchestrate workflows via pub/sub events
- Type safety via Zod + auto-generated types
- Standard structure makes examples consistent and predictable

For questions or contributions, refer to the Motia documentation or existing examples in this repository.
