# PDF RAG Agent (Motia + Docling + Weaviate)

This example builds a retrieval‑augmented pipeline: it ingests PDFs, chunks them with Docling, stores the chunks in Weaviate, and answers questions using Motia’s event‑driven workflow.

![rag-example](docs/images/rag-example.gif)

## Key Features

- PDF document processing and chunking
- Built with [Motia Framework](https://github.com/motiadev/motia) for event-driven Architecture
- Vector storage using [Weaviate](https://weaviate.io/)
- [Docling](https://github.com/docling-project/docling) for PDF parsing and hybrid chunking
- Question answering using RAG pattern
- [OpenAI](https://openai.com/) integration for embeddings and text generation

## Prerequisites

### Option 1: Docker (Recommended)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [OpenAI API key](https://openai.com/api/)

### Option 2: Local Development
- Node.js 18+
- Python 3.10+
- [Weaviate instance](https://weaviate.io/docs/installation.html)
- [OpenAI API key](https://openai.com/api/)

## Setup

### Docker Setup (Recommended)

1. Clone the repository and navigate to the project directory.

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Edit the `.env` file and add your OpenAI API key:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the services using Docker Compose:
```bash
docker-compose up --build
```

This will start:
- **RAG Application** on `http://localhost:3000`
- **Weaviate Vector Database** on `http://localhost:8080`
- **Weaviate Console UI** on `http://localhost:3001`

5. The application will be ready when you see logs indicating all services are healthy.

### Local Development Setup

1. Initialize the Node.js and Python dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```env
OPENAI_API_KEY=your_openai_api_key
WEAVIATE_URL=https://<cluster>.weaviate.cloud
WEAVIATE_API_KEY=your_weaviate_api_key
```

## Development

### Docker Development
```bash
# Start services in development mode
docker-compose up --build

# View logs
docker-compose logs -f rag-app

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build --force-recreate
```

### Local Development
Start the development server:
```bash
npm run dev
```

## Project Structure
```
rag-docling-weaviate-agent/
├── steps/
│   ├── api-steps/          # API endpoints for PDF processing and querying
│   │   ├── api-process-pdfs.step.ts
│   │   └── api-query-rag.step.ts
│   └── event-steps/        # Background processing steps
│       ├── init-weaviate.step.ts
│       ├── load-weaviate.step.ts
│       ├── process-pdfs.step.py
│       └── read-pdfs.step.ts
├── types/               # TypeScript type definitions
```

The project follows a modular structure aligned with Motia Framework conventions:

- `steps/`: Contains all workflow steps
  - `api-steps/`: HTTP endpoints for PDF processing and querying
  - `event-steps/`: Background processing steps for chunking, embedding, and answer generation
- `services/`: Core business logic modules
- `types/`: TypeScript type definitions
- `utils/`: Helper functions and utilities
- `middlewares/`: API request/response middleware

## How it Works

1. **Document Processing**: The system processes the PDF using Docling and HybridChunker to split it into chunks
1. **Vector Storage**: Text chunks are stored in Weaviate with OpenAI text2vec/generative
1. **Query Processing**: User queries are processed using RAG:
   - Query is embedded and similar chunks are retrieved from Weaviate
   - Retrieved context and query are sent to OpenAI for answer generation
   - Response is returned to the user

## API Endpoints

- `POST /api/rag/process-pdfs`: Start processing PDF documents
- `POST /api/rag/query`: Submit questions about the documents

### Example calls

#### Docker Environment
When using Docker, the PDFs are mounted at `/app/docs/pdfs`:
```bash
curl -X POST http://localhost:3000/api/rag/process-pdfs \
  -H "Content-Type: application/json" \
  -d '{"folderPath":"docs/pdfs"}'
```

#### Local Development
From this directory, the ingestion step accepts relative or absolute folder paths:
```bash
curl -X POST http://localhost:3000/api/rag/process-pdfs \
  -H "Content-Type: application/json" \
  -d '{"folderPath":"docs/pdfs"}'

curl -X POST http://localhost:3000/api/rag/process-pdfs \
  -H "Content-Type: application/json" \
  -d '{"folderPath":"/absolute/path/to/rag-docling-weaviate-agent/docs/pdfs"}'
```

#### Query Examples
Query after you see batch insert logs:
```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query":"What are these pdfs about?","limit":3}'
```

![query-output](docs/images/query-output.png)

If you paste a repo‑relative path like `examples/rag-docling-weaviate-agent/docs/pdfs` while you are already inside this example, the step automatically normalizes it to avoid ENOENT errors.

## Docker Services

The Docker Compose setup includes:

### Main Services
- **rag-app**: The main RAG application (Node.js + Python)
- **weaviate**: Vector database for storing document embeddings
- **weaviate-ui**: Web interface for Weaviate database management

### Volumes
- **weaviate_data**: Persistent storage for Weaviate database
- **./docs**: Read-only mount for PDF documents
- **./logs**: Application logs directory

### Networks
- **rag-network**: Internal network for service communication

## Troubleshooting

### Docker Issues

**Services won't start:**
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs rag-app
docker-compose logs weaviate
```

**Weaviate connection issues:**
```bash
# Check if Weaviate is healthy
curl http://localhost:8080/v1/.well-known/ready

# Restart Weaviate service
docker-compose restart weaviate
```

**Application build issues:**
```bash
# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Common Issues

**PDF processing fails:**
- Ensure PDFs are in the `docs/pdfs` directory
- Check that the folderPath in API calls matches the mounted path
- Verify file permissions on PDF files

**OpenAI API errors:**
- Verify your OpenAI API key is correct in `.env`
- Check your OpenAI account has sufficient credits
- Ensure API key has proper permissions

**Memory issues:**
- Increase Docker memory limits in Docker Desktop settings
- Monitor resource usage: `docker stats`

## License

MIT
