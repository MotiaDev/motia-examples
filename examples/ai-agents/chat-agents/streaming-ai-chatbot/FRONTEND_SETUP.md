# Frontend Setup Guide

Complete setup guide for the **Streaming AI Chatbot** with modern features including **markdown formatting**, **conversation history**, and **adaptive polling**.

## 🚀 Quick Start

### One-Command Setup
```bash
# Make the startup script executable
chmod +x start-dev.sh

# Start both backend and frontend with all features
./start-dev.sh
```

This automatically:
- ✅ Installs all backend and frontend dependencies
- ✅ Creates `.env` file if missing
- ✅ Starts Motia backend on port 3001
- ✅ Starts Next.js frontend on port 3000
- ✅ Opens both services in your browser

### Manual Setup

#### 1. Install Dependencies
```bash
# Backend dependencies (Motia + OpenAI)
npm install

# Frontend dependencies (Next.js + React + Markdown)
cd frontend && npm install && cd ..
```

#### 2. Environment Configuration
```bash
# Copy and configure environment variables
cp .env.example .env

# Edit .env and add your OpenAI API key
OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### 3. Start Development Servers
```bash
# Option 1: Use the startup script (recommended)
./start-dev.sh

# Option 2: Manual startup
# Terminal 1 - Backend (port 3001)
npm run dev

# Terminal 2 - Frontend (port 3000)  
cd frontend && npm run dev
```

## 🌐 Access Points

- **💬 Chat Interface**: http://localhost:3000 (Main application)
- **🔧 Motia Backend**: http://localhost:3001 (API endpoints)
- **📊 Motia Workbench**: http://localhost:3001 (Development dashboard)

## 🎨 Frontend Architecture

### Project Structure
```
frontend/
├── app/
│   ├── page.tsx                    # Main chat page
│   ├── layout.tsx                  # App layout with metadata
│   └── globals.css                 # Global styles + syntax highlighting
├── components/
│   ├── chat-interface.tsx          # Main chat component with history
│   ├── chat-history.tsx            # Conversation history sidebar
│   ├── markdown-message.tsx        # Markdown rendering component
│   └── ui/
│       └── chatgpt-prompt-input.tsx # Simplified chat input
├── lib/
│   ├── api.ts                      # API client for backend communication
│   └── stream.ts                   # Adaptive polling stream client
├── package.json                    # Dependencies and scripts
├── next.config.js                  # Next.js configuration
├── tailwind.config.js              # Tailwind CSS configuration
└── tsconfig.json                   # TypeScript configuration
```

### Key Components

#### 1. **ChatInterface** (`components/chat-interface.tsx`)
Main chat component with all features:
- ✅ **Conversation Management**: Multiple chat sessions
- ✅ **Real-time Streaming**: Live AI response updates
- ✅ **Markdown Rendering**: Rich text formatting
- ✅ **Adaptive Polling**: Smart update frequency
- ✅ **Error Handling**: Graceful error recovery

#### 2. **ChatHistory** (`components/chat-history.tsx`)
Sidebar for conversation management:
- ✅ **Conversation List**: All previous chats
- ✅ **New Chat Button**: Start fresh conversations
- ✅ **Auto-generated Titles**: From first message
- ✅ **Timestamps**: When conversations occurred

#### 3. **MarkdownMessage** (`components/markdown-message.tsx`)
Rich text rendering with:
- ✅ **Syntax Highlighting**: 20+ programming languages
- ✅ **Code Blocks**: With language detection
- ✅ **Lists & Headers**: Proper markdown formatting
- ✅ **Links & Tables**: Interactive elements
- ✅ **Dark/Light Theme**: Automatic theme support

#### 4. **Adaptive Stream Client** (`lib/stream.ts`)
Smart polling system:
- ✅ **Fast Initial Polling**: 200ms for responsiveness
- ✅ **Intelligent Backoff**: Up to 2s when idle
- ✅ **Activity Detection**: Resets during streaming
- ✅ **Auto-stop**: Stops after 5 idle polls

## 🛠️ Technical Implementation

### Real-time Communication
```typescript
// Adaptive polling with smart backoff
const streamClient = new MotiaStreamClient('http://localhost:3001')

// Subscribe to conversation updates
const unsubscribe = streamClient.subscribe(
  'conversation',
  conversationId,
  (messages) => {
    // Convert to array and sort by timestamp
    const messageArray = Object.entries(messages)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    setMessages(messageArray)
  }
)
```

### Markdown Rendering
```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeHighlight]}
  components={{
    code: ({ inline, className, children }) => {
      if (inline) {
        return (
          <code className="bg-gray-100 dark:bg-gray-800 text-red-600 px-1.5 py-0.5 rounded">
            {children}
          </code>
        )
      }
      
      return (
        <pre className="bg-gray-900 p-4 rounded overflow-x-auto">
          <code className="text-gray-100 text-sm font-mono">
            {children}
          </code>
        </pre>
      )
    }
  }}
>
  {content}
</ReactMarkdown>
```

### Conversation Management
```typescript
const handleNewChat = () => {
  // Save current conversation to history
  if (conversationId && messages.length > 0) {
    const firstUserMessage = messages.find(m => m.from === 'user')?.message || 'New conversation'
    const lastMessage = messages[messages.length - 1]?.message || ''
    
    setConversations(prev => [
      {
        id: conversationId,
        title: firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '...' : ''),
        lastMessage: lastMessage.slice(0, 100) + (lastMessage.length > 100 ? '...' : ''),
        timestamp: new Date().toISOString(),
      },
      ...prev
    ])
  }
  
  // Start new conversation
  setConversationId('')
  setMessages([])
}
```

## 🎨 Styling & Theming

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom color palette for chat interface
      },
      animation: {
        // Custom animations for streaming indicators
      }
    },
  },
  plugins: [],
}
```

### Syntax Highlighting Styles
```css
/* globals.css - Syntax highlighting for code blocks */
.hljs {
  background: #1f2937 !important;
  color: #e5e7eb !important;
}

.hljs-keyword { color: #8b5cf6 !important; font-weight: bold; }
.hljs-string { color: #10b981 !important; }
.hljs-number { color: #f59e0b !important; }
.hljs-comment { color: #6b7280 !important; font-style: italic; }
```

## 📱 Responsive Design

### Mobile-First Approach
```css
/* Mobile-first responsive design */
.chat-container {
  @apply flex flex-col h-screen;
}

.chat-history {
  @apply w-72 hidden md:block; /* Hidden on mobile, visible on desktop */
}

.chat-messages {
  @apply flex-1 overflow-y-auto p-4;
}

.chat-input {
  @apply p-4 border-t;
}
```

### Breakpoint Strategy
- **Mobile** (< 768px): Single column, full-width chat
- **Tablet** (768px - 1024px): Collapsible sidebar
- **Desktop** (> 1024px): Full sidebar with conversation history

## 🔧 Configuration

### Environment Variables
```env
# Frontend configuration (if needed)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Next.js Configuration
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Enable if using external images
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
```

## 🚀 Performance Optimizations

### Adaptive Polling Strategy
```typescript
// Smart polling that reduces server load
class MotiaStreamClient {
  private adaptivePolling(conversationId: string) {
    let pollInterval = 200 // Start fast
    const maxInterval = 2000 // Max 2 seconds
    
    const poll = async () => {
      const messages = await this.fetchMessages(conversationId)
      const isActive = messages.some(m => m.status === 'streaming')
      
      if (isActive) {
        pollInterval = 200 // Reset to fast when active
      } else {
        pollInterval = Math.min(pollInterval * 1.5, maxInterval) // Gradual backoff
      }
      
      setTimeout(poll, pollInterval)
    }
    
    poll()
  }
}
```

### Markdown Rendering Optimization
```typescript
// Memoized markdown component for better performance
const MarkdownMessage = React.memo(({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
    >
      {content}
    </ReactMarkdown>
  )
})
```

## 🧪 Testing

### Component Testing
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest

# Run tests
npm test
```

### Manual Testing Checklist
- ✅ **Chat Functionality**: Send messages and receive responses
- ✅ **Markdown Rendering**: Test code blocks, lists, headers
- ✅ **Conversation History**: Create multiple chats, switch between them
- ✅ **Responsive Design**: Test on mobile, tablet, desktop
- ✅ **Dark/Light Mode**: Toggle themes and verify styling
- ✅ **Error Handling**: Test with invalid API keys, network issues

## 🐛 Troubleshooting

### Common Issues

#### 1. **Frontend not connecting to backend**
```bash
# Check if backend is running
curl http://localhost:3001/health

# Check CORS configuration
# Ensure backend allows frontend origin
```

#### 2. **Markdown not rendering**
```bash
# Verify markdown dependencies
npm list react-markdown remark-gfm rehype-highlight

# Check console for JavaScript errors
```

#### 3. **Polling not working**
```bash
# Check browser network tab for API calls
# Verify conversation API endpoint: /api/conversations/:id
```

#### 4. **Styling issues**
```bash
# Rebuild Tailwind CSS
npm run build:css

# Check for conflicting CSS classes
```

### Debug Mode
```typescript
// Enable debug logging in stream client
const streamClient = new MotiaStreamClient('http://localhost:3001', {
  debug: true // Enables console logging
})
```

## 📦 Dependencies Explained

### Core Dependencies
```json
{
  "next": "^15.5.3",           // React framework with App Router
  "react": "^19.0.0",          // UI library
  "react-dom": "^19.0.0",      // React DOM renderer
  "typescript": "^5.0.0",      // Type safety
  "tailwindcss": "^3.4.0"      // Utility-first CSS
}
```

### Markdown & Syntax Highlighting
```json
{
  "react-markdown": "^9.0.1",     // Markdown rendering
  "remark-gfm": "^4.0.0",         // GitHub Flavored Markdown
  "rehype-highlight": "^7.0.0",   // Syntax highlighting
  "rehype-raw": "^7.0.0"          // Raw HTML support
}
```

### UI Components
```json
{
  "@radix-ui/react-tooltip": "^1.0.7",    // Tooltips
  "@radix-ui/react-dialog": "^1.0.5",     // Modals (if needed)
  "@radix-ui/react-popover": "^1.0.7"     // Popovers (if needed)
}
```

## 🎯 Next Steps

### Potential Enhancements
1. **Voice Input**: Add speech-to-text functionality
2. **File Upload**: Support document and image uploads
3. **Export Conversations**: Download chat history as PDF/Markdown
4. **Search**: Search through conversation history
5. **Themes**: Custom color themes and fonts
6. **Plugins**: Extensible plugin system for custom tools

### Production Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel deploy

# Deploy to Netlify
netlify deploy --prod

# Deploy to any static hosting
npm run export
```

This frontend provides a modern, production-ready chat interface that showcases Motia's real-time capabilities with professional UX patterns!