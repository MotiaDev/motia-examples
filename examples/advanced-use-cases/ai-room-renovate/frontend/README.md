# Room Renovation Frontend

Modern, interactive web frontend for the AI Home Renovation Planner.

## Features

- 🎨 **Beautiful UI** - Modern design with Tailwind CSS v4 and shadcn/ui
- 📱 **Responsive** - Works seamlessly on desktop, tablet, and mobile
- ⚡ **Fast** - Built with React 19 and Vite for optimal performance
- 🎯 **Type-Safe** - Full TypeScript support
- 🔄 **Real-time Updates** - Polling for renovation results and renderings
- 🖼️ **AI Renderings** - View and edit photorealistic renderings
- 📊 **Data Visualization** - Interactive budget charts and timelines

## Tech Stack

- **React 19** - Latest React with improved performance
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation
- **Recharts** - Data visualization

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies:**

```bash
cd frontend
npm install
```

2. **Start development server:**

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Backend Connection

The frontend is configured to proxy API requests to `http://localhost:3000`. Make sure the backend server is running:

```bash
# In the root directory
npm run dev
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── renovation/      # Custom renovation components
│   ├── pages/
│   │   ├── Home.tsx         # Landing page
│   │   ├── RenovationForm.tsx  # Multi-step form
│   │   ├── Dashboard.tsx    # Results dashboard
│   │   └── RenderingViewer.tsx # AI rendering viewer
│   ├── services/
│   │   └── renovationApi.ts # API service layer
│   ├── stores/
│   │   └── renovationStore.ts # Zustand state management
│   ├── types/
│   │   └── renovation.ts    # TypeScript types
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## User Flow

1. **Landing Page** → View features and examples
2. **Renovation Form** → Multi-step form to describe project
3. **Loading State** → Animated progress while AI processes
4. **Dashboard** → View complete renovation plan with tabs:
   - Overview - Summary and key metrics
   - Design - Materials, colors, and features
   - Budget - Cost breakdown with chart
   - Timeline - Duration and contractors
   - Action Plan - Step-by-step checklist
5. **Rendering Viewer** → View and edit AI-generated images

## API Integration

The frontend integrates with these backend endpoints:

- `POST /renovation/start` - Submit renovation request
- `GET /renovation/:sessionId/result` - Get renovation plan
- `GET /renovation/:sessionId/rendering` - Get AI rendering
- `POST /renovation/:sessionId/edit` - Edit rendering

## Customization

### Theme Colors

Edit `src/index.css` to customize the color scheme:

```css
:root {
  --primary: #2563EB;
  --accent: #F59E0B;
  /* ... other colors */
}
```

### Typography

Custom font utilities are defined in `src/index.css`:

- `heading-xl`, `heading-lg`, `heading-md`, `heading-sm`
- `body-lg`, `body-md`, `body-sm`

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Deployment

The frontend can be deployed to any static hosting service:

- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

Make sure to configure the API proxy or update the API base URL for production.

## Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Keep components small and focused
4. Write meaningful commit messages

## License

MIT