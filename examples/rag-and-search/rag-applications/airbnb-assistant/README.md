# Airbnb Guest Assistant

An AI-powered guest assistant for Airbnb properties built with **Motia**, featuring RAG (Retrieval-Augmented Generation) capabilities, conversation history tracking in **Notion**, and local search functionality.

![workbench](./docs/img/workbench.png)

## Features

- **Smart Chat API**: RESTful endpoint for guest queries using RAG architecture
- **Vector Search**: Pinecone integration for semantic search of property information
- **Conversation History**: Stores all interactions in Notion database (replaces Google Sheets)
- **Local Search**: SerpAPI integration for restaurant/attraction recommendations
- **Document Processing**: API to ingest property manuals and FAQs into vector database
- **Beautiful Workbench**: Custom UI components for workflow visualization

## Architecture

Built following Domain-Driven Design principles:

```
/steps                    # Motia steps (Controllers)
  /guest-assistant        # Main workflow steps
    - chat.step.ts        # Main chat API endpoint
    - save-conversation.step.ts  # Event step to save to Notion
    - load-documents.step.ts     # API to load documents
    - *.step.tsx          # UI components for Workbench

/src
  /services               # Business logic layer
    /openai               # OpenAI integration
    /pinecone             # Vector database operations
    /notion               # Conversation storage (replaces Google Sheets)
    /serp                 # Web search capabilities
  /repositories           # Data access layer (future use)
  /utils                  # Utility functions
```

## Tech Stack

- **Motia**: Workflow orchestration framework
- **OpenAI**: GPT-4 for chat, text-embedding-3-small for vectors
- **Pinecone**: Vector database for semantic search
- **Notion**: Conversation history storage (modern alternative to Google Sheets)
- **SerpAPI**: Local search and recommendations
- **TypeScript**: Type-safe development
- **Zod**: Schema validation

## Prerequisites

1. **Node.js** 18+ installed
2. **API Keys** for:
   - OpenAI
   - Pinecone (with serverless index)
   - Notion (integration + database)
   - SerpAPI

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Pinecone Configuration
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=airbnb-assistant

# Notion Configuration
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=...

# SerpAPI Configuration
SERPAPI_KEY=...
```

### 3. Set Up Notion Database

Create a Notion database with these properties:

| Property Name | Type | Options |
|--------------|------|---------|
| Session ID | Title | - |
| User ID | Text | - |
| Role | Select | Options: `user`, `assistant` |
| Content | Text | - |
| Timestamp | Date | Include time |

Share the database with your Notion integration and copy the database ID to `.env`.

### 4. Set Up Pinecone Index

Create a Pinecone serverless index:

```bash
# Index configuration:
- Name: airbnb-assistant
- Dimensions: 1536 (for text-embedding-3-small)
- Metric: cosine
- Cloud: AWS
- Region: us-east-1
```

### 5. Load Property Data

Use the document loader API to add property information:

```bash
curl -X POST http://localhost:3000/load-documents \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Check-in time is at 2 PM. The access code is 5555.",
    "metadata": {
      "category": "check-in",
      "source": "property-manual"
    }
  }'
```

## Usage

### Start Development Server

```bash
npm run dev
```

This starts the Motia server and opens the Workbench at `http://localhost:3000`.

### API Endpoints

#### Chat Endpoint

```bash
POST /chat
```

**Request:**
```json
{
  "message": "What time is check-in?",
  "sessionId": "optional-session-id",
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "response": "Check-in time is at 2 PM. Your access code is 5555. 😊",
  "sessionId": "abc123xyz",
  "sources": [
    {
      "type": "vector",
      "content": "Check-in time is at 2 PM. The access code is 5555.",
      "score": 0.95
    }
  ]
}
```

#### Load Documents

```bash
POST /load-documents
```

**Request:**
```json
{
  "content": "Your property information text here...",
  "metadata": {
    "source": "house-manual",
    "category": "amenities"
  },
  "chunkSize": 500,
  "chunkOverlap": 50
}
```

**Response:**
```json
{
  "chunksProcessed": 12,
  "success": true
}
```

## Workflow

The Airbnb Guest Assistant follows this flow:

1. **User sends message** → Chat API endpoint (`/chat`)
2. **Search vector DB** → Pinecone retrieves relevant property info
3. **Check for local queries** → SerpAPI searches if asking about restaurants/attractions
4. **Get conversation history** → Notion provides recent messages for context
5. **Generate response** → OpenAI GPT-4 creates contextual answer
6. **Save conversation** → Event step stores messages in Notion (async)
7. **Return response** → User receives helpful answer

## Customization

### Adding Property Information

Edit property data and load via API, or create a script:

```typescript
// src/utils/seed-data.ts
import { pineconeService } from '../services/pinecone'

const propertyData = [
  {
    text: "WiFi password is Welcome2024!",
    metadata: { category: "wifi" }
  }
]

async function seed() {
  const texts = propertyData.map(d => d.text)
  const metadata = propertyData.map(d => d.metadata)
  await pineconeService.insertVectors(texts, metadata)
}

seed()
```

### Modifying AI Behavior

Edit the `SYSTEM_PROMPT` in `/steps/guest-assistant/chat.step.ts` to change:
- Tone and personality
- Response guidelines
- Safety guardrails
- Amenity links

### Adding New Steps

Follow Motia conventions:

1. Create file: `steps/my-flow/my-step.step.ts`
2. Export `config` and `handler`
3. Add UI override: `steps/my-flow/my-step.step.tsx`
4. Use `flows` property to connect in Workbench

## Deployment

```bash
npm run build
npm run deploy
```

## Monitoring

- View all conversations in your Notion database
- Monitor API requests in Motia Workbench
- Check logs for errors and performance metrics

## Why Notion over Google Sheets?

- **Better API**: Native TypeScript support, cleaner interface
- **Rich Content**: Support for long text, formatting, relations
- **Real-time Collaboration**: Team can view/analyze conversations live
- **Scalability**: Handles thousands of conversations efficiently
- **Modern UX**: Beautiful interface for reviewing guest interactions

## Troubleshooting

### Pinecone Connection Issues
- Verify index exists and has correct dimensions (1536)
- Check API key and environment settings
- Ensure serverless mode matches your configuration

### Notion Integration Not Working
- Confirm integration has access to your database
- Verify database ID is correct (from database URL)
- Check property names match exactly (case-sensitive)

### OpenAI Rate Limits
- Implement exponential backoff in production
- Consider using GPT-3.5-turbo for faster/cheaper responses
- Monitor token usage in OpenAI dashboard
