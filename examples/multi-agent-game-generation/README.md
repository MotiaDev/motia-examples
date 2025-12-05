# 🎮 Multi-Agent Game Generation Pipeline

An intelligent, event-driven backend system that orchestrates the full game development lifecycle from spec to executable Python code using multiple AI agents powered by Google Gemini.

![Motia Workbench](docs/img/workbench.png)

## Overview

This Motia application demonstrates how to build complex, multi-step AI agent workflows with:

- **Event-driven architecture** - Stateful workflow orchestration
- **Multi-agent collaboration** - Specialized AI roles working together
- **Feedback loops** - Automatic revision cycles for quality assurance
- **In-browser game player** - Play generated games directly in Workbench
- **Observability** - Full visibility into agent reasoning and decisions
- **Robust error handling** - Retry mechanisms and JSON recovery


### Event Queue Visualization

![Event Queues](docs/img/queues.png)

*Real-time monitoring of the event-driven pipeline with BullMQ queues*

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/motia-dev/motia-examples.git
cd examples/multi-agent-game-generation

# Install dependencies
npm install

# Set up environment variables
export GEMINI_API_KEY="your-gemini-api-key"

# Generate TypeScript types
npm run generate-types

# Start the development server
npm run dev
```

### Generate Your First Game

```bash
# Submit a game generation request
curl -X POST http://localhost:3000/games/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Space Invaders Clone",
    "genre": "arcade",
    "mechanics": ["shooting", "movement", "collision detection", "scoring"],
    "theme": "retro space",
    "targetAudience": "casual gamers",
    "complexity": "medium"
  }'

# Response:
# {
#   "flowId": "game-abc123...",
#   "status": "accepted",
#   "message": "Game generation started...",
#   "statusEndpoint": "/games/game-abc123.../status",
#   "downloadEndpoint": "/games/game-abc123.../download"
# }
```

### Check Progress

```bash
curl http://localhost:3000/games/{flowId}/status
```

### Download the Game

```bash
curl http://localhost:3000/games/{flowId}/download
```

## 🎮 Game Viewer Plugin

The project includes a **Game Viewer** plugin for the Motia Workbench that lets you:

![Game Viewer Plugin](docs/img/game-viewer-plugin.png)

*Play generated games directly in the browser using Pyodide (Python WebAssembly)*

### Features

| Feature | Description |
|---------|-------------|
| 📋 **Games List** | Browse all generated games with status, scores, and grades |
| 🔄 **Auto-refresh** | Updates every 5 seconds to show new games |
| ▶️ **Play in Browser** | Run console-based Python games directly using Pyodide |
| 📄 **Code Viewer** | Browse generated files with syntax highlighting |
| 📋 **Copy Code** | One-click copy functionality |
| ⬇️ **Download** | Download all game files at once |
| 📐 **Architecture View** | See the AI architect's design overview |

### In-Browser Game Player

The Game Viewer uses **Pyodide** (Python compiled to WebAssembly) to run games directly in your browser:

- ✅ **Console games** - Text adventures, number guessing, quiz games
- ✅ **Simple games** - ASCII art games, turn-based games
- ⚠️ **Pygame games** - Download and run locally (GUI not supported in browser)

### Accessing the Game Viewer

1. Start the dev server: `npm run dev`
2. Open Workbench: `http://localhost:3000/__workbench`
3. Click the **🎮 Game Viewer** tab at the bottom

## 📚 API Reference

### Available Endpoints

![API Endpoints](docs/img/endpoints.png)

*All available API endpoints with their schemas and configurations*

### POST /games/generate

Start a new game generation pipeline.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Name of the game (1-100 chars) |
| `genre` | string | Yes | Game genre (e.g., "arcade", "puzzle", "rpg") |
| `mechanics` | string[] | Yes | List of game mechanics |
| `theme` | string | Yes | Visual/narrative theme |
| `targetAudience` | string | Yes | Intended player demographic |
| `complexity` | enum | Yes | `"simple"`, `"medium"`, or `"complex"` |
| `additionalRequirements` | string | No | Extra instructions |

**Response (202 Accepted):**

```json
{
  "flowId": "game-uuid",
  "status": "accepted",
  "message": "Game generation started...",
  "estimatedTime": "2-4 minutes",
  "statusEndpoint": "/games/{flowId}/status",
  "downloadEndpoint": "/games/{flowId}/download"
}
```

### GET /games/:flowId/status

Get the current status of a game generation flow.

**Response (200 OK):**

```json
{
  "flowId": "game-uuid",
  "status": "coding",
  "currentStep": "engineer-agent",
  "progress": {
    "architect": "completed",
    "engineer": "in_progress",
    "qaReview": "pending",
    "chiefQa": "pending"
  },
  "gameTitle": "Space Invaders Clone",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:01:00.000Z",
  "revisionCount": 0,
  "logs": [...]
}
```

### GET /games/:flowId/download

Download the completed game files.

**Response (200 OK):**

```json
{
  "flowId": "game-uuid",
  "gameTitle": "Space Invaders Clone",
  "status": "completed",
  "files": [
    {
      "filename": "main.py",
      "content": "# Complete Python code..."
    }
  ],
  "mainFile": "main.py",
  "runInstructions": "python main.py",
  "metadata": {
    "genre": "arcade",
    "complexity": "medium",
    "qaScore": 85,
    "qualityGrade": "B"
  }
}
```

### GET /games

List all game generation flows.

**Response (200 OK):**

```json
{
  "games": [
    {
      "flowId": "game-uuid",
      "title": "Space Invaders Clone",
      "genre": "arcade",
      "complexity": "medium",
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "qaScore": 85,
      "qualityGrade": "B"
    }
  ],
  "total": 1
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `PORT` | No | Server port (default: 3000) |

### Complexity Levels

| Level | Files | Estimated Time | Features |
|-------|-------|----------------|----------|
| `simple` | 1 | 1-2 min | Basic mechanics, single file |
| `medium` | 2-3 | 2-4 min | Multiple files, moderate complexity |
| `complex` | 4-5 | 3-5 min | Advanced mechanics, full architecture |

## 📁 Project Structure

```
day7automation/
├── steps/
│   └── game-generation/
│       ├── generate-game-api.step.ts    # POST /games/generate
│       ├── architect-agent.step.ts       # Senior Game Architect
│       ├── engineer-agent.step.ts        # Senior Software Engineer
│       ├── qa-agent.step.ts              # QA Engineer
│       ├── chief-qa-agent.step.ts        # Chief QA Engineer
│       ├── revision-handler.step.ts      # Revision routing
│       ├── completion-handler.step.ts    # Final delivery
│       ├── get-status-api.step.ts        # GET /games/:id/status
│       ├── download-game-api.step.ts     # GET /games/:id/download
│       └── list-games-api.step.ts        # GET /games
├── plugins/
│   └── components/
│       └── game-viewer/
│           └── index.tsx                 # Game Viewer Workbench plugin
├── src/
│   ├── services/
│   │   └── gemini/
│   │       ├── index.ts                  # Service exports
│   │       ├── architect-agent.ts        # Architect AI logic
│   │       ├── engineer-agent.ts         # Engineer AI logic
│   │       ├── qa-agent.ts               # QA AI logic
│   │       └── chief-qa-agent.ts         # Chief QA AI logic
│   └── utils/
│       └── flow-helpers.ts               # State management utilities
├── middlewares/
│   └── error-handler.middleware.ts       # Error handling
├── docs/
│   └── img/                              # Screenshots
│       ├── workbench.png
│       ├── game-viewer-plugin.png
│       ├── queues.png
│       └── endpoints.png
├── motia.config.ts                       # Motia configuration + plugins
├── package.json
└── README.md
```

## 🛡️ Error Handling

The system includes robust error handling for AI responses:

| Error Type | Handling Strategy |
|------------|-------------------|
| **Truncated JSON** | Attempt to repair and extract partial results |
| **Malformed JSON** | Multiple repair strategies with retry |
| **Rate Limiting** | Automatic 5s delay and retry (up to 3 times) |
| **API Errors** | Graceful fallback with default responses |
| **Parse Failures** | Recovery from partial data when possible |

## 🔍 Observability

The system provides full visibility into the multi-agent workflow:

- **Structured Logging** - Every agent logs decisions and progress
- **State Tracking** - All artifacts stored and retrievable
- **Event Tracing** - Full event chain visible in Workbench
- **Error Context** - Detailed error messages with trace IDs

Access the Motia Workbench at `http://localhost:3000/__workbench` to:
- Visualize the workflow graph
- Monitor real-time event flow
- Inspect state at each step
- Review logs and errors
- **Play generated games** in the Game Viewer

## 🛠️ Development

```bash
# Run development server with hot reload
npm run dev

# Generate TypeScript types after modifying step configs
npm run generate-types

# Build for production
npm run build
```

## 📝 Example Game Specs

### Simple Console Game (runs in browser)

```json
{
  "title": "Number Guessing Game",
  "genre": "puzzle",
  "mechanics": ["random generation", "user input", "feedback"],
  "theme": "classic",
  "targetAudience": "beginners",
  "complexity": "simple"
}
```

### Medium Arcade Game

```json
{
  "title": "Snake Game",
  "genre": "arcade",
  "mechanics": ["movement", "collision", "growth", "scoring"],
  "theme": "retro",
  "targetAudience": "casual gamers",
  "complexity": "medium"
}
```

### Complex Strategy Game

```json
{
  "title": "Tower Defense",
  "genre": "strategy",
  "mechanics": ["tower placement", "enemy waves", "upgrades", "resource management"],
  "theme": "fantasy",
  "targetAudience": "strategy enthusiasts",
  "complexity": "complex"
}
```

## 📸 Screenshots

### Motia Workbench
![Workbench Overview](docs/img/workbench.png)

### Game Viewer Plugin
![Game Viewer](docs/img/game-viewer-plugin.png)

### Event Queues
![Event Queues](docs/img/queues.png)

### API Endpoints
![API Endpoints](docs/img/endpoints.png)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run generate-types`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ using [Motia](https://motia.dev) and Google Gemini
