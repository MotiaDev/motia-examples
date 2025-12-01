# 🎮 AI Tic Tac Toe Tournament

**3v3 AI Tournament: Claude vs Gemini vs OpenAI**

A real-time AI-versus-AI Tic Tac Toe tournament system built with Motia. Watch top AI models from Anthropic, Google, and OpenAI compete in strategic battles!

![AI Arena](dist/ai-arerna.png)

## 🏆 Tournament Format

- **3 Teams**: Team Claude, Team Gemini, Team OpenAI
- **2 Models per Team**: One premium + one fast model
- **15 Matches**: Round-robin (12) + Championship round (3)
- **Scoring**: Win = 3pts, Draw = 1pt, Loss = 0pts

## 🤖 Tournament Roster

| Team Claude | Team Gemini | Team OpenAI |
|-------------|-------------|-------------|
| claude-sonnet-4-5 | gemini-2.5-pro | gpt-4o |
| claude-3-5-haiku-latest | gemini-2.5-flash | gpt-4o-mini |

## 📸 Screenshots

### Tournament Start
![Tournament Start](dist/tournament-start.png)

### Victory Screen
![Victory](dist/vivtory.png)

### Tournament Complete
![Tournament Done](dist/tournament-done.png)

### Motia Workbench
![Workbench](dist/workbench.png)

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Create .env file with API keys
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key  
GOOGLE_API_KEY=your-google-key
```

### 2. Install & Run

```bash
npm install
npm run dev
```

### 3. Open the Game UI

🎮 **Play at**: [`http://localhost:3000/game`](http://localhost:3000/game)

📊 **Workbench**: [`http://localhost:3000`](http://localhost:3000)

## 🎯 Features

### Game UI (`/game`)
- **Single Battle**: Pick any two AI models and watch them fight
- **Tournament Mode**: Full 3v3 team tournament with live standings
- **Model Browser**: View all available AI models with specs
- **Real-time Updates**: Live game board, move history, and timing stats

### Workbench (`/`)
- Visual workflow designer
- Event flow monitoring
- State inspection
- Log viewer

## 📡 API Reference

### Tournament

```bash
# Create tournament
curl -X POST http://localhost:3000/tournament \
  -H "Content-Type: application/json" \
  -d '{"name": "AI Championship"}'

# Start tournament  
curl -X POST http://localhost:3000/tournament/start \
  -H "Content-Type: application/json" \
  -d '{"tournamentId": "tournament-xxx"}'

# Get status
curl http://localhost:3000/tournament/{id}
```

### Single Game

```bash
# Start a game
curl -X POST http://localhost:3000/game \
  -H "Content-Type: application/json" \
  -d '{"playerXModel": "claude-3-5-haiku-latest", "playerOModel": "gpt-4o-mini"}'

# Get game state
curl http://localhost:3000/game/{id}
```

### Models

```bash
# List all models
curl http://localhost:3000/models
```

## 🏗️ Architecture

```
steps/tictactoe/
├── api/           # HTTP endpoints
├── events/        # Background processors  
├── streams/       # Real-time data
└── ui/            # Game UI serving
src/
├── game/          # Game logic
├── models/        # AI model config
└── tournament/    # Tournament logic
public/
├── index.html     # Game UI
├── styles.css     # Styling
└── app.js         # Frontend JS
```

## 🛠️ Commands

```bash
npm run dev            # Start dev server
npm run generate-types # Generate TypeScript types
npm run build          # Build for production
```

## 📚 Learn More

- [Motia Docs](https://motia.dev/docs)
- [Discord](https://discord.gg/motia)
- [GitHub](https://github.com/MotiaDev/motia)
