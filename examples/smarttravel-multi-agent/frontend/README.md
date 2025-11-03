# SmartTravel Frontend

Beautiful, modern frontend for SmartTravel multi-agent system built with **TanStack** libraries.

## 🛠️ Tech Stack

- **React 18** - UI library
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Data fetching & caching
- **TanStack Form** - Form state management
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Frontend will start at `http://localhost:5173`

**Make sure the Motia backend is running on port 3000!**

## 📁 Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts        # API client functions
│   ├── pages/
│   │   ├── Home.tsx         # Travel planning form
│   │   └── PlanStatus.tsx   # Status & results page
│   ├── main.tsx             # App entry point
│   ├── routeTree.tsx        # TanStack Router config
│   └── index.css            # Tailwind imports
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## 🎨 Features

### Home Page (`/`)
- **Beautiful Form** - Clean, modern travel request form
- **TanStack Form** - Reactive form state management
- **Validation** - Client-side validation
- **Travel Vibes** - Visual selection with toggles
- **Responsive** - Mobile-friendly design

### Plan Status Page (`/plan/:planId`)
- **Real-time Updates** - Auto-refreshes every 2s while processing
- **Progress Tracking** - Visual progress bar
- **Agent Status** - See each AI agent's progress
- **Results Display** - Expandable sections for detailed results
- **Markdown Support** - Formatted travel guides

## 🔌 API Integration

Frontend connects to Motia backend via proxy (configured in `vite.config.ts`):

```typescript
// Vite proxies /api/* to http://localhost:3000
fetch('/api/travel-plan/trigger', {...})  // → http://localhost:3000/api/travel-plan/trigger
```

## 🎯 User Flow

1. **User fills form** on home page
2. **Submits request** → API call with TanStack Query mutation
3. **Redirects** to `/plan/:planId` via TanStack Router
4. **Status page** polls API every 2s using TanStack Query
5. **Shows real-time progress** of all 6 agents
6. **Displays final itinerary** when complete

## 🎨 TanStack Libraries Usage

### TanStack Router
```typescript
import { createRouter, createRoute } from '@tanstack/react-router'

const router = createRouter({
  routeTree,
  context: { queryClient },
})
```

### TanStack Query
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['travel-plan', planId],
  queryFn: () => getTravelPlanStatus(planId),
  refetchInterval: 2000,  // Poll while processing
})
```

### TanStack Form
```typescript
const form = useForm({
  defaultValues: {...},
  onSubmit: async ({ value }) => {
    mutation.mutate(value)
  },
})
```

## 🎨 Styling

Uses **Tailwind CSS** for modern, responsive design:
- Gradient backgrounds
- Card-based layouts
- Smooth transitions
- Loading states
- Color-coded agent statuses

## 📦 Build for Production

```bash
npm run build
```

Output in `dist/` folder, ready to deploy to any static hosting.

## 🔧 Development

### Run Both Backend & Frontend

**Terminal 1 (Backend):**
```bash
npm run dev  # Port 3000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev  # Port 5173
```

Visit `http://localhost:5173` to use the app!

## 🌟 Key Features

- ✅ Type-safe routing with TanStack Router
- ✅ Optimized data fetching with TanStack Query
- ✅ Reactive forms with TanStack Form
- ✅ Real-time status updates
- ✅ Beautiful, modern UI with Tailwind
- ✅ Responsive design
- ✅ Loading states & error handling
- ✅ Progress visualization

Perfect companion to the Motia backend! 🚀

