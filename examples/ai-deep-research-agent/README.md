# Deep Research Agent with Motia Framework

A powerful research assistant that leverages the Motia Framework to perform comprehensive web research on any topic and any question.

## Features

* **Deep Web Research**: Automatically searches the web, extracts content, and synthesizes findings
* **Iterative Research Process**: Supports multiple layers of research depth for comprehensive exploration
* **Event-Driven Architecture**: Built using Motia Framework's event system for robust workflow management
* **Parallel Processing**: Efficiently processes search results and content extraction
* **API Endpoints**: REST API access for initiating research and retrieving reports
* **Stateful Processing**: Maintains research state throughout the entire process

## How It Works

The Deep Research Agent works through a series of event-driven steps:

1. **Research Initiation**: Submit a research query via the API
2. **Query Generation**: Generate specific search queries based on the research topic
3. **Web Search**: Perform web searches using Firecrawl to find relevant content
4. **Content Extraction**: Extract and process content from the found web pages
5. **Analysis**: Analyze the extracted content to generate insights
6. **Follow-up Research**: Optionally perform deeper research based on initial findings
7. **Report Compilation**: Generate a comprehensive research report
8. **Result Retrieval**: Access the final report via API

## Prerequisites

* Node.js 18 or later
* **One of the following AI providers:**
  * OpenAI API key, OR
  * Ollama running locally (see Ollama setup below)
* Firecrawl API key

### Ollama Setup (Alternative to OpenAI)

If you prefer to use Ollama instead of OpenAI:

1. Install Ollama from https://ollama.ai/
2. Pull a compatible model (e.g., `ollama pull llama3.1`)
3. Start Ollama service: `ollama serve`
4. Configure environment variables to use Ollama (see setup section)

## Setup

### Option 1: Docker Setup (Recommended)

1. Clone this repository:
```bash
git clone <repository-url>
cd ai_deep_research_agent
```

2. Copy the Docker environment file and configure your API keys:
```bash
cp .env.docker .env
```

3. Edit the `.env` file with your API keys:
```bash
# Required
OPENAI_API_KEY=your-openai-api-key-here
FIRECRAWL_API_KEY=your-firecrawl-api-key-here

# Ollama is automatically configured for Docker
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=llama3.1
```

4. Start the application with Docker Compose:
```bash
docker-compose up -d
```

5. Wait for Ollama to start and pull the model:
```bash
# Check if Ollama is ready
docker-compose logs ollama

# Pull the Llama model (this may take a few minutes)
docker-compose exec ollama ollama pull llama3.1
```

6. Access the Motia Workbench in your browser at `http://localhost:3000`

7. To stop the application:
```bash
docker-compose down
```

### Option 2: Local Development Setup

1. Clone this repository:
```
git clone <repository-url>
cd ai_deep_research_agent
```

2. Install dependencies:
```
npm install
```

3. Copy the example environment file and configure your API keys:
```
cp .env.example .env
```

4. Edit the `.env` file with your configuration:

**For OpenAI (default):**
```
# Required
OPENAI_API_KEY=your-openai-api-key-here
FIRECRAWL_API_KEY=your-firecrawl-api-key-here

# Optional
# OPENAI_MODEL=gpt-4o
# FIRECRAWL_BASE_URL=http://your-firecrawl-instance-url
```

**For Ollama (alternative):**
```
# Required
FIRECRAWL_API_KEY=your-firecrawl-api-key-here

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1

# Optional
# FIRECRAWL_BASE_URL=http://your-firecrawl-instance-url
```

5. Start the Motia development server:
```
npm run dev
```

6. Access the Motia Workbench in your browser at `http://localhost:3000`

## Project Structure

```
.
├── steps/                  # Motia step definitions
│   ├── research-api.step.ts        # API endpoint to start research (OpenAI)
│   ├── ollama-research-api.step.ts # API endpoint to start research (Ollama)
│   ├── status-api.step.ts          # API endpoint to check research status
│   ├── report-api.step.ts          # API endpoint to get research report
│   ├── generate-queries.step.ts    # Generate search queries from topic (OpenAI)
│   ├── ollama-generate-queries.step.ts # Generate search queries (Ollama)
│   ├── search-web.step.ts          # Perform web searches
│   ├── extract-content.step.ts     # Extract content from search results
│   ├── analyze-content.step.ts     # Analyze extracted content (OpenAI)
│   ├── ollama-analyze-content.step.ts # Analyze extracted content (Ollama)
│   ├── follow-up-research.step.ts  # Perform deeper research (OpenAI)
│   ├── ollama-follow-up-research.step.ts # Perform deeper research (Ollama)
│   ├── compile-report.step.ts      # Compile final research report (OpenAI)
│   └── ollama-compile-report.step.ts # Compile final research report (Ollama)
├── services/               # External service integrations
│   ├── openai.service.ts           # OpenAI API integration
│   ├── ollama.service.ts           # Ollama API integration (alternative to OpenAI)
│   └── firecrawl.service.ts        # Firecrawl API integration
├── .env.example            # Example environment variables
├── package.json            # Project dependencies
└── tsconfig.json           # TypeScript configuration
```

## API Usage

### Start Research (OpenAI)

```
POST /research
Content-Type: application/json

{
  "query": "The research topic or question",
  "breadth": 4,  // Number of search queries to generate (1-10)
  "depth": 2     // Depth of research iterations (1-5)
}
```

Response:
```json
{
  "message": "Research process started",
  "requestId": "unique-trace-id"
}
```

### Start Research (Ollama)

```
POST /research/ollama
Content-Type: application/json

{
  "query": "The research topic or question",
  "breadth": 4,  // Number of search queries to generate (1-10)
  "depth": 2,    // Depth of research iterations (1-5)
  "ollamaHost": "http://localhost:11434",  // Optional: Ollama host URL
  "ollamaModel": "llama3.1"                // Optional: Ollama model name
}
```

Response:
```json
{
  "message": "Ollama research process started",
  "requestId": "unique-trace-id",
  "provider": "ollama",
  "configuration": {
    "host": "http://localhost:11434",
    "model": "llama3.1"
  }
}
```

### Check Research Status

```
GET /research/status?requestId=unique-trace-id
```

Response:
```json
{
  "message": "Research status retrieved successfully",
  "requestId": "unique-trace-id",
  "originalQuery": "The research topic or question",
  "status": "in-progress",
  "progress": {
    "currentDepth": 1,
    "totalDepth": 2,
    "percentComplete": 50
  },
  "reportAvailable": false
}
```

### Get Research Report

```
GET /research/report?requestId=unique-trace-id
```

Response:
```json
{
  "message": "Research report retrieved successfully",
  "report": {
    "title": "Research Report Title",
    "overview": "Executive summary...",
    "sections": [
      {
        "title": "Section Title",
        "content": "Section content..."
      }
    ],
    "keyTakeaways": [
      "Key takeaway 1",
      "Key takeaway 2"
    ],
    "sources": [
      {
        "title": "Source Title",
        "url": "Source URL"
      }
    ],
    "originalQuery": "The research topic or question",
    "metadata": {
      "depthUsed": 2,
      "completedAt": "2025-03-18T16:45:30Z"
    }
  },
  "requestId": "unique-trace-id"
}
```

## Workflow Architecture

The system now supports **two completely parallel research workflows** with identical structure:

### Shared Components:
- **Web Search & Content Extraction**: Both workflows use the same Firecrawl-powered web search and content extraction
- **Status & Report APIs**: Both workflows share the same status checking and report retrieval endpoints

### OpenAI Workflow:
```
research-api → research-started → generate-queries → search-queries-generated → search-web → 
search-results-collected → extract-content → content-extracted → analyze-content → 
[analysis-completed OR follow-up-research-needed] → 
[compile-report OR follow-up-research → search-queries-generated] → report-completed
```

### Ollama Workflow:
```
ollama-research-api → ollama-research-started → ollama-generate-queries → search-queries-generated → search-web → 
search-results-collected → extract-content → content-extracted → ollama-analyze-content → 
[analysis-completed OR follow-up-research-needed] → 
[ollama-compile-report OR ollama-follow-up-research → search-queries-generated] → report-completed
```

### Key Benefits:
- **Independent Operation**: Both workflows can run simultaneously without interference
- **Shared Infrastructure**: Web search and content extraction are shared for efficiency
- **Identical Structure**: Same workflow pattern, different AI providers
- **Unified APIs**: Same status and report endpoints work for both workflows

## Docker Configuration

The project includes a complete Docker setup with the following services:

### Services Included:
- **ai-research-agent**: Main application service
- **ollama**: Local LLM service for AI processing
- **Optional Firecrawl**: Self-hosted Firecrawl instance (commented out by default)

### Docker Commands:
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build -d

# Pull Ollama model
docker-compose exec ollama ollama pull llama3.1

# List available models
docker-compose exec ollama ollama list
```

### Docker Environment Variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `FIRECRAWL_API_KEY`: Your Firecrawl API key
- `OLLAMA_HOST`: Automatically set to `http://ollama:11434`
- `OLLAMA_MODEL`: Model to use (default: `llama3.1`)

### GPU Support:
If you have an NVIDIA GPU, uncomment the GPU configuration in `docker-compose.yml` to enable GPU acceleration for Ollama.

## Technologies Used

- **Motia Framework**: Event-driven architecture for workflow orchestration
- **AI Providers**: 
  - **OpenAI API**: For generating queries, analyzing content, and creating reports
  - **Ollama**: Local LLM alternative to OpenAI with same functionality
- **Firecrawl**: Web search and content extraction API
- **TypeScript**: Type-safe development
- **Zod**: Runtime validation for API requests and responses
- **Docker**: Containerization and service orchestration

## License

MIT License 