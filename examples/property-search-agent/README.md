# AI Real Estate Agent - Event-Driven Backend

> A high-performance, event-driven real estate search system built with **Motia** (backend framework) and **Agno** (AI agents).

![Workbench](./docs/img/workbench.png)

## 📊 Quick Stats

- 🚀 **2 API Endpoints** - Simple polling pattern
- ⚡ **4 Parallel Processors** - Event-driven architecture (57% faster than sequential)
- 🌐 **Concurrent Website Scraping** - Multiple websites scraped simultaneously
- 🎨 **7 Beautiful UI Components** - 6 step visualizations + 1 interactive dashboard plugin
- 🧹 **~1,150 Lines of Code** - Production-ready and maintainable
- ✅ **Use any real estate website** - Zillow, Realtor.com, Redfin, and more
- 🎯 **Interactive Dashboard** - Full React app with search, progress tracking, property cards
- 🔌 **Local Plugin System** - No build required, instant hot reload

## 🎯 What This Does

Search for properties across multiple real estate websites with **parallel AI analysis**:
- 🔍 **Property scraping** from any real estate website (Firecrawl)
- 🤖 **AI-powered market analysis** with Agno + OpenAI GPT-4o-mini
- 📈 **Property enrichment** - schools, crime stats, walkability scores
- 🏘️ **Neighborhood analysis** - parks, amenities, safety ratings

![plugin ui dashboard](./docs/img/plugin-ui.png)

**All 4 processors run in PARALLEL for maximum speed!**

---

## ⚡ Architecture Highlights

### Event-Driven Parallel Processing
```
Single API Call
    ↓
Emits 4 Events Simultaneously
├─ property.scrape       → Scrapes 2+ websites concurrently (10s)
│                          asyncio.gather for parallel execution
├─ property.enrich       → Gets enrichment data (5s)
├─ market.analyze        → AI market analysis with Agno (3s)
└─ neighborhood.analyze  → Analyzes neighborhoods (2s)
    ↓
All Run in PARALLEL → Results Aggregate → Done! (~10s total)
```

**57% faster than sequential processing!**

**Note:** Property scraping uses `asyncio.gather` for concurrent website scraping. If you hit Firecrawl API concurrency limits, the code can be easily modified to scrape sequentially (see `scrape_properties.py`).

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Node.js packages
npm install

# Python packages
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file:

```bash
# Required
OPENAI_API_KEY=your_openai_key_here
FIRECRAWL_API_KEY=your_firecrawl_key_here

# Optional
MOTIA_PORT=3000
MOTIA_ENV=development
```

**Get API Keys:**
- OpenAI: https://platform.openai.com/api-keys
- Firecrawl: https://firecrawl.dev

### 3. Start the Server

```bash
npm run dev
```

The server will start on:
- **API Server:** http://localhost:3000
- **Workbench (UI):** http://localhost:3000
- **Interactive Dashboard:** Click the "Property Search" tab in the Workbench

---

## 🎨 Interactive Dashboard Plugin

The project includes a **full-featured interactive dashboard plugin** built with Motia's plugin system:

### Features:
- 📝 **Search Form** - Configure city, state, budget, property type, bedrooms, bathrooms
- 🔄 **Real-Time Monitoring** - Live progress updates with visual progress bars
- 📊 **Statistics Dashboard** - Properties found, average price, completion status
- 🏠 **Property Cards** - Beautiful card-based layout with all property details
- 🤖 **AI Analysis Display** - Shows market analysis and insights from Agno agents
- 🎯 **One-Click Access** - View listings directly from the dashboard

### Using the Dashboard:
1. Start your Motia server with `npm run dev`
2. Open the Workbench at http://localhost:3000
3. Click the **"Property Search"** tab at the top
4. Enter your search criteria and click "Start Property Search"
5. Watch real-time progress as 4 parallel processors work simultaneously
6. View results with property cards, AI analysis, and statistics

**The dashboard uses Motia's local plugin system** - no separate build required! It's a perfect example of building interactive UIs with Motia's plugin architecture.

### How Plugins Work:

Plugins are registered in `motia.config.ts` and loaded automatically:

```typescript
// Property Dashboard Plugin
function propertyDashboardPlugin(motia: MotiaPluginContext): MotiaPlugin {
  return {
    dirname: path.join(__dirname, 'plugins'),
    workbench: [
      {
        componentName: 'PropertyDashboard',
        packageName: '~/plugins/property-dashboard',  // Local plugin path
        label: 'Property Search',
        position: 'top',
        labelIcon: 'building-2',
      },
    ],
  }
}
```

**Key Points:**
- `~/` prefix loads from local project (no npm package needed)
- No build step required - instant hot reload
- Full React + TypeScript support
- Access to Motia UI components (Badge, Button, etc.)
- Integrates directly with your API endpoints

---

## 🎨 UI Step Visualizations (.tsx files)

All steps can have **custom UI visualizations** in Motia Workbench by creating a `.tsx` file next to your step:

```
steps/
├── api/
│   ├── start-property-search.step.ts    ← Logic (TypeScript/Python)
│   └── start-property-search.step.tsx   ← UI Only (React component)
```

**Important:** `.tsx` files are **ONLY for visualization** in Workbench - they don't affect step execution!

### What .tsx Files Do:
- ✅ Customize how steps appear in Workbench flow diagrams
- ✅ Add badges, icons, colors, and visual indicators
- ✅ Show step metadata (status, data, configurations)
- ✅ Make workflows easier to understand visually

### What .tsx Files DON'T Do:
- ❌ They don't contain business logic
- ❌ They don't execute or process data
- ❌ They don't affect API responses
- ❌ They're purely cosmetic for Workbench UI

### Example UI Override:

```typescript
// start-property-search.step.tsx
import { ApiNode, ApiNodeProps } from 'motia/workbench'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex gap-2">
        {props.data.emits.map((event) => (
          <span className="px-2 py-1 bg-blue-500 text-white rounded">
            {event}
          </span>
        ))}
      </div>
    </ApiNode>
  )
}
```

This creates a beautiful visual in Workbench showing all emitted events, but the actual API logic remains in `.step.ts`!

---

## 📡 API Usage

### 1. Start Property Search

Triggers parallel property scraping, market analysis, enrichment, and neighborhood analysis:

```bash
POST http://localhost:3000/api/property-search
Content-Type: application/json

{
  "city": "Austin",
  "state": "TX",
  "budgetRange": {
    "min": 300000,
    "max": 800000
  },
  "selectedWebsites": ["Zillow", "Realtor.com"],
  "propertyType": "Single Family",
  "bedrooms": 3,
  "bathrooms": 2,
  "specialFeatures": ["Good schools", "Parks"]
}
```

**Response:**
```json
{
  "searchId": "search_1234567890_abc123",
  "status": "processing",
  "message": "Search initiated with 4 parallel processes",
  "eventsTriggered": [
    "property.scrape",
    "property.enrich",
    "market.analyze",
    "neighborhood.analyze"
  ]
}
```

### 2. Get Results (Polling)

Poll this endpoint to retrieve comprehensive results with all parallel analysis data:

```bash
GET http://localhost:3000/api/property-search/{searchId}
```

**Response:**
```json
{
  "searchId": "search_1234567890_abc123",
  "status": "completed",
  "progress": 1.0,
  "properties": [
    {
      "address": "302 Tesla Cir, Round Rock, TX 78681",
      "price": "$475,000",
      "bedrooms": "4",
      "bathrooms": "3",
      "square_feet": "2,243",
      "property_type": "House",
      "listing_url": "https://www.zillow.com/...",
      "agent_contact": "CAVALIER REAL ESTATE"
    }
  ],
  "totalCount": 2,
  "marketAnalysis": {
    "fullAnalysis": "Market condition: Seller's market..."
  },
  "enrichmentData": {
    "schoolRatings": "Austin has highly rated schools",
    "crimeStats": "Low crime rates in area"
  },
  "neighborhoodAnalysis": {
    "topNeighborhoods": ["Round Rock", "North Austin"]
  },
  "message": "Property search completed successfully"
}
```

**Polling Pattern:**
```bash
# Check every 3-5 seconds until status = "completed"
while true; do
  curl http://localhost:3000/api/property-search/$SEARCH_ID
  sleep 3
done
```

---

## 🏗️ Project Structure

```
├── plugins/                                    (1 interactive plugin)
│   └── property-dashboard/
│       └── index.tsx                           ← 🎨 React dashboard (570+ lines)
│                                                  Full search form, progress tracking,
│                                                  property cards, error handling
│
├── steps/
│   ├── api/                                    (2 endpoints with UI)
│   │   ├── start-property-search.step.ts       ← Logic: POST endpoint
│   │   ├── start-property-search.step.tsx      ← UI: Shows parallel processors badge
│   │   ├── get-property-results.step.ts        ← Logic: GET endpoint  
│   │   └── get-property-results.step.tsx       ← UI: Shows data checklist
│   │
│   ├── events/                                 (4 parallel processors with UI)
│   │   ├── property-search-processor_step.py   ← Logic: Scrapes properties
│   │   ├── property-search-processor_step.tsx  ← UI: Firecrawl icon + "Fast: No AI" badge
│   │   ├── market-analysis-processor_step.py   ← Logic: AI market analysis
│   │   ├── market-analysis-processor_step.tsx  ← UI: Agno+GPT-4 badge
│   │   ├── property-enrichment-processor_step.py ← Logic: Schools, crime, walkability
│   │   ├── property-enrichment-processor_step.tsx ← UI: Enrichment categories grid
│   │   ├── neighborhood-analysis-processor_step.py ← Logic: Neighborhood scoring
│   │   └── neighborhood-analysis-processor_step.tsx ← UI: Score visualization
│   │
│   └── streams/                                (2 real-time streams)
│       ├── property-search-progress.stream.ts  ← Progress updates
│       └── property-results.stream.ts          ← Final aggregated results
│
├── src/services/                               (3 essential services)
│   ├── property_scraper_service/               ← Fast CONCURRENT scraping
│   │   ├── __init__.py                            Uses asyncio.gather for parallel
│   │   └── scrape_properties.py                   Scrapes multiple URLs at once
│   ├── agents/                                 ← Agno AI agents
│   │   └── property_agents.py                     Market analysis + valuations
│   └── firecrawl/                              ← Web scraping API client
│       └── firecrawl_service.py                   Firecrawl integration
│
├── middlewares/                                (2 middlewares)
│   ├── error-handler.middleware.ts             ← Global error handling
│   └── logger.middleware.ts                    ← Request/response logging
│
└── motia.config.ts                             ← Plugin registration
                                                   Loads propertyDashboardPlugin
```

### File Structure Explanation:

**`.step.ts` / `.step.py` = LOGIC** (Business logic, API handlers, event processors)  
**`.step.tsx` = UI ONLY** (Workbench visualization, no execution)  
**`plugins/` = Interactive UI** (Full React dashboards with state management)

**✨ UI System:**
- 🎨 **1 Dashboard Plugin** - Interactive search interface (index.tsx)
- 🎯 **6 Step UI Overrides** - Custom visualizations for each step (.tsx files)
- 🏷️ **Color-coded Badges** - Visual indicators for processor types
- 📊 **Real-time Updates** - Progress bars, status badges, property cards
- 🔌 **Local Plugin** - No build required, instant hot reload with `~/` path

---

## 🔌 Understanding the UI System

This project demonstrates **two types of UI customization** in Motia:

### 1. Step UI Visualizations (.tsx files)

**Purpose:** Customize how steps appear in Workbench **flow diagrams**

**Location:** Next to step files
```
steps/api/start-property-search.step.ts   ← Logic
steps/api/start-property-search.step.tsx  ← Visual override
```

**What they do:**
- Enhance step nodes in the flow diagram
- Show badges, icons, status indicators
- Display metadata (emits, subscribes, etc.)
- **Purely visual** - no logic execution

**Use case:** Making your workflow diagram easier to understand

---

### 2. Dashboard Plugins (plugins/ folder)

**Purpose:** Create full **interactive applications** with forms, buttons, state management

**Location:** `plugins/` directory
```
plugins/property-dashboard/index.tsx  ← Full React app
```

**What they do:**
- Create custom tabs in Workbench
- Build complete UIs with forms and inputs
- Call your API endpoints
- Manage state with React hooks
- Display data in tables, cards, charts

**Use case:** Building admin panels, dashboards, monitoring tools

---

### Key Differences:

| Feature | Step UI (.tsx) | Dashboard Plugin |
|---------|---------------|------------------|
| **Purpose** | Visualize steps in flow | Interactive application |
| **Location** | Next to step files | `plugins/` folder |
| **Functionality** | Display only | Full interactivity |
| **State Management** | No state | React hooks |
| **API Calls** | No | Yes (fetch, etc.) |
| **User Input** | No | Forms, buttons, etc. |
| **Registration** | Automatic | `motia.config.ts` |
| **Build Required** | No | No (with `~/` path) |

### This Project Uses Both:

✅ **6 Step UI Overrides** - Make the flow diagram beautiful  
✅ **1 Dashboard Plugin** - Interactive search interface

**Result:** A beautiful, functional property search system! 🎉

---

## 🎯 How It Works

### 1. Event-Driven Architecture (Motia)

When you call `POST /api/property-search`, the API step emits **multiple events**:

```typescript
// API emits these events simultaneously
await emit({ topic: 'property.scrape', data: {...} })
await emit({ topic: 'market.analyze', data: {...} })
await emit({ topic: 'property.enrich', data: {...} })
await emit({ topic: 'neighborhood.analyze', data: {...} })
```

### 2. Parallel Event Processors

Each event is handled by a separate processor **running in parallel**:

- **PropertySearchProcessor** - Scrapes properties from multiple URLs
- **MarketAnalysisProcessor** - Uses Agno AI for market insights
- **PropertyEnrichmentProcessor** - Gets school ratings, crime stats
- **NeighborhoodAnalysisProcessor** - Analyzes neighborhoods

### 3. Result Aggregation

The main processor aggregates all parallel results:

```python
# Get results from all parallel processors
market_data = await state.get('market_analysis', search_id)
enrichment = await state.get('enrichment', search_id)
neighborhoods = await state.get('neighborhood_analysis', search_id)

# Combine into final results
final_results = {
    'properties': scraped_properties,
    'marketAnalysis': market_data,
    'enrichmentData': enrichment,
    'neighborhoodAnalysis': neighborhoods
}
```

---

## 🤖 AI Agents (Agno)

### Market Analysis Agent
```python
# Uses OpenAI for market trend analysis
market_agent = create_market_analysis_agent(provider='openai')
result = await analyze_properties_with_agent(market_agent, prompt)
```

Provides:
- Market condition (buyer's/seller's market)
- Price trends
- Best neighborhoods
- Investment outlook

### Property Valuation Agent
```python
# Uses OpenAI for property valuations
valuation_agent = create_property_valuation_agent(provider='openai')
result = await analyze_properties_with_agent(valuation_agent, prompt)
```

Provides:
- Value assessment (fair/over/under priced)
- Investment potential
- Recommendations

---

## 📊 Performance

| Metric | Sequential | Parallel | Improvement |
|--------|------------|----------|-------------|
| Property Scraping | 10s | 10s | - |
| Market Analysis | +5s | 0s (parallel) | **100%** |
| Enrichment | +5s | 0s (parallel) | **100%** |
| Neighborhoods | +3s | 0s (parallel) | **100%** |
| **Total** | **23s** | **~10s** | **⚡ 57% faster** |

---

## 🔧 Configuration

### Conditional Event Logic

The API intelligently decides which events to trigger:

```typescript
// Always scrape properties
await emit({ topic: 'property.scrape' })

// Enrich only for high-budget searches
if (budgetMax > 500000) {
  await emit({ topic: 'property.enrich' })
}

// Analyze neighborhoods only if user has preferences
if (preferences.length > 0) {
  await emit({ topic: 'neighborhood.analyze' })
}
```

---

## 🛠️ Development

### Generate TypeScript Types

```bash
npm run generate-types
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run generate-types # Generate TypeScript types
```

---

## 🌐 Technologies

- **[Motia](https://motia.dev)** - Event-driven backend framework
- **[Agno](https://docs.agno.com)** - AI agent framework
- **[OpenAI](https://openai.com)** - GPT-4o-mini for AI analysis
- **[Firecrawl](https://firecrawl.dev)** - Web scraping API

---

## ✅ Features

- ✅ **Event-driven architecture** with parallel processing (57% faster!)
- ✅ **Interactive Dashboard Plugin** - Full-featured UI with real-time search and monitoring
- ✅ **Multi-language support** (TypeScript + Python)
- ✅ **Real-time streaming** with progress updates
- ✅ **AI-powered analysis** with Agno + OpenAI GPT-4o-mini
- ✅ **Beautiful UI components** for Motia Workbench visualization (7 total)
- ✅ **2 API endpoints** (simple polling pattern)
- ✅ **4 parallel processors** (scraping, AI, enrichment, neighborhoods)
- ✅ **Fault-tolerant** with comprehensive error handling
- ✅ **Type-safe** with Zod schemas (TypeScript) and JSON Schema (Python)
- ✅ **Clean architecture** following DDD patterns
- ✅ **Production-ready** with real Firecrawl integration
- ✅ **Local plugin system** - No build required, instant development

---

## 📝 Complete Example

```bash
# 1. Start a property search
RESPONSE=$(curl -s -X POST http://localhost:3000/api/property-search \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Austin",
    "state": "TX",
    "budgetRange": {"min": 300000, "max": 800000},
    "selectedWebsites": ["Zillow", "Realtor.com"],
    "propertyType": "Single Family",
    "bedrooms": 3,
    "bathrooms": 2,
    "specialFeatures": ["Good schools", "Parks"]
  }')

# 2. Extract searchId
SEARCH_ID=$(echo $RESPONSE | jq -r '.searchId')
echo "Search ID: $SEARCH_ID"

# 3. Poll for results (every 3 seconds)
while true; do
  RESULT=$(curl -s "http://localhost:3000/api/property-search/$SEARCH_ID")
  STATUS=$(echo $RESULT | jq -r '.status')
  
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo $RESULT | jq '.properties'
    break
  fi
  
  sleep 3
done
```

**Real Result Example:**
```json
{
  "address": "302 Tesla Cir, Round Rock, TX 78681",
  "price": "$475,000",
  "bedrooms": "4",
  "bathrooms": "3",
  "square_feet": "2,243",
  "property_type": "House",
  "agent_contact": "CAVALIER REAL ESTATE"
}
```

---

## 🎉 Summary

This is a **production-ready, event-driven property search backend** that showcases:

1. ⚡ **Parallel Processing** - 4 event processors running simultaneously (57% faster!)
2. 🎨 **Interactive Dashboard** - Full-featured plugin with search form, real-time monitoring, property cards
3. 🏗️ **Event-Driven Architecture** - Built with Motia framework for scalability
4. 🤖 **AI-Powered Analysis** - Agno + OpenAI GPT-4o-mini for market insights
5. 🎯 **Beautiful UI** - 7 custom components (6 step visualizations + 1 dashboard plugin)
6. 🌐 **Real Web Scraping** - Firecrawl integration with any real estate website
7. 📊 **Real-Time Streaming** - Progress updates and result aggregation
8. 🧹 **Clean Code** - Only ~1,150 lines of production code, DDD patterns
9. 🚀 **Simple API** - Just 2 endpoints (POST to start, GET to poll)
10. 🔌 **Plugin System** - Demonstrates Motia's powerful local plugin architecture

**Tested with real data - works in production!** ✅

---

## 📞 Need Help?

- **Motia Docs:** https://motia.dev/docs
- **Agno Docs:** https://docs.agno.com
- **Issues:** Check server logs in terminal

---

## 🔧 Troubleshooting

### Firecrawl Concurrency Limit

**Problem:** Getting timeout errors when scraping multiple websites?

**Cause:** Firecrawl's free/starter plan has a low concurrency limit (1-2 concurrent requests).

**Solution 1 - Upgrade Firecrawl Plan (Recommended):**
- Increases concurrency limit
- Keeps parallel scraping benefits
- 57% performance improvement maintained

**Solution 2 - Switch to Sequential Scraping:**

Edit `src/services/property_scraper_service/scrape_properties.py`:

```python
# Change FROM (parallel):
scrape_tasks = [_scrape_single_url(url, ...) for url in urls]
results = await asyncio.gather(*scrape_tasks)

# Change TO (sequential):
results = []
for url in urls:
    result = await _scrape_single_url(url, ...)
    results.append(result)
```

Also increase timeout:
```python
timeout=60.0  # Instead of 15.0
```

**Trade-off:** Sequential is slower but works with free Firecrawl plan.

---

## 🎨 Plugin Development Tips

### Creating Your Own Dashboard Plugin:

1. Create a folder in `plugins/`:
   ```bash
   mkdir plugins/my-dashboard
   ```

2. Create `index.tsx`:
   ```tsx
   export const MyDashboard = () => {
     return <div>My Custom Dashboard</div>
   }
   ```

3. Register in `motia.config.ts`:
   ```typescript
   function myDashboardPlugin(motia: MotiaPluginContext): MotiaPlugin {
     return {
       dirname: path.join(__dirname, 'plugins'),
       workbench: [{
         componentName: 'MyDashboard',
         packageName: '~/plugins/my-dashboard',
         label: 'My Dashboard',
         position: 'top',
         labelIcon: 'layout-dashboard',
       }],
     }
   }
   ```

4. Add to plugins array:
   ```typescript
   export default config({
     plugins: [...existingPlugins, myDashboardPlugin],
   })
   ```

**Available Motia UI Components:**
- `Badge` - Status indicators
- `Button` - Click actions
- Lucide Icons - All icons from lucide-react
- Tailwind CSS - Full utility classes

**No build required!** Just save and refresh Workbench (Cmd/Ctrl + R).

---

Built with ❤️ using Motia + Agno
