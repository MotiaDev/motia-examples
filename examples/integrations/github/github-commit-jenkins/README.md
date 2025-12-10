# GitHub Commit Jenkins

A production-ready workflow built with Motia that processes GitHub commits using AI-powered analysis with RAG (Retrieval-Augmented Generation).

![Workbench](./img/workbench.png)
## Overview

This workflow demonstrates an automated pipeline for processing GitHub commits with the following capabilities:

- **Webhook Integration**: Receives GitHub commit webhooks
- **Text Processing**: Splits commit data into chunks for efficient processing
- **Vector Embeddings**: Creates embeddings using OpenAI's text-embedding-3-small model
- **Vector Storage**: Stores embeddings in Supabase for semantic search
- **RAG Agent**: Processes commits using AI with contextual information from vector store
- **Logging**: Records results to Google Sheets
- **Error Handling**: Sends error notifications to Slack

## Architecture

The workflow consists of 5 interconnected steps:

1. **WebhookTrigger** (API Step)
   - Endpoint: `POST /github-commit-jenkins`
   - Receives GitHub webhook payloads
   - Stores data in state and triggers processing

2. **ProcessCommit** (Event Step)
   - Splits text into chunks (400 chars, 40 overlap)
   - Creates embeddings using OpenAI
   - Stores vectors in Supabase

3. **RagAgent** (Event Step)
   - Queries vector store for relevant context
   - Uses OpenAI Chat Model with window memory
   - Generates AI-powered analysis of commits

4. **AppendSheet** (Event Step)
   - Logs processing results to Google Sheets
   - Records commit ID, status, and timestamp

5. **SlackAlert** (Event Step)
   - Sends error notifications to #alerts channel
   - Includes error context and commit information

## Flow Visualization

```
┌─────────────────┐
│ GitHub Webhook  │
│   (API Step)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Process Commit  │──────┐
│  (Text Split +  │      │
│   Embeddings)   │      │
└────────┬────────┘      │
         │               │ On Error
         ▼               ▼
┌─────────────────┐  ┌──────────────┐
│   RAG Agent     │──│ Slack Alert  │
│  (AI Analysis)  │  │ (Error Notif)│
└────────┬────────┘  └──────────────┘
         │
         ▼
┌─────────────────┐
│  Append Sheet   │
│  (Google Log)   │
└─────────────────┘
```

## Setup

### Prerequisites

- Node.js 18+ or Python 3.9+
- Motia CLI installed
- API keys for:
  - OpenAI
  - Supabase (with pgvector enabled)
  - Google Sheets
  - Slack

### Environment Variables

Create a `.env` file with the following:

```env
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GOOGLE_SHEETS_CREDENTIALS=your_credentials_json
SLACK_TOKEN=your_slack_token
```

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Supabase Setup

Create a table with vector support:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for embeddings
CREATE TABLE github_commit_jenkins (
  id BIGSERIAL PRIMARY KEY,
  commit_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for similarity search
CREATE INDEX ON github_commit_jenkins 
USING ivfflat (embedding vector_cosine_ops);

-- Create function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id BIGINT,
  commit_id TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    commit_id,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM github_commit_jenkins
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

## Usage

**Payload format:**

```json
{
  "commit": {
    "message": "Fix bug in authentication",
    "author": "John Doe",
    "sha": "abc123...",
    "url": "https://github.com/user/repo/commit/abc123"
  },
  "repository": {
    "name": "my-repo",
    "url": "https://github.com/user/repo"
  },
  "content": "Full commit details...",
  "metadata": {
    "branch": "main"
  }
}
```

### Testing

You can test the webhook with curl:

```bash
curl -X POST https://your-domain.com/github-commit-jenkins \
  -H "Content-Type: application/json" \
  -d '{
    "commit": {
      "message": "Test commit",
      "author": "Test User",
      "sha": "test123",
      "url": "https://github.com/test/repo/commit/test123"
    },
    "content": "This is a test commit to verify the workflow"
  }'
```

## Monitoring

- View real-time workflow execution in **Motia Workbench**
- Check Google Sheets for processing logs
- Monitor #alerts channel for errors
- Use Motia's built-in logging and tracing

## Production Considerations

1. **Rate Limiting**: Add rate limiting to the webhook endpoint
2. **Authentication**: Secure the webhook with signature verification
3. **Error Handling**: Implement retry logic for API calls
4. **Monitoring**: Set up alerts for failed workflows
5. **Scaling**: Configure appropriate concurrency limits
6. **Costs**: Monitor OpenAI API usage and Supabase storage

## License

MIT
