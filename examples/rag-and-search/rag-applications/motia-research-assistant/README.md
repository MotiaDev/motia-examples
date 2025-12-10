# Motia Research Assistant

A multi-agent research system that combines Motia workflow orchestration with Mastra AI agents to deliver comprehensive business research reports in under 60 seconds.

## What This Does

Send a research query, get back a professional business report with verified facts and actionable insights. The system uses real web search, AI analysis, fact-checking, and report writing to create executive-ready documents.

**Example**: Query "Stripe payment infrastructure" → Get back a 15-page report with market analysis, competitive positioning, and strategic recommendations.

## Architecture

### 8-Step Workflow Pipeline

1. **API Query Handler** - Accepts research requests via REST API
2. **Data Collection** - Web search using Tavily API for current information
3. **Research Analysis** - Mastra agent analyzes collected data for insights
4. **Summary Generation** - Creates executive summaries with business focus
5. **Fact Verification** - Verifies claims using additional searches and source credibility
6. **Report Writing** - Generates professional reports with proper structure
7. **Results Coordination** - Tracks performance and quality metrics
8. **Storage & Delivery** - Stores results and provides access APIs

### Technology Stack

- **Motia**: Workflow orchestration and event-driven architecture
- **Mastra**: AI agent framework with tool integration
- **OpenAI GPT-4o**: Language model for analysis and writing
- **Tavily API**: Web search for real-time data collection
- **TypeScript**: Type-safe development
- **Zod**: Schema validation

## Quick Start

### Prerequisites

```bash
# API Keys needed
OPENAI_API_KEY=your_openai_key
TAVILY_API_KEY=your_tavily_key
```

### Installation

```bash
# Initialize project
npx create-motia-app motia-research-assistant
cd motia-research-assistant

# Install dependencies
npm install @mastra/core mastra @ai-sdk/openai tavily uuid @types/uuid

# Copy workflow steps to your steps directory
# (All 8 step files from this repository)
```

### Usage

```bash
# Start the workflow
npm run dev

# Make a research request
curl -X POST http://localhost:3000/research/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Anthropic business model and competitive analysis",
    "depth": "detailed"
  }'

# Response includes research ID for tracking
{
  "success": true,
  "researchId": "research_abc123",
  "status": "processing",
  "estimatedCompletion": "60 seconds"
}

# Check results
curl http://localhost:3000/api/research/research_abc123/report
```

## Research Depth Options

- **basic**: Quick overview (800 words, 1 search query, ~30 seconds)
- **detailed**: Comprehensive analysis (1500 words, 3 search queries, ~45 seconds)
- **comprehensive**: Deep dive (2500 words, 5 search queries, ~60 seconds)

## API Endpoints

### Submit Research Query

```
POST /research/query
```

**Body:**

```json
{
  "query": "Research topic or company",
  "depth": "basic|detailed|comprehensive"
}
```

### Get Report

```
GET /api/research/{researchId}/report
```

### Get Executive Summary

```
GET /api/research/{researchId}/summary
```

### Get Key Insights

```
GET /api/research/{researchId}/insights
```

## Response Format

```json
{
  "success": true,
  "researchId": "research_abc123",
  "status": "completed",
  "performance": {
    "processingTime": "47s",
    "targetMet": true
  },
  "quality": {
    "overallScore": 0.87,
    "reliabilityScore": 0.92,
    "verifiedClaims": 18
  },
  "results": {
    "title": "Research Report: Anthropic Business Analysis",
    "executiveSummary": "Anthropic is a leading AI safety company...",
    "keyInsights": [
      {
        "insight": "Focuses on constitutional AI development",
        "confidence": 0.95,
        "source": "verified_sources"
      }
    ],
    "wordCount": 1847,
    "readingTime": "8 minutes"
  },
  "access": {
    "reportUrl": "/api/research/abc123/report",
    "downloadUrl": "/api/research/abc123/download"
  }
}
```

## Quality Metrics

The system tracks several quality indicators:

- **Processing Time**: Target <60 seconds for all research depths
- **Source Reliability**: Credibility scoring based on domain authority
- **Fact Verification**: Claims verified through additional searches
- **Report Completeness**: Structured sections with proper formatting
- **Overall Quality Score**: Weighted combination of all metrics

Target thresholds:

- Time: ≤60 seconds
- Quality: ≥0.7 overall score
- Reliability: ≥0.6 verification rate

## How It Works

### Event Flow

```
User Request → query.received → data.collected → research.analyzed →
summary.generated → factcheck.completed → report.generated →
results.coordinated → workflow.completed
```

### Data Processing

1. **Web Search**: Tavily API fetches current articles and reports
2. **AI Analysis**: Mastra research agent processes raw data for insights
3. **Business Focus**: Summary agent creates executive-oriented analysis
4. **Verification**: Fact-check agent validates claims with additional searches
5. **Professional Writing**: Report writer creates structured business documents
6. **Quality Control**: Results coordinator tracks metrics and performance

### Storage Organization

- `completed_research`: Full workflow records
- `public_reports`: Shareable formatted reports
- `executive_summaries`: Quick access summaries
- `key_insights`: Structured insights for API consumption
- `api_responses`: Client response cache (30-day expiry)

## Configuration

### Search Parameters

Research depth determines search behavior:

```typescript
const searchConfig = {
  basic: { maxResults: 10, queries: 1 },
  detailed: { maxResults: 15, queries: 3 },
  comprehensive: { maxResults: 20, queries: 5 },
};
```

### Agent Instructions

Each Mastra agent has specialized prompts:

- **Research Agent**: Extract insights and identify trends
- **Summary Agent**: Create business-focused summaries
- **Fact-Check Agent**: Verify claims and assess source credibility
- **Report Writer**: Generate professional executive reports

_This system demonstrates the power of combining Motia's workflow orchestration with Mastra's AI agent capabilities for real-world business applications._
