# Public Form Auto Triage Workflow

A Motia workflow that implements intelligent form triage using RAG (Retrieval Augmented Generation) with vector similarity search and LLM processing.

![Workflow Diagram](./docs/img/workflow.png)

## Overview

This workflow processes public form submissions through an automated triage system that:
1. Receives form submissions via webhook
2. Processes and embeds text content
3. Stores vectors in Supabase for similarity search
4. Uses RAG with Claude AI to generate intelligent triage responses
5. Logs results to Google Sheets
6. Sends error alerts to Slack when issues occur

## Architecture

### Workflow Steps

```
┌─────────────────┐
│ Webhook Trigger │ (API)
│  POST /public-  │
│  form-auto-     │
│  triage         │
└────────┬────────┘
         │ emits: form.submitted
         ▼
┌─────────────────┐
│  Process Text   │ (Event)
│  - Split text   │
│  - Generate     │
│    embeddings   │
│  - Store in     │
│    Supabase     │
└────────┬────────┘
         │ emits: text.processed
         ▼
┌─────────────────┐
│   RAG Agent     │ (Event)
│  - Query vectors│
│  - Generate AI  │
│    response     │
└────────┬────────┘
         │ Success: processing.complete
         │ Error: processing.failed
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│ Log to │  │ Slack  │
│ Sheets │  │ Alert  │
└────────┘  └────────┘
```

### Event Flow

- **form.submitted**: Triggered when webhook receives form data
- **text.processed**: Triggered after text is split and embedded
- **processing.complete**: Triggered when RAG processing succeeds
- **processing.failed**: Triggered on any processing error

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file with the following variables:

```env
# Cohere API Configuration
COHERE_API_KEY=your_cohere_api_key

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google Sheets Configuration
GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email
GOOGLE_SHEETS_PRIVATE_KEY=your_private_key
GOOGLE_SHEET_ID=your_sheet_id

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_ALERT_CHANNEL=#alerts
```

### 3. Supabase Setup

Run the following SQL in your Supabase SQL editor to set up the vector store:

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the vector store table
CREATE TABLE IF NOT EXISTS public_form_auto_triage (
  id BIGSERIAL PRIMARY KEY,
  content TEXT,
  embedding VECTOR(1024),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the matching function for similarity search
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1024),
  match_threshold FLOAT,
  match_count INT,
  index_name TEXT DEFAULT 'public_form_auto_triage'
)
RETURNS TABLE (
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  EXECUTE format(
    'SELECT content, 1 - (embedding <=> $1) AS similarity, metadata
     FROM %I
     WHERE 1 - (embedding <=> $1) > $2
     ORDER BY embedding <=> $1
     LIMIT $3',
    index_name
  )
  USING query_embedding, match_threshold, match_count;
END;
$$;

-- Create index for faster similarity search
CREATE INDEX ON public_form_auto_triage USING ivfflat (embedding vector_cosine_ops);
```

### 4. Google Sheets Setup

1. Create a new Google Sheet
2. Create a sheet named "Log" (or update the sheet name in the code)
3. Add headers: `Timestamp`, `Status`, `Input`, `Additional Data`
4. Create a Google Cloud Service Account and download credentials
5. Share the sheet with the service account email

### 5. Slack Setup

1. Create a Slack App in your workspace
2. Add the `chat:write` bot scope
3. Install the app to your workspace
4. Copy the Bot User OAuth Token
5. Invite the bot to your alerts channel

## Running the Workflow

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## API Usage

### Submit Form

```bash
POST /public-form-auto-triage
Content-Type: application/json

{
  "content": "I need help with my account access. I can't log in and have tried resetting my password multiple times.",
  "metadata": {
    "source": "contact-form",
    "page": "/support"
  },
  "userInfo": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Response

```json
{
  "success": true,
  "message": "Form submitted successfully and queued for processing",
  "requestId": "req_1234567890_abc123"
}
```

## State Management

The workflow uses Motia's state management to store data across steps:

- **form-submissions**: Raw form submissions indexed by requestId
- **processed-texts**: Processing results (chunk counts, embeddings)
- **triage-results**: Final RAG responses with metadata
- **alert-history**: Error alert history

## Services

### Cohere Service (`services/cohere.service.ts`)
- Text splitting with configurable chunk size and overlap
- Embedding generation using Cohere's embed-english-v3.0 model

### Supabase Service (`services/supabase.service.ts`)
- Vector storage and retrieval
- Similarity search using cosine distance

### Anthropic Service (`services/anthropic.service.ts`)
- RAG response generation using Claude
- Conversation history support
- Context-aware responses

### Google Sheets Service (`services/sheets.service.ts`)
- Logging triage results
- Batch operations support

### Slack Service (`services/slack.service.ts`)
- Error alerts with formatted messages
- Success notifications

## Error Handling

The workflow implements comprehensive error handling:

1. **Input Validation**: Zod schemas validate all inputs
2. **Error Propagation**: Errors emit `processing.failed` events
3. **Slack Alerts**: Automatic notifications for failures
4. **Graceful Degradation**: Logging/alert failures don't crash the workflow
5. **State Preservation**: Failed requests remain in state for debugging

## Monitoring

Monitor your workflow through:

1. **Motia Workbench**: Visual flow representation
2. **Logs**: Structured logging at each step
3. **State**: Inspect stored data using state manager
4. **Google Sheets**: Historical log of all processed requests
5. **Slack**: Real-time error notifications

## Customization

### Adjust Text Chunking

Modify `services/cohere.service.ts`:

```typescript
export function splitText(text: string, chunkSize: number = 400, overlap: number = 40)
```

### Change Embedding Model

Update `services/cohere.service.ts`:

```typescript
model: 'embed-english-v3.0'  // Change to other Cohere models
```

### Customize RAG Prompt

Edit `steps/ragAgent/ragAgent.step.ts`:

```typescript
const systemMessage = 'Your custom system prompt here';
```

### Modify Similarity Threshold

Update `services/supabase.service.ts`:

```typescript
match_threshold: 0.7  // Adjust between 0 and 1
```

## Troubleshooting

### Vectors not being stored
- Check Supabase connection and credentials
- Verify table and function creation
- Check embedding dimensions match (1024 for Cohere v3)

### RAG responses are poor quality
- Increase chunk overlap for better context
- Adjust similarity threshold
- Add more diverse training documents
- Refine system prompt

### Slack alerts not sending
- Verify bot token and scopes
- Check channel name includes #
- Ensure bot is invited to channel

### Google Sheets logging fails
- Verify service account credentials
- Check sheet is shared with service account
- Confirm sheet name matches code

## License

MIT

