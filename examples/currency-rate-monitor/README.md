# Currency Rate Monitor

A sophisticated Currency Rate Monitor application built with **Motia** that implements RAG (Retrieval-Augmented Generation) using OpenAI embeddings, Weaviate vector database, with Google Sheets logging and Slack error notifications.

## 🎯 Features

- **Webhook Endpoint**: POST endpoint to receive currency rate data
- **Text Processing**: Automatic text chunking and splitting (400 chars with 40 char overlap)
- **Vector Embeddings**: OpenAI text-embedding-3-small integration
- **Vector Storage**: Weaviate database for semantic search
- **RAG Agent**: Intelligent query processing with context retrieval and conversation memory
- **Logging**: Automatic logging to Google Sheets
- **Error Notifications**: Slack alerts for failures
- **State Management**: Persistent conversation history and request tracking

## 🏗️ Architecture

The application follows an event-driven architecture with the following workflow:

```
Webhook Trigger (API)
    ↓
    ├─→ Text Splitter (Event)
    │       ↓
    │   Embeddings Generator (Event)
    │       ↓
    │   Weaviate Insert (Event)
    │
    └─→ RAG Agent (Event)
            ↓
            ├─→ Google Sheets Append (Event)
            └─→ Slack Alert (Event - on error)
```

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- Weaviate instance (local or cloud)
- Google Sheets API credentials
- Slack webhook URL (optional, for error notifications)

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Weaviate Schema

Before running the application, create the Weaviate class schema:

```bash
curl -X POST "http://localhost:8080/v1/schema" \
  -H "Content-Type: application/json" \
  -d '{
    "class": "CurrencyRateMonitor",
    "vectorizer": "none",
    "properties": [
      {
        "name": "content",
        "dataType": ["text"]
      },
      {
        "name": "requestId",
        "dataType": ["string"]
      },
      {
        "name": "chunkIndex",
        "dataType": ["int"]
      },
      {
        "name": "totalChunks",
        "dataType": ["int"]
      },
      {
        "name": "metadata",
        "dataType": ["text"]
      },
      {
        "name": "timestamp",
        "dataType": ["date"]
      }
    ]
  }'
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory (use `config.example.json` as reference):

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Weaviate Configuration
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=your-weaviate-api-key-here

# Google Sheets Configuration
GOOGLE_SHEET_ID=your-google-sheet-id-here
GOOGLE_ACCESS_TOKEN=your-google-access-token-here

# Slack Configuration (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#alerts

# Server Configuration
PORT=3000
```

### 4. Setup Google Sheets

Create a Google Sheet with a sheet named "Log" and the following columns:
- Timestamp
- Request ID
- Query
- Response
- Status
- Metadata

### 5. Generate Types

```bash
npm run generate-types
```

### 6. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 🧪 Testing the Application

### Test 1: Store Currency Rate Data

Send currency rate data to be processed and stored in the vector database:

```bash
curl -X POST http://localhost:3000/currency-rate-monitor \
  -H "Content-Type: application/json" \
  -d '{
    "text": "USD to EUR exchange rate is 0.92 as of today. The Euro has strengthened against the dollar by 2% this week. Historical data shows this is the highest rate in 3 months. Market analysts predict continued strength due to ECB policy decisions.",
    "metadata": {
      "source": "market-data",
      "currency_pair": "USD/EUR"
    }
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Currency rate data received and processing",
  "traceId": "req_1234567890_abc123"
}
```

### Test 2: Query with RAG

Send a query to retrieve information using the RAG agent:

```bash
curl -X POST http://localhost:3000/currency-rate-monitor \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Recent currency rate updates for USD to EUR",
    "query": "What is the current USD to EUR exchange rate?",
    "metadata": {
      "user": "analyst-1"
    }
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Currency rate data received and processing",
  "traceId": "req_1234567890_xyz789"
}
```

The RAG agent will:
1. Generate embeddings for your query
2. Search Weaviate for relevant context
3. Use GPT-4 to generate a response
4. Log the interaction to Google Sheets
5. Maintain conversation history in state

### Test 3: Check Logs

After running tests, check your Google Sheet "Log" tab to see the logged entries.

### Test 4: Test Error Handling

Send invalid data to trigger error notifications:

```bash
curl -X POST http://localhost:3000/currency-rate-monitor \
  -H "Content-Type: application/json" \
  -d '{}'
```

This should trigger a Slack alert (if configured) and return a 400 error.

## 📁 Project Structure

```
currency-rate-monitor/
├── steps/
│   ├── webhook-trigger/
│   │   └── webhook-trigger.step.ts     # API endpoint
│   ├── text-splitter/
│   │   └── text-splitter.step.ts       # Text chunking
│   ├── embeddings-generator/
│   │   └── embeddings-generator.step.ts # OpenAI embeddings
│   ├── weaviate-insert/
│   │   └── weaviate-insert.step.ts     # Vector storage
│   ├── rag-agent/
│   │   └── rag-agent.step.ts           # RAG processing
│   ├── sheets-append/
│   │   └── sheets-append.step.ts       # Google Sheets logging
│   └── slack-alert/
│       └── slack-alert.step.ts         # Error notifications
├── config.example.json                  # Configuration template
├── package.json
├── tsconfig.json
└── README.md
```

## 🔍 How It Works

### 1. Data Ingestion Flow
- Webhook receives currency rate data
- Text is split into 400-character chunks with 40-character overlap
- Each chunk is sent to OpenAI for embedding generation
- Embeddings are stored in Weaviate with metadata

### 2. Query Processing Flow (RAG)
- User query is converted to an embedding
- Weaviate performs semantic search to find relevant chunks
- Retrieved context + conversation history is sent to GPT-4
- Response is generated and logged
- Conversation history is maintained in state

### 3. Error Handling
- All errors are caught and logged
- Failed operations trigger Slack notifications
- State is preserved for debugging

## 🎨 Motia Workbench

To visualize the workflow in Motia Workbench:

```bash
npm run dev
```

Then open the Workbench interface to see the complete flow diagram with all steps and connections.

## 🔧 Advanced Configuration

### Adjusting Chunk Size

Edit `steps/text-splitter/text-splitter.step.ts`:
```typescript
const chunkSize = 400;      // Adjust chunk size
const chunkOverlap = 40;    // Adjust overlap
```

### Changing RAG Parameters

Edit `steps/rag-agent/rag-agent.step.ts`:
```typescript
// Adjust context retrieval
limit: 5  // Number of context chunks to retrieve

// Adjust GPT-4 parameters
temperature: 0.7,
max_tokens: 500
```

### Conversation Memory Window

The RAG agent keeps the last 5 messages in conversation history. Adjust in `steps/rag-agent/rag-agent.step.ts`:
```typescript
conversationHistory = conversationHistory.slice(-5);  // Change window size
```

## 🐛 Troubleshooting

### Weaviate Connection Issues
- Ensure Weaviate is running: `docker ps | grep weaviate`
- Check the WEAVIATE_URL environment variable
- Verify the schema was created correctly

### OpenAI API Errors
- Verify your API key is valid
- Check your OpenAI account has sufficient credits
- Ensure you have access to text-embedding-3-small and gpt-4 models

### Google Sheets Issues
- Verify the spreadsheet ID is correct
- Ensure the "Log" sheet exists
- Check that your access token has the required permissions

## 📊 Monitoring

- **Logs**: Check console output for detailed logging
- **Google Sheets**: Monitor all queries and responses
- **Slack**: Receive real-time error notifications
- **Motia Workbench**: Visualize workflow execution

## 🤝 Contributing

This project follows Domain-Driven Design principles. When adding new features:
- Create separate steps for distinct responsibilities
- Use events for long-running or failure-prone operations
- Store data in state for cross-step communication
- Follow the existing naming conventions

## 📝 License

ISC

## 🔗 Resources

- [Motia Documentation](https://motia.dev)
- [OpenAI API](https://platform.openai.com/docs)
- [Weaviate Documentation](https://weaviate.io/developers/weaviate)
- [n8n Workflow Reference](https://n8n.io)

---

Built with ❤️ using Motia

