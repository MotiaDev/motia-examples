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
* OpenAI API key
* Firecrawl API key

## Setup

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

4. Edit the `.env` file with your actual API keys:
```
# Required
OPENAI_API_KEY=your-openai-api-key-here
FIRECRAWL_API_KEY=your-firecrawl-api-key-here

# Optional
# OPENAI_MODEL=gpt-4o
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
│   ├── research-api.step.ts        # API endpoint to start research
│   ├── status-api.step.ts          # API endpoint to check research status
│   ├── report-api.step.ts          # API endpoint to get research report
│   ├── generate-queries.step.ts    # Generate search queries from topic
│   ├── search-web.step.ts          # Perform web searches
│   ├── extract-content.step.ts     # Extract content from search results
│   ├── analyze-content.step.ts     # Analyze extracted content
│   ├── follow-up-research.step.ts  # Perform deeper research
│   └── compile-report.step.ts      # Compile final research report
├── services/               # External service integrations
│   ├── openai.service.ts           # OpenAI API integration
│   └── firecrawl.service.ts        # Firecrawl API integration
├── .env.example            # Example environment variables
├── package.json            # Project dependencies
└── tsconfig.json           # TypeScript configuration
```

## API Usage

### Start Research

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

## Event Flow

The research process follows this event flow:

```
research-api → research-started → generate-queries → search-queries-generated → search-web → 
search-results-collected → extract-content → content-extracted → analyze-content → 
[analysis-completed OR follow-up-research-needed] → 
[compile-report OR follow-up-research → search-queries-generated] → report-completed
```

## Technologies Used

- **Motia Framework**: Event-driven architecture for workflow orchestration
- **OpenAI API**: For generating queries, analyzing content, and creating reports
- **Firecrawl**: Web search and content extraction API
- **TypeScript**: Type-safe development
- **Zod**: Runtime validation for API requests and responses

## License

MIT License 