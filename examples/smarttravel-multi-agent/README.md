# ✈️ SmartTravel Multi-Agent System

**Intelligent travel planning powered by AI agents**

SmartTravel is a multi-agent travel planning system built with [Motia](https://motia.dev) that transforms simple inputs into comprehensive, personalized travel itineraries. Powered by 6 specialized AI agents working in harmony.

![SmartTravel Multi-Agent System](./public/frontend.png)
![SmartTravel Multi-Agent System](./public/workbench.png)

## 🎯 Features

- **Personalized Planning** - Tailored to your travel style, budget, and interests
- **Multi-Agent Architecture** - 6 specialized agents handle different aspects:
  - 🏛️ **Destination Explorer** - Researches attractions and hidden gems
  - ✈️ **Flight Search Agent** - Finds optimal flight options
  - 🏨 **Hotel Search Agent** - Discovers perfect accommodations
  - 🍽️ **Dining Agent** - Curates culinary experiences
  - 📅 **Itinerary Specialist** - Crafts day-by-day schedules
  - 💰 **Budget Agent** - Optimizes costs and spending
- **Real-time Status Tracking** - Monitor planning progress
- **Beautiful Workbench Visualization** - See the agent workflow in action

## 🛠️ Tech Stack

**Backend:**
- **Framework**: Motia
- **AI**: OpenAI GPT-4o (latest model)
- **Architecture**: Event-driven multi-agent system
- **Type Safety**: Zod schemas

**Frontend:**
- **React 18** - UI library
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Data fetching & caching
- **TanStack Form** - Form state management
- **Tailwind CSS** - Modern styling
- **Vite** - Fast build tool

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key

## 🚀 Quick Start

### 1. Install Dependencies

**Backend:**
```bash
npm install
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

### 3. Run Development Servers

**Terminal 1 - Backend (Motia):**
```bash
npm run dev
```
Server starts at `http://localhost:3000`

**Terminal 2 - Frontend (React):**
```bash
cd frontend
npm run dev
```
UI starts at `http://localhost:5173`

### 4. Use the App

Open your browser to `http://localhost:5173` and create your first travel plan! 🎉

## 📡 API Endpoints

### Trigger Travel Planning

**POST** `/api/travel-plan/trigger`

Initiates the travel planning process.

**Request Body:**
```json
{
  "request": {
    "name": "John Doe",
    "destination": "Paris",
    "startingLocation": "New York",
    "duration": 7,
    "travelDates": {
      "start": "2024-06-01",
      "end": "2024-06-08"
    },
    "adults": 2,
    "children": 0,
    "budget": 2000,
    "budgetCurrency": "USD",
    "travelStyle": "comfort",
    "vibes": ["romantic", "cultural"],
    "priorities": ["local experiences", "food"],
    "interests": "Art, history, and wine tasting"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Travel plan generation initiated successfully",
  "planId": "plan_1234567890_abc123",
  "status": "pending"
}
```

### Get Travel Plan Status

**GET** `/api/travel-plan/status/:planId`

Retrieves the current status and results of a travel plan.

**Response:**
```json
{
  "planId": "plan_1234567890_abc123",
  "status": "completed",
  "currentStep": "Travel plan completed",
  "progress": 100,
  "agents": [
    {
      "agentName": "Destination Explorer",
      "status": "completed",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "finalItinerary": {
    "summary": "...",
    "detailedResults": {}
  }
}
```

## 🏗️ Project Structure

```
smarttravel-multi-agent/
├── steps/                           # Motia steps (Backend)
│   ├── trigger-travel-plan/         # API: Trigger planning
│   ├── get-travel-plan-status/      # API: Get status
│   ├── orchestrate-travel-planning/ # Event: Orchestrator
│   ├── research-destination/        # Event: Destination agent
│   ├── search-flights/              # Event: Flight agent
│   ├── search-hotels/               # Event: Hotel agent
│   ├── search-dining/               # Event: Dining agent
│   ├── create-itinerary/            # Event: Itinerary agent
│   ├── optimize-budget/             # Event: Budget agent
│   └── finalize-travel-plan/        # Event: Finalizer
├── src/                             # Backend services
│   ├── services/                    # Business logic
│   │   └── travel-plan/             # Travel plan service
│   └── utils/                       # Utilities
│       └── format-travel-request.ts # Request formatting
├── types/                           # TypeScript types & Zod schemas
│   └── travel-plan.ts
├── frontend/                        # React Frontend
│   ├── src/
│   │   ├── pages/                   # React pages
│   │   │   ├── Home.tsx             # Travel planning form
│   │   │   └── PlanStatus.tsx       # Status & results
│   │   ├── api/                     # API client
│   │   │   └── client.ts
│   │   ├── main.tsx                 # App entry
│   │   └── routeTree.tsx            # TanStack Router
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── package.json
└── tsconfig.json
```

## 🔄 Workflow

1. **User triggers planning** via POST `/api/travel-plan/trigger`
2. **Orchestrator** coordinates the workflow:
   - Phase 1: Research destination (10% progress)
   - Phase 2: Search flights & hotels in parallel (30% progress)
   - Phase 3: Find dining options (50% progress)
   - Phase 4: Create itinerary (70% progress)
   - Phase 5: Optimize budget (85% progress)
   - Phase 6: Finalize plan (100% progress)
3. **Finalizer** combines all results into comprehensive guide
4. **User retrieves plan** via GET `/api/travel-plan/status/:planId`

## 🎨 Workbench Visualization

Each step has a custom UI component for beautiful visualization in Motia Workbench:

- Color-coded agents with emojis
- Real-time progress tracking
- Visual workflow representation
- Agent status indicators

## 📝 Example Usage

### Using curl

```bash
# Trigger travel planning
curl -X POST http://localhost:3000/api/travel-plan/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "request": {
      "name": "Jane Smith",
      "destination": "Tokyo",
      "startingLocation": "Los Angeles",
      "duration": 10,
      "travelDates": {
        "start": "2024-09-15"
      },
      "adults": 1,
      "budget": 3000,
      "budgetCurrency": "USD",
      "travelStyle": "comfort",
      "vibes": ["cultural", "food-focused"],
      "interests": "Japanese culture, anime, ramen"
    }
  }'

# Get status (replace PLAN_ID with actual plan ID)
curl http://localhost:3000/api/travel-plan/status/PLAN_ID
```

## 🎯 Travel Request Parameters

### Required
- `name` - Traveler name
- `destination` - Travel destination
- `startingLocation` - Starting city
- `duration` - Trip duration in days
- `travelDates` - Start and optional end date
- `adults` - Number of adults
- `budget` - Budget per person
- `budgetCurrency` - Currency code

### Optional
- `children` - Number of children
- `rooms` - Number of rooms needed
- `travelStyle` - backpacker | comfort | luxury | eco-conscious
- `pace` - Activity pace levels (0-5)
- `vibes` - Travel vibes array: relaxing, adventure, romantic, cultural, food-focused, nature, photography
- `priorities` - Top priorities
- `interests` - Specific interests
- `beenThereBefore` - Previous visit info
- `lovedPlaces` - Favorite places from past trips
- `additionalInfo` - Special requests

## 🧪 Development

### Generate Types
```bash
npm run generate-types
```

### Build
```bash
npm run build
```

### Production
```bash
npm start
```

## 🐳 Docker Deployment

Deploy SmartTravel using Docker for production environments.

### Prerequisites
- Docker installed on your system
- Your project must have `package.json` in the root

### Quick Deploy

**1. Setup Docker files** (first time only):
```bash
npx motia@latest docker setup
```

This creates `Dockerfile` and `.dockerignore` in your project.

**2. Build and run**:
```bash
npx motia@latest docker run --project-name smarttravel
```

**3. Access your app**:
Open `http://localhost:3000` in your browser

### Manual Docker Build

If you prefer manual control:

**Build the image:**
```bash
docker build -t smarttravel .
```

**Run the container:**
```bash
docker run -it --rm -p 3000:3000 -e OPENAI_API_KEY=your_key_here smarttravel
```

**With environment file:**
```bash
docker run -it --rm -p 3000:3000 --env-file .env smarttravel
```

### Docker Compose Deployment

**Run with Docker Compose:**
```bash
# Create .env file first
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 🎯 Coolify Self-Hosted Deployment

Deploy on your own server with [Coolify](https://coolify.io) - an open-source Heroku/Vercel alternative.

**Quick Setup:**
```bash
# 1. Install Coolify on your Linux server (VPS, cloud, or dedicated)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# 2. Access dashboard at http://your-server-ip:8000

# 3. Deploy SmartTravel:
#    - Connect your Git repository
#    - Add environment variable: OPENAI_API_KEY
#    - Click Deploy
```

**Features:** Auto SSL, Git webhooks, monitoring, no vendor lock-in
**Cost:** From €3.79/month ([Hetzner](https://coolify.io/hetzner))
**📖 Full guide:** See `COOLIFY_DEPLOYMENT.md`

### Cloud Deployment

#### AWS Lightsail (ARM)
Update `Dockerfile` first line to:
```dockerfile
FROM --platform=linux/arm64 motiadev/motia:latest
```

Then build and deploy.

#### Railway
1. Connect your GitHub repository
2. Railway auto-detects the Dockerfile
3. Set `OPENAI_API_KEY` environment variable
4. Deploy automatically

#### Fly.io
Create `fly.toml`:
```toml
app = "smarttravel"

[build]
  dockerfile = "Dockerfile"

[[services]]
  internal_port = 3000
  protocol = "tcp"
```

Deploy:
```bash
fly deploy
```

#### Render
1. Create a Web Service
2. Point to your repository
3. Set environment variables
4. Render builds automatically

### Docker Options

For more deployment options:
```bash
npx motia@latest docker run --help
```

**Note:** Make sure `package-lock.json` is included in your repository for `npm ci` to work in Docker. Otherwise, the Dockerfile will use `npm install --omit=dev`.

For complete deployment guide, see [Motia Self-Hosted Deployment Docs](https://www.motia.dev/docs/deployment-guide/self-hosted)

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `PORT` | Server port | No (default: 3000) |

## 📚 Inspiration

Inspired by multi-agent travel planning concepts and rebuilt as a production-ready system using Motia's architecture and best practices with a modern TanStack frontend.

## 🤝 Contributing

This is a demonstration project showcasing Motia's capabilities for building multi-agent AI systems.

## 📄 License

MIT

## 🙏 Acknowledgments

- Built with [Motia](https://motia.dev)
- Powered by OpenAI GPT-4o
- Multi-agent architecture with Motia

