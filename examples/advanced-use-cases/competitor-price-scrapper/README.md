# Competitor Price Scraper Workflow

A Motia workflow that implements a full RAG (Retrieval-Augmented Generation) system for analyzing competitor pricing data.

![Competitor Price Scraper Workflow](./docs/img/workbench.png)

![Competitor Price Scraper endpoint](./docs/img/endpoint.png)

## Architecture

```
[Webhook API] → [Text Processor] → [Embeddings Generator]
                                           ↓
              [RAG Agent] ← [Vector Store (Supabase)]
                   ↓
           [Google Sheets Logger]
                   ↓ (on error)
           [Slack Alert]
```

## Features

- **Webhook Endpoint**: Receives competitor pricing data via HTTP POST
- **Text Processing**: Chunks data with configurable size and overlap
- **Embeddings**: Generates embeddings using OpenAI's text-embedding-3-small
- **Vector Storage**: Stores and queries embeddings in Supabase with pgvector
- **RAG Analysis**: Uses Anthropic Claude for intelligent price analysis
- **Window Memory**: Maintains conversation context across analyses
- **Google Sheets Logging**: Optional logging of analysis results
- **Error Handling**: Slack notifications for workflow errors

## Setup

### 1. Environment Variables

Create a `.env` file with the following variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Sheets Configuration (optional if ENABLE_SHEETS_LOGGING=false)
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token

# Feature Flags
ENABLE_SHEETS_LOGGING=false  # Set to true to enable Google Sheets logging
```

### 2. Supabase Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the vector table
CREATE TABLE IF NOT EXISTS competitor_price_scraper (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for similarity search
CREATE INDEX IF NOT EXISTS competitor_price_scraper_embedding_idx 
ON competitor_price_scraper 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create RPC function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  table_name text
)
RETURNS TABLE (
  id text,
  content text,
  embedding vector(1536),
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    SELECT 
      id,
      content,
      embedding,
      metadata,
      1 - (embedding <=> %L) as similarity
    FROM %I
    WHERE 1 - (embedding <=> %L) > %L
    ORDER BY embedding <=> %L
    LIMIT %L
  ', query_embedding, table_name, query_embedding, match_threshold, query_embedding, match_count);
END;
$$;
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Workflow

```bash
npm run dev
```

## API Usage

### Webhook Endpoint

Send competitor price data to the webhook:

```bash
POST /competitor-price-scraper

# With structured data
{
  "competitorName": "Competitor A",
  "products": [
    {
      "name": "Product 1",
      "price": 99.99,
      "currency": "USD",
      "url": "https://competitor.com/product1"
    }
  ],
  "timestamp": "2024-01-20T10:00:00Z"
}

# With raw data
{
  "competitorName": "Competitor B",
  "rawData": "Raw HTML or text content containing pricing information...",
  "timestamp": "2024-01-20T10:00:00Z"
}
```

## Workflow Steps

### 1. Webhook (`webhook.step.ts`)
- Receives competitor data via HTTP POST
- Validates input schema
- Emits event for text processing

### 2. Text Processor (`text_processor.step.ts`)
- Splits raw data into 400-character chunks with 40-char overlap
- Processes both raw text and structured product data
- Maintains metadata for each chunk

### 3. Embeddings Generator (`embeddings.step.ts`)
- Generates embeddings using OpenAI's API
- Processes chunks in batches for efficiency
- Handles API errors gracefully

### 4. Vector Store (`vector_store.step.ts`)
- Stores embeddings in Supabase with pgvector
- Supports both insert and query operations
- Maintains document metadata

### 5. RAG Agent (`rag_agent.step.ts`)
- Queries vector store for relevant context
- Uses Anthropic Claude for analysis
- Maintains conversation memory
- Generates structured insights

### 6. Sheets Logger (`sheets_logger.step.ts`)
- Logs analysis results to Google Sheets
- Can be disabled via environment variable
- Non-critical failures don't break workflow

### 7. Slack Alert (`slack_alert.step.ts`)
- Sends error notifications to #alerts channel
- Includes formatted error details
- Handles both errors and warnings

## Custom UI Components

Each step includes a custom Workbench UI component for better visualization:
- Webhook: Shows API endpoint with lightning icon
- Other steps: EventNode components with descriptive text

## Testing

1. **Test Mode**: Set `ENABLE_SHEETS_LOGGING=false` to disable Google Sheets
2. **Send Test Data**: Use curl or Postman to send test competitor data
3. **Monitor Logs**: Check Motia logs for step execution
4. **Check Slack**: Verify error notifications work

## Troubleshooting

- **Embedding Errors**: Check OpenAI API key and quota
- **Vector Store Errors**: Verify Supabase setup and credentials
- **Slack Errors**: Ensure bot has access to #alerts channel
- **Memory Issues**: Memory persists across workflow runs
