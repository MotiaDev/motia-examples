# Harvest Logbook - RAG + Authorization Demo

A hands-on demonstration of building a production-ready **RAG (Retrieval Augmented Generation)** system with **fine-grained authorization** using the Motia framework and SpiceDB.

## 🎯 What This Demo Teaches

![Harvest Logbook - RAG + Authorization Demo](./docs/img/image.png)

This project demonstrates how to:

1. **Build a RAG Pipeline with Motia** - Learn how to implement a complete retrieval-augmented generation system using Motia's event-driven architecture
2. **Add Fine-Grained Authorization** - Implement role-based access control using SpiceDB for multi-tenant data access
3. **Structure Production Services** - Organize services, steps, and middleware in a scalable, maintainable way
4. **Handle Real-World Scenarios** - Support multiple LLM providers, logging backends, and configuration options

### The Use Case

A **harvest logbook system** where farmers can:
- Store harvest data with AI-powered embeddings for semantic search
- Query their historical data using natural language
- Access only the data they have permission to see

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  POST /harvest_logbook                                      │
│  (Store harvest data + optional query)                      │
└─────────┬───────────────────────────────────────────────────┘
          │
          ├─→ Authorization Middleware (SpiceDB)
          │   - Check user has 'edit' permission on farm
          │
          ├─→ ReceiveHarvestData Step (API)
          │   - Validate input
          │   - Emit events
          │
          ├─→ ProcessEmbeddings Step (Event)
          │   - Split text into chunks (400 chars, 40 overlap)
          │   - Generate embeddings (OpenAI)
          │   - Store vectors (Pinecone)
          │
          └─→ QueryAgent Step (Event) [if query provided]
              - Retrieve similar content (Pinecone)
              - Generate response (OpenAI/HuggingFace)
              - Emit logging event
              │
              └─→ LogToSheets Step (Event)
                  - Log query & response (CSV/Sheets)
```

### Authorization Flow

```
User Request (x-user-id header)
    ↓
Authorization Middleware
    ↓
SpiceDB Permission Check
- Does user have 'edit' on farm_1?
- Does user have 'query' on farm_1?
    ↓
✅ Allowed → Process Request
❌ Denied → 403 Forbidden
```

## 📚 Learning Path

Follow these steps to understand the codebase:

### Step 1: Understand the Authorization Schema
📄 **File:** `src/services/harvest-logbook/spicedb.schema`

This defines the permission model:
- Organizations contain farms
- Farms have owners, editors, and viewers
- Each role has different permissions (view, edit, query, manage)

### Step 2: Study the Authorization Service
📄 **File:** `src/services/harvest-logbook/spicedb-service.ts`

Learn how to:
- Initialize SpiceDB client
- Check permissions
- Create/delete relationships

### Step 3: Explore the Authorization Middleware
📄 **File:** `middlewares/authz.middleware.ts`

See how requests are protected:
- Extract user ID from headers
- Determine required permission based on endpoint
- Check permission in SpiceDB
- Allow or deny access

### Step 4: Understand the RAG Pipeline Services
📂 **Directory:** `src/services/harvest-logbook/`

Study each service:
- `text-splitter.ts` - Chunk text for embeddings
- `openai-service.ts` - Generate embeddings
- `pinecone-service.ts` - Store and query vectors
- `openai-chat-service.ts` - Generate AI responses
- `csv-logger.ts` - Log queries (alternative: `sheets-service.ts`)
- `index.ts` - **Main orchestration** - ties everything together

### Step 5: Examine the Motia Steps
📂 **Directory:** `steps/harvest-logbook/`

Understand the flow:
1. `receive-harvest-data.step.ts` - API endpoint (with auth)
2. `process-embeddings.step.ts` - Event handler for embeddings
3. `query-agent.step.ts` - Event handler for RAG queries
4. `log-to-sheets.step.ts` - Event handler for logging
5. `query-only.step.ts` - Separate query-only endpoint

Each `.tsx` file is the UI component for Motia Workbench visualization.

### Step 6: Try the Authorization Scripts
📂 **Directory:** `scripts/`

Run these to see authorization in action:
1. `setup-spicedb-schema.ts` - Initialize SpiceDB schema
2. `verify-spicedb-schema.ts` - Verify schema is correct
3. `create-sample-permissions.ts` - Create users with different roles

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker (for local SpiceDB)
- OpenAI API key
- Pinecone account

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create a `.env` file:

```bash
# OpenAI (Required for embeddings and chat)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Pinecone (Required for vector storage)
PINECONE_API_KEY=pcsk_xxxxxxxxxxxxx
PINECONE_INDEX_HOST=your-index-abc123.svc.us-east-1.pinecone.io

# SpiceDB/SpiceDB (Required for authorization)
SPICEDB_ENDPOINT=localhost:50051
SPICEDB_TOKEN=sometoken

# LLM Configuration (Choose one)
USE_OPENAI_CHAT=true              # Recommended: Use OpenAI for chat
# USE_OPENAI_CHAT=false           # Alternative: Use HuggingFace
# HUGGINGFACE_API_KEY=hf_xxxxxxx # Required if USE_OPENAI_CHAT=false

# Logging Configuration (Choose one)
USE_CSV_LOGGER=true               # Recommended for demos: Local CSV
# USE_CSV_LOGGER=false            # Production: Google Sheets
# GOOGLE_SHEETS_ID=xxxxxxxx       # Required if USE_CSV_LOGGER=false
# GOOGLE_SHEETS_ACCESS_TOKEN=xxx  # Required if USE_CSV_LOGGER=false
```

### 3. Create Pinecone Index

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new index with:
   - **Name:** `harvest-logbook` (or your preference)
   - **Dimensions:** `1536` (for OpenAI embeddings)
   - **Metric:** `cosine`
3. Click your index → **Connect** tab → Copy the **Host**
4. Add to `.env`: `PINECONE_INDEX_HOST=your-host-here`

### 4. Start SpiceDB Locally

```bash
docker run -d \
  --name spicedb \
  -p 50051:50051 \
  spicedb/spicedb serve \
  --grpc-preshared-key "sometoken"
```

### 5. Initialize Authorization

```bash
# Write the authorization schema to SpiceDB
npm run spicedb:setup

# Verify the schema
npm run spicedb:verify

# Create sample users and permissions
npm run spicedb:sample
```

This creates:
- **user_alice** - Farm owner (can view, edit, query, manage)
- **org_1** - Sample organization
- **farm_1** - Sample farm

To create additional users with different roles:

```bash
# Create a viewer (read-only)
npm run spicedb:sample -- --user user_bob --role viewer

# Create an editor
npm run spicedb:sample -- --user user_charlie --role editor
```

### 6. Start the Server

```bash
npm run dev
```

The server starts at `http://localhost:3000`

## 📝 Try It Out

### Test 1: Store Harvest Data (as Alice - Owner)

```bash
curl -X POST http://localhost:3000/harvest_logbook \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_alice" \
  -d '{
    "content": "Harvested 500kg of tomatoes from field A. Weather was sunny, no pest damage observed.",
    "farmId": "farm_1",
    "metadata": {
      "field": "A",
      "crop": "tomatoes",
      "weight_kg": 500
    }
  }'
```

**What happens:**
1. Authorization middleware checks if `user_alice` has `edit` permission on `farm_1` ✅
2. Data is chunked and embedded
3. Vectors stored in Pinecone
4. Response returned

### Test 2: Query the Data (as Alice)

```bash
curl -X POST http://localhost:3000/harvest_logbook/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_alice" \
  -d '{
    "farmId": "farm_1",
    "query": "What crops did we harvest recently?"
  }'
```

**What happens:**
1. Authorization middleware checks if `user_alice` has `query` permission on `farm_1` ✅
2. Query is embedded
3. Similar vectors retrieved from Pinecone
4. AI generates response using context
5. Result is logged to CSV

### Test 3: Try Access as Bob (Viewer - Read-Only)

First, create Bob:
```bash
npm run spicedb:sample -- --user user_bob --role viewer
```

Bob can query:
```bash
curl -X POST http://localhost:3000/harvest_logbook/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_bob" \
  -d '{
    "farmId": "farm_1",
    "query": "What crops did we harvest?"
  }'
```
✅ **Success** - Bob has `query` permission

Bob cannot edit:
```bash
curl -X POST http://localhost:3000/harvest_logbook \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_bob" \
  -d '{
    "content": "New harvest data",
    "farmId": "farm_1"
  }'
```
❌ **403 Forbidden** - Bob lacks `edit` permission

### Test 4: View Logs

```bash
cat logs/harvest_logbook.csv
```

You'll see all queries and responses logged.

## 🗂️ Project Structure

```
harvest-logbook-rag/
├── src/services/harvest-logbook/
│   ├── spicedb.schema              # SpiceDB permission model
│   ├── spicedb-service.ts          # Authorization service
│   ├── types.ts                    # TypeScript type definitions
│   ├── text-splitter.ts            # Text chunking (400/40)
│   ├── openai-service.ts           # Embeddings service
│   ├── openai-chat-service.ts      # OpenAI chat (default)
│   ├── huggingface-service.ts      # HuggingFace chat (alternative)
│   ├── pinecone-service.ts         # Vector storage
│   ├── csv-logger.ts               # CSV logging (default)
│   ├── sheets-service.ts           # Google Sheets (alternative)
│   └── index.ts                    # Main orchestration service
│
├── steps/harvest-logbook/
│   ├── receive-harvest-data.step.ts    # API: POST /harvest_logbook
│   ├── receive-harvest-data.step.tsx   # UI component
│   ├── process-embeddings.step.ts      # Event: Embedding processing
│   ├── process-embeddings.step.tsx     # UI component
│   ├── query-agent.step.ts             # Event: RAG query
│   ├── query-agent.step.tsx            # UI component
│   ├── query-only.step.ts              # API: POST /harvest_logbook/query
│   ├── query-only.step.tsx             # UI component
│   ├── log-to-sheets.step.ts           # Event: Logging
│   └── log-to-sheets.step.tsx          # UI component
│
├── middlewares/
│   ├── authz.middleware.ts         # Authorization middleware
│   └── error-handler.middleware.ts # Error handling
│
├── scripts/
│   ├── setup-spicedb-schema.ts     # Initialize SpiceDB schema
│   ├── verify-spicedb-schema.ts    # Verify schema
│   └── create-sample-permissions.ts # Create users & permissions
│
├── .env                            # Environment variables
├── package.json                    # Dependencies
└── README.md                       # This file
```

## 🔐 Authorization Model

### Resource Hierarchy

```
Organization (org_1)
  ├── admin: user_alice
  ├── member: user_david
  │
  └── Farm (farm_1)
      ├── owner: user_alice      (view, edit, query, manage)
      ├── editor: user_charlie   (view, edit, query)
      └── viewer: user_bob        (view, query)
```

### Permissions Explained

| Permission | Description | Who Has It |
|------------|-------------|------------|
| `view` | View harvest data | Viewer, Editor, Owner, Org Member |
| `edit` | Create new harvest entries | Editor, Owner, Org Member |
| `query` | Execute RAG queries | Viewer, Editor, Owner, Org Member |
| `manage` | Administrative operations | Owner, Org Admin |

### How Authorization Works

1. **User sends request** with `x-user-id` header
2. **Middleware extracts** user ID and farm ID from request
3. **SpiceDB checks** if relationship exists (e.g., user_bob → viewer → farm_1)
4. **Permission computed** based on schema rules
5. **Request allowed or denied** before reaching handler

## 🎨 Motia Workbench

Start the server (`npm run dev`) and open the Motia Workbench in your browser to see:

- 📥 **Receive Harvest Data** - API step with request/response
- 🧬 **Process Embeddings** - Event step showing chunking
- 🤖 **Query Agent** - RAG pipeline with source citations
- 📊 **Log to Sheets** - Logging step with destination
- 🔍 **Query Only** - Separate query endpoint

Each step has a custom UI component (`.tsx` file) for visualization.

## 🔄 Configuration Options

### Switch LLM Provider

**Default: OpenAI (Recommended)**
```bash
USE_OPENAI_CHAT=true
OPENAI_API_KEY=sk-proj-xxxxx
```

**Alternative: HuggingFace**
```bash
USE_OPENAI_CHAT=false
HUGGINGFACE_API_KEY=hf_xxxxx
```

**Code Location:** `src/services/harvest-logbook/index.ts:77`

### Switch Logging Backend

**Default: CSV Logger (Recommended for demos)**
```bash
USE_CSV_LOGGER=true
# Logs saved to: logs/harvest_logbook.csv
```

**Alternative: Google Sheets (Production)**
```bash
USE_CSV_LOGGER=false
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SHEETS_ACCESS_TOKEN=your_oauth_token
```

**Code Location:** `src/services/harvest-logbook/index.ts:135`

## 🐛 Troubleshooting

### Authorization Fails

**Problem:** Getting 403 Forbidden errors

**Solution:**
1. Verify SpiceDB is running: `docker ps | grep spicedb`
2. Check schema is initialized: `npm run spicedb:verify`
3. Verify user has permissions: Check SpiceDB logs or re-run `npm run spicedb:sample`

### Pinecone Connection Error

**Problem:** `fetch failed` when storing embeddings

**Solution:**
1. Verify `PINECONE_INDEX_HOST` is set correctly
2. Get host from Pinecone Console → Your Index → Connect tab
3. Format: `your-index-abc123.svc.region.pinecone.io` (no `https://`)

### Empty Query Results

**Problem:** AI returns "I don't have information about that"

**Solution:**
1. First store some data: `POST /harvest_logbook`
2. Wait a few seconds for embedding processing
3. Then query: `POST /harvest_logbook/query`

### SpiceDB Not Starting

**Problem:** Docker container fails to start

**Solution:**
```bash
# Remove old container
docker rm -f spicedb

# Start fresh
docker run -d \
  --name spicedb \
  -p 50051:50051 \
  spicedb/spicedb serve \
  --grpc-preshared-key "sometoken"
```

## 📖 Key Concepts Demonstrated

### 1. Event-Driven Architecture (Motia)
- API steps handle HTTP requests
- Event steps process background tasks
- Steps communicate via events
- Built-in state management

### 2. Fine-Grained Authorization (SpiceDB)
- Schema defines permission model
- Relationships stored in SpiceDB
- Real-time permission checks
- Supports complex hierarchies

### 3. RAG Pipeline
- Text chunking for better retrieval
- Vector embeddings for semantic search
- Context injection into LLM prompts
- Source citation in responses

### 4. Production Patterns
- Singleton service instances
- Environment-based configuration
- Middleware for cross-cutting concerns
- Error handling and validation

## 🤝 Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Generate TypeScript types
npm run generate-types

# Build for production
npm run build

# Clean all generated files
npm run clean

# Authorization commands
npm run spicedb:setup    # Initialize schema
npm run spicedb:verify   # Verify schema
npm run spicedb:sample   # Create sample users
```

## 📚 Additional Resources

- [Motia Documentation](https://motia.dev/docs)
- [SpiceDB Documentation](https://docs.spicedb.com/)
- [SpiceDB Playground](https://play.spicedb.com/)
- [OpenAI API](https://platform.openai.com/docs)
- [Pinecone Docs](https://docs.pinecone.io/)

## 🎓 Learning Exercises

Try these to deepen your understanding:

1. **Add a new role** - Create a "manager" role with custom permissions
2. **Add a new resource** - Support "fields" within farms with separate permissions
3. **Implement caching** - Cache permission checks for performance
4. **Add audit logs** - Log all authorization decisions
5. **Multi-tenancy** - Support multiple organizations with isolated data

---

**Built with ❤️ using Motia and SpiceDB** - A teaching demo for RAG + Authorization
