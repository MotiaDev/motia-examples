# Research Paper Assistant

<div align="center">
  <img src="https://img.shields.io/badge/Motia-Framework-blue" alt="Motia Framework"/>
  <img src="https://img.shields.io/badge/Gemini_2.5-AI-green" alt="Powered by Gemini AI"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue" alt="TypeScript 5.0"/>
</div>

<div align="center" style="display: flex; justify-content: center; align-items: center; gap: 40px;">
  <img src="https://www.motia.dev/logos/logo-black.svg" width="120" height="100" alt="Motia Logo"/>
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/2560px-Google_Gemini_logo.svg.png" width="100" alt="Google Gemini Logo"/>
</div>

## 🔍 Overview

The Research Paper Assistant is a powerful tool built with the Motia framework that helps researchers and students efficiently process academic literature. It automatically analyzes research papers, generates summaries, extracts key concepts, recommends related papers, generates code examples, analyzes research gaps, and builds a knowledge graph to visualize connections between papers - all powered by Google's Gemini 2.5 Pro model.

![research-assistant-demo](docs/images/workbench-image.png)

## ✨ Features

- **Paper Management**
  - Upload research papers with metadata
  - Extract and process text from papers
  - Persistent storage of paper data and analysis

- **AI-Powered Analysis**
  - Generate concise summaries of complex papers
  - Extract key concepts and terminology with descriptions
  - Evaluate research impact and significance
  - Analyze related literature and research context
  - Generate practical code examples based on research
  - Identify research gaps and future opportunities
  - Recommend related papers from internet searches

- **Knowledge Organization**
  - Build an interactive knowledge graph connecting papers and concepts
  - Generate beautiful markdown reports for better readability
  - Visualize connections between papers and concepts
  - Query the knowledge graph by concept or paper ID

## 🔄 Workflow

1. **Upload** a research paper via API endpoint with metadata
2. **Extract** text from the paper (simulated in this version)
3. **Analyze** the paper content using Gemini 2.5 Pro AI
4. **Generate** a comprehensive summary
5. **Extract** key concepts and technical terminology
6. **Evaluate** research impact and significance
7. **Analyze** related literature and research context
8. **Identify** research gaps and future opportunities
9. **Generate** practical code examples for implementation
10. **Recommend** related papers from internet searches
11. **Build** knowledge graph with new information and connections
12. **Generate** markdown reports for easy consumption
13. **Query** the knowledge graph to explore relationships

## 🔧 Implementation Details

This agent leverages Motia's powerful event-driven architecture with the following steps:

### API Endpoints
- `uploadPaper`: Receives paper metadata and initiates the analysis workflow
- `queryConcepts`: Query the knowledge graph by concept
- `queryPaper`: Retrieve paper details by ID
- `serveCss`: Serves stylesheet for the UI
- `serveStatic`: Serves static files for the UI

### Analysis Pipeline
- `extractText`: Extracts text from paper (simulated in this demo)
- `analyzePaper`: Performs initial analysis using Gemini 2.5 Pro
- `analyzePaperWithGemini`: Enhances analysis with structured information
- `generateSummary` & `generateSummaryWithGemini`: Creates concise, well-structured summaries
- `extractConcepts` & `extractConceptsWithGemini`: Identifies key concepts with descriptions
- `analyzeRelatedLiterature`: Places paper in broader research context
- `analyzeResearchGaps`: Identifies unexplored areas and future research opportunities
- `evaluateResearchImpact`: Assesses significance and potential implications
- `generateCodeExamples`: Creates practical implementation examples
- `recommendRelatedPapers`: Finds related papers from internet searches
- `researchMonitor`: Monitors the flow of research paper processing (NOOP)
- `paperUploadWebhook`: Handles paper upload events (NOOP)
- `humanReview`: Simulates human review process (NOOP)

### Knowledge Management
- `buildKnowledgeGraph` & `buildEnhancedKnowledgeGraph`: Maintains connections between papers and concepts
- `generateMarkdownReport`: Creates readable reports from the knowledge graph

### Technical Components

- **Event System**: The application uses Motia's event-driven architecture where components communicate through events. Each step subscribes to specific events and emits new events upon completion.

- **NOOP Steps**: "No Operation" steps that don't perform actual processing but serve as placeholders or monitoring points in the workflow. Examples include:
  - `researchMonitor`: Monitors the research paper processing flow
  - `paperUploadWebhook`: Acts as an event handler for paper uploads
  - `humanReview`: Simulates human review process integration

- **Gemini Integration**: Robust integration with Google's Gemini AI that includes:
  - JSON parsing and error handling
  - Text extraction with regex patterns
  - Direct extraction of structured data

- **UI Components**: The system includes a simple web interface for:
  - Paper upload
  - Result visualization
  - Knowledge graph exploration
  - Report generation

The implementation uses Google's Gemini 2.5 Pro model for all AI tasks, with robust error handling and case-insensitive key processing to ensure reliability. The knowledge graph is stored using file-based persistence in a JSON file, making it accessible across different steps and API endpoints.

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm
- Google API Key for Gemini 2.5 Pro

### Environment Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/MotiaDev/motia-examples.git
   cd motia-examples/examples/research-assistant
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. Create a `.env` file with your Google API key:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

4. Start the Motia server:
   ```bash
   pnpm run dev
   # or
   npm run dev
   ```

5. Access the Motia Workbench at: `http://localhost:3000`

## 🌐 API Endpoints

### Upload a Paper
```http
POST /api/upload-paper
Content-Type: application/json
```

Example payload:
```json
{
  "title": "Mem0",
  "authors": "Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet Singh",
  "abstract": "Large Language Models (LLMs) have demonstrated remarkable prowess in generating contextually coherent responses, yet their fixed context windows pose fundamental challenges for maintaining consistency over prolonged multi-session dialogues. We introduce Mem0, a scalable memory-centric architecture that addresses this issue by dynamically extracting, consolidating, and retrieving salient information from ongoing conversations.",
  "pdfUrl": "https://arxiv.org/pdf/2504.19413",
  "doi": "2504.19413"
}
```

Example response:
```json
{
  "success": true,
  "message": "Paper uploaded successfully",
  "paperId": "paper-1746292138955"
}
```

### Query Knowledge Graph
```http
GET /api/query
```

Query options:
```http
GET /api/query                           # Get all data
GET /api/query?concept=Mem0              # Query by concept
GET /api/query?paperId=paper-1746292138955  # Query by paper ID
```

### Get Paper Details
```http
GET /api/paper/:paperId
```

Example:
```http
GET /api/paper/paper-1746292138955
```

## 🧪 Testing the Implementation

### Using cURL

1. Upload a paper:
   ```bash
   curl -X POST http://localhost:3000/api/upload-paper \
     -H "Content-Type: application/json" \
     -d '{
       "title": "name of paper",
       "authors": "name of authors",
       "abstract": "abstract of paper",
       "pdfUrl": "url of pdf",
       "doi": "doi of paper"
     }'
   ```

2. Query the knowledge graph:
   ```bash
   curl "http://localhost:3000/api/query"
   ```

3. Query by concept:
   ```bash
   curl "http://localhost:3000/api/query?concept=Mem0"
   ```

4. Get paper details by ID:
   ```bash
   curl "http://localhost:3000/api/paper/paper-1746292138955"
   ```

### Using JavaScript

Create a file named `test-upload.js`:

```javascript
// Simple test script for the upload-paper endpoint
// Using Node.js built-in fetch API (available in Node.js v20+)

async function testUploadPaper() {
  try {
    const response = await fetch('http://localhost:3000/api/upload-paper', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'name of paper',
        authors: 'name of authors',
        abstract: 'abstract of paper',
        pdfUrl: 'url of pdf',
        doi: 'doi of paper'
      }),
    });
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testUploadPaper();
```

Run with:
```bash
node test-upload.js
```

### Using the UI

Monitor the workflow in the Motia Workbench UI at http://localhost:3000

## 🤖 AI Integration

This implementation leverages Google's cutting-edge Gemini 2.5 Pro model for advanced natural language processing and analysis:

### Key AI Capabilities

- **Comprehensive Paper Analysis**: Gemini analyzes research papers to extract structured information including main topics, academic disciplines, methodologies, key findings, limitations, and future research directions.

- **Intelligent Summarization**: Generates concise, well-structured summaries that capture the essence of complex research papers while maintaining accuracy and relevance.

- **Semantic Concept Extraction**: Identifies key concepts, technical terminology, and research frameworks with descriptions and confidence scores.

- **Research Impact Evaluation**: Assesses the significance, innovation level, and potential implications of research papers within their academic field.

- **Context-Aware Literature Analysis**: Places papers within their broader research context by analyzing related literature and research lineage.

- **Research Gap Analysis**: Identifies unexplored areas, methodological limitations, and promising future research directions in the field.

- **Code Example Generation**: Creates practical implementation examples based on research methodologies and techniques described in papers.

- **Internet-Enabled Paper Recommendations**: Leverages internet search capabilities to recommend relevant, recent papers related to the analyzed content.

### Technical Integration

All Gemini API calls include robust error handling, case-insensitive key processing for consistent data extraction, and comprehensive prompt engineering to ensure reliable and high-quality results. The system can parse complex, semi-structured responses and extract useful information even from imperfect AI outputs.

## 🔮 Future Enhancements

### Technical Improvements
- **PDF Processing**: Integration with actual PDF parsing libraries (e.g., pdf.js, pdf-parse)
- **Persistent Storage**: Database implementation for the knowledge graph (e.g., Neo4j, MongoDB)
- **Real-time Updates**: WebSocket integration for live updates as papers are processed
- **Authentication**: User authentication and paper ownership management

### Feature Expansions
- **Interactive Visualization**: Dynamic UI for exploring the knowledge graph
- **Citation Analysis**: Citation network visualization and impact metrics
- **Multi-modal Support**: Analysis of figures, tables, and equations in papers
- **Collaborative Features**: Shared collections and collaborative annotations
- **Custom Collections**: User-defined paper collections and reading lists

### AI Enhancements
- **Domain Specialization**: Fine-tuned models for specific research domains
- **Multi-lingual Support**: Analysis of papers in multiple languages
- **Cross-paper Synthesis**: Generating insights across multiple related papers
- **Question Answering**: Direct Q&A about papers in the knowledge base

## 🌐 Deployment

### Deploy to Motia Cloud

You can deploy your Research Paper Assistant to Motia Cloud using either the CLI or the web interface.

#### Using the Motia CLI

Deploy with a specific version:

```bash
motia cloud deploy --api-key your-api-key-here --version-name 1.0.0
```

Deploy to a specific environment with environment variables:

```bash
motia cloud deploy --api-key your-api-key-here \
  --version-name 1.0.0 \
  --env-file .env.production \
  --environment-id env-id
```

#### Using the Web Interface

For a visual deployment experience, use the Motia Cloud web interface:

1. Have your local project running (`pnpm dev`)
2. Go to **Import from Workbench** on [Motia Cloud](https://cloud.motia.dev)
3. Select the port your local project is running on (default: 3000)
4. Choose the project and environment name
5. Add environment variables:
   - `GOOGLE_API_KEY`
6. Click **Deploy** and watch the magic happen! ✨

For detailed instructions, see the [Motia Cloud Deployment Guide](https://www.motia.dev/docs/deployment-guide/motia-cloud/deployment#using-web-interface).

## 🙏 Acknowledgements

- [Motia](https://motia.dev/) for the powerful event-driven framework
- [Google Gemini](https://deepmind.google/technologies/gemini/) for the AI capabilities
- [TypeScript](https://www.typescriptlang.org/) for type safety

---

<div align="center">
  <p>Built with ❤️ using Motia by </p>
  <p>
    <p>
    <a href="https://github.com/rohitg00">Rohit Ghumare</a>
  </p>
    <a href="https://motia.dev/">Website</a> |
    <a href="https://github.com/MotiaDev/motia">GitHub</a> |
    <a href="https://discord.gg/motia">Discord</a>
  </p>
</div>