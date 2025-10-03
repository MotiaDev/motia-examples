# Multi-Format Document RAG Agent (Motia + Docling + Vector Databases)

This example builds a retrieval‑augmented pipeline: it ingests multiple document types (PDF, Markdown, HTML, TXT), chunks them with Docling and custom processors, stores the chunks in ChromaDB vector database, and answers questions using Motia's event‑driven workflow.

![rag-example](docs/images/rag-example.gif)

## Key Features

- Multi-format document processing (PDF, Markdown, HTML, TXT)
- Built with [Motia Framework](https://github.com/motiadev/motia) for event-driven Architecture
- Vector storage using [ChromaDB](https://www.trychroma.com/)
- [Docling](https://github.com/docling-project/docling) for document parsing and hybrid chunking
- Custom text processor for TXT files
- Question answering using RAG pattern
- [OpenAI](https://openai.com/) integration for embeddings and text generation
- [Ollama](https://ollama.ai/) support for local embeddings and text generation (alternative to OpenAI)

## Prerequisites

### Option 1: Docker (Recommended)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [OpenAI API key](https://openai.com/api/)

### Option 2: Local Development
- Node.js 18+
- Python 3.10+
- [ChromaDB instance](https://docs.trychroma.com/getting-started)
- [OpenAI API key](https://openai.com/api/)

## Setup

### Docker Setup (Recommended)

1. Clone the repository and navigate to the project directory.

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Edit the `.env` file and configure your providers:

**For OpenAI (default):**
```env
EMBEDDING_PROVIDER=openai
TEXT_GENERATION_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSION=1536
OPENAI_TEXT_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096
```

**For Ollama (local embeddings and text generation):**
```env
EMBEDDING_PROVIDER=ollama
TEXT_GENERATION_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
# High-quality embedding model (1024 dimensions)
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large
OLLAMA_EMBEDDING_DIMENSION=1024
# Text generation model
OLLAMA_TEXT_MODEL=llama3.1
OLLAMA_MAX_TOKENS=4096
```

**For Ollama (smaller embedding model):**
```env
EMBEDDING_PROVIDER=ollama
TEXT_GENERATION_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
# Smaller, faster embedding model (768 dimensions)
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_EMBEDDING_DIMENSION=768
# Text generation model
OLLAMA_TEXT_MODEL=llama3.1
OLLAMA_MAX_TOKENS=4096
```

**Mixed configuration (Ollama embeddings + OpenAI text generation):**
```env
EMBEDDING_PROVIDER=ollama
TEXT_GENERATION_PROVIDER=openai
OLLAMA_HOST=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large
OLLAMA_EMBEDDING_DIMENSION=1024
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_TEXT_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096
```

4. Start the services using Docker Compose:
```bash
docker-compose up --build
```

This will start:
- **RAG Application** on `http://localhost:3000`
- **ChromaDB Vector Database** on `http://localhost:8000`
- **Ollama Service** on `http://localhost:11434` (if using Ollama embeddings)

5. The application will be ready when you see logs indicating all services are healthy.

#### Using Ollama for Local Embeddings and Text Generation

If you're using Ollama for embeddings or text generation, you'll need to pull the required models:

```bash
# Pull embedding models
docker exec -it rag-docling-vector-agent-ollama-1 ollama pull mxbai-embed-large
# Or pull other embedding models:
# docker exec -it rag-docling-vector-agent-ollama-1 ollama pull nomic-embed-text  # 768 dims
# docker exec -it rag-docling-vector-agent-ollama-1 ollama pull all-minilm        # 384 dims

# Pull text generation models
docker exec -it rag-docling-vector-agent-ollama-1 ollama pull llama3.1
# Or pull other text generation models:
# docker exec -it rag-docling-vector-agent-ollama-1 ollama pull llama3.2
# docker exec -it rag-docling-vector-agent-ollama-1 ollama pull mistral
# docker exec -it rag-docling-vector-agent-ollama-1 ollama pull codellama
```

#### Ollama Models

**Embedding Models:**
| Model | Dimensions | Size | Speed | Quality | Use Case |
|-------|------------|------|-------|---------|----------|
| `mxbai-embed-large` | 1024 | Large | Slower | High | Best quality, high-dimensional |
| `nomic-embed-text` | 768 | Medium | Fast | Good | Balanced performance |
| `all-minilm` | 384 | Small | Fastest | Good | Resource-constrained environments |

**Text Generation Models:**
| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `llama3.1` | Large | Medium | High | General purpose, high quality |
| `llama3.2` | Medium | Fast | Good | Balanced performance |
| `mistral` | Medium | Fast | Good | Code and general purpose |
| `codellama` | Large | Medium | High | Code generation and analysis |

**Important Notes:** 
- When switching between OpenAI and Ollama embeddings, the system will automatically detect dimension mismatches and recreate the ChromaDB collection with the correct dimensions. This ensures compatibility but will require re-indexing your documents.
- You can mix and match providers: use Ollama for embeddings and OpenAI for text generation, or vice versa, by setting different values for `EMBEDDING_PROVIDER` and `TEXT_GENERATION_PROVIDER`.

### Local Development Setup

1. Initialize the Node.js and Python dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:

For ChromaDB:
```env
OPENAI_API_KEY=your_openai_api_key
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
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
rag-docling-vector-agent/
├── steps/
│   ├── api-steps/          # API endpoints for PDF processing and querying
│   │   ├── api-process-pdfs.step.ts
│   │   ├── api-query-rag.step.ts
│   │   ├── api-process-pdfs-chromadb.step.ts
│   │   └── api-query-rag-chromadb.step.ts
│   └── event-steps/        # Background processing steps
│       ├── init-chromadb.step.ts
│       ├── load-chromadb.step.ts
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

1. **Document Processing**: The system processes documents using Docling (for PDF, MD, HTML) and custom text processor (for TXT) with HybridChunker to split them into chunks
1. **Vector Storage**: Text chunks are embedded using OpenAI or Ollama embeddings and stored in ChromaDB
1. **Query Processing**: User queries are processed using RAG:
   - Query is embedded and similar chunks are retrieved from the vector database
   - Retrieved context and query are sent to OpenAI or Ollama for answer generation
   - Response is returned to the user

## API Endpoints

### ChromaDB Endpoints
- `POST /api/rag/process-pdfs-chromadb`: Start processing PDF documents (ChromaDB)
- `POST /api/rag/process-documents-chromadb`: Start processing multiple document types (PDF, MD, HTML, TXT) (ChromaDB)
- `POST /api/rag/query-chromadb`: Query all document types through ChromaDB

### Supported File Types
- **PDF** (.pdf) - Processed with Docling
- **Markdown** (.md) - Processed with Docling
- **HTML** (.html, .htm) - Processed with Docling
- **Text** (.txt) - Processed with custom text processor

### Example calls

#### Docker Environment
When using Docker, the documents are mounted at `/app/docs/pdfs`:



**Process PDFs only (ChromaDB):**
```bash
curl -X POST http://localhost:3000/api/rag/process-pdfs-chromadb \
  -H "Content-Type: application/json" \
  -d '{"folderPath":"docs/pdfs"}'
```

**Process all document types (ChromaDB):**
```bash
curl -X POST http://localhost:3000/api/rag/process-documents-chromadb \
  -H "Content-Type: application/json" \
  -d '{"folderPath":"docs/pdfs"}'
```

#### Local Development
From this directory, the ingestion step accepts relative or absolute folder paths:

For ChromaDB:
```bash
curl -X POST http://localhost:3000/api/rag/process-pdfs-chromadb \
  -H "Content-Type: application/json" \
  -d '{"folderPath":"docs/pdfs"}'
```

#### Query Examples
Query after you see batch insert logs:

**Query all document types (ChromaDB):**
```bash
curl -X POST http://localhost:3000/api/rag/query-chromadb \
  -H "Content-Type: application/json" \
  -d '{"query":"What are these documents about?","limit":3}'
```

![query-output](docs/images/query-output.png)

If you paste a repo‑relative path like `examples/rag-docling-vector-agent/docs/pdfs` while you are already inside this example, the step automatically normalizes it to avoid ENOENT errors.

## Docker Services

The Docker Compose setup includes:

### Main Services
- **rag-app**: The main RAG application (Node.js + Python)
- **chromadb**: Vector database for storing document embeddings

### Volumes
- **chromadb_data**: Persistent storage for ChromaDB database
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
docker-compose logs chromadb
```

**ChromaDB connection issues:**
```bash
# Check if ChromaDB is healthy
curl http://localhost:8000/api/v1/heartbeat

# Restart ChromaDB service
docker-compose restart chromadb
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
