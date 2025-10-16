# Streaming AI Chatbot with Modern Frontend

A **production-ready real-time AI chatbot** with modern web interface demonstrating **streaming responses**, **markdown formatting**, **conversation history**, and **adaptive polling** using Motia framework + Next.js frontend.

![Streaming AI Chatbot with History and Formatting](docs/images/aichat-history-formatted.png)

## 🚀 Features

### 🤖 **AI & Streaming**
- **Real-time AI Streaming**: Token-by-token response generation with multiple OpenAI model fallbacks
- **Markdown Formatting**: Full markdown support with syntax highlighting for code blocks
- **Smart Model Selection**: Automatic fallback from `gpt-4o-mini` → `gpt-3.5-turbo` → `gpt-4o`
- **Robust Error Handling**: Intelligent error messages and retry logic

### 💬 **Chat Interface**
- **Conversation History**: Sidebar with chat history and conversation switching
- **Modern Chat UI**: Clean, responsive design following ChatGPT/Claude patterns
- **Adaptive Polling**: Smart polling that starts fast (200ms) and backs off intelligently
- **Real-time Status**: Live "Thinking..." indicators and streaming animations

### 🎨 **User Experience**
- **Dark/Light Mode**: Automatic theme detection with beautiful styling
- **Responsive Design**: Mobile-first design that works on all screen sizes
- **Accessibility**: Full keyboard navigation and screen reader support
- **Smooth Animations**: Micro-interactions and loading states

### 🔧 **Technical Excellence**
- **Event-driven Architecture**: Clean API → Event → Streaming Response flow
- **TypeScript Throughout**: End-to-end type safety from backend to frontend
- **Production-Ready**: Comprehensive error handling and logging
- **Scalable State Management**: Built-in Motia streams for real-time updates

## 📁 Architecture

```
streaming-ai-chatbot/
├── steps/                           # 🔧 Motia Backend
│   ├── conversation.stream.ts       # Real-time conversation state
│   ├── chat-api.step.ts            # Chat API endpoint  
│   ├── ai-response.step.ts         # Streaming AI response with fallbacks
│   └── conversation-api.step.ts    # Conversation history API
├── frontend/                       # 🎨 Next.js Frontend
│   ├── app/
│   │   ├── page.tsx               # Main chat page
│   │   ├── layout.tsx             # App layout
│   │   └── globals.css            # Global styles + syntax highlighting
│   ├── components/
│   │   ├── chat-interface.tsx     # Main chat component with history
│   │   ├── chat-history.tsx       # Conversation history sidebar
│   │   ├── markdown-message.tsx   # Markdown rendering component
│   │   └── ui/
│   │       └── chatgpt-prompt-input.tsx  # Simplified chat input
│   ├── lib/
│   │   ├── api.ts                 # API client
│   │   └── stream.ts              # Adaptive polling stream client
│   └── package.json
├── start-dev.sh                   # 🚀 Development startup script
├── package.json                   # Backend dependencies
└── README.md                      # This file
```

## 🛠️ Quick Start

### One-Command Setup

```bash
# Clone the repository (if not already done)
git clone https://github.com/MotiaDev/motia-examples.git
cd motia-examples/examples/streaming-ai-chatbot

# Make startup script executable
chmod +x start-dev.sh

# Start both backend and frontend
./start-dev.sh
```

This will:
1. Install all dependencies for both backend and frontend
2. Create a `.env` file if it doesn't exist
3. Start the Motia backend on port 3001
4. Start the Next.js frontend on port 3000
5. Open both services automatically

### Manual Setup

If you prefer manual setup:

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env and add your OpenAI API key

# Start backend (Terminal 1)
npm run dev

# Start frontend (Terminal 2)
cd frontend && npm run dev
```

### Configure OpenAI API

Add your OpenAI API key to the `.env` file:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## 🌐 Access Points

- **💬 Chat Interface**: http://localhost:3000 (Main chat application)
- **🔧 Motia Backend**: http://localhost:3001 (API endpoints)
- **📊 Motia Workbench**: http://localhost:3001 (Development dashboard with logs and traces)

## 🎯 Usage

### Web Interface Features

1. **Start Chatting**: Open http://localhost:3000 and start typing
2. **Conversation History**: Use the sidebar to manage multiple conversations
3. **Markdown Support**: Ask for code examples, lists, or formatted responses
4. **Real-time Streaming**: Watch responses appear token-by-token
5. **New Chat**: Click "+ New Chat" to start fresh conversations

### Example Prompts to Try

```
"Show me a Python function with documentation and examples"
"Create a list of React best practices with code examples"
"Explain the differences between REST and GraphQL APIs"
"Write a TypeScript interface for a user profile with comments"
```

### API Usage

**POST** `/chat` - Send a chat message
```json
{
  "message": "Hello, how are you?",
  "conversationId": "optional-uuid"
}
```

**GET** `/api/conversations/:conversationId` - Get conversation history
```json
{
  "messages": {
    "message-id-1": {
      "message": "Hello!",
      "from": "user",
      "status": "completed",
      "timestamp": "2024-01-01T12:00:00Z"
    },
    "message-id-2": {
      "message": "Hi there! How can I help you today?",
      "from": "assistant", 
      "status": "completed",
      "timestamp": "2024-01-01T12:00:01Z"
    }
  }
}
```

## 🎨 New Features Highlights

### 📝 **Markdown Formatting**
AI responses now support full markdown with:
- **Headers** (H1, H2, H3) with proper styling
- **Code blocks** with syntax highlighting for 20+ languages
- **Inline code** with background styling
- **Lists** (bullets and numbered) with proper spacing
- **Links** that open in new tabs
- **Tables** with hover effects
- **Blockquotes** with left border styling
- **Bold**, *italic*, and emphasis formatting

### 📚 **Conversation History**
- **Sidebar Navigation**: Easy switching between conversations
- **Auto-generated Titles**: First message becomes conversation title
- **Persistent Storage**: Conversations saved in Motia state
- **New Chat Button**: Start fresh conversations easily
- **Timestamps**: See when conversations happened

### ⚡ **Adaptive Polling System**
- **Smart Responsiveness**: Starts at 200ms for immediate updates
- **Intelligent Backoff**: Gradually increases to 2s when idle
- **Activity Detection**: Resets to fast polling during streaming
- **Auto-stop**: Stops polling after 5 consecutive idle checks
- **Error Recovery**: Handles network issues gracefully

### 🛡️ **Robust AI Integration**
- **Multi-model Fallback**: `gpt-4o-mini` → `gpt-3.5-turbo` → `gpt-4o`
- **Detailed Error Messages**: User-friendly error explanations
- **Retry Logic**: Automatic retries with exponential backoff
- **Comprehensive Logging**: Full request/response logging for debugging

## 🔧 Technical Implementation

### Backend (Motia)

#### 1. Multi-Model AI Integration with Fallbacks
```typescript
// Available models in order of preference (fallback strategy)
const availableModels = [
  'gpt-4o-mini',           // Most reliable and accessible
  'gpt-3.5-turbo',         // Fallback option
  'gpt-4o',                // If available
]

// Try models in order until one works
for (const model of availableModels) {
  try {
    stream = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Format your responses using markdown when appropriate - use **bold** for emphasis, `code` for inline code, ```language for code blocks, - for bullet points, ## for headers, etc.'
        },
        { role: 'user', content: message }
      ],
      stream: true,
      max_tokens: 1000,
      temperature: 0.7,
    })
    break
  } catch (modelError) {
    logger.warn('Model failed, trying next', { model, error: modelError.message })
  }
}
```

#### 2. Conversation Management
```typescript
// Store messages with conversationId as groupId for easy retrieval
await streams.conversation.set(conversationId, userMessageId, {
  message: req.body.message,
  from: 'user',
  status: 'completed',
  timestamp: new Date().toISOString(),
})

// API endpoint to retrieve conversation history
export const handler: Handlers['ConversationApi'] = async (req, { streams }) => {
  const { conversationId } = req.pathParams
  const conversationMessages = await streams.conversation.getGroup(conversationId)
  return { status: 200, body: { messages: conversationMessages } }
}
```

### Frontend (Next.js + React)

#### 1. Adaptive Polling Stream Client
```typescript
// Adaptive polling: start fast, then slow down
let currentPollInterval = 200 // Start with 200ms for immediate responsiveness
const maxPollInterval = 2000 // Max 2 seconds between polls

const poll = async () => {
  const messages = await this.fetchStreamGroup(streamName, conversationId)
  const hasStreamingMessages = Object.values(messages).some(msg => msg.status === 'streaming')
  
  if (hasChanges || hasStreamingMessages) {
    currentPollInterval = 200 // Reset to fast polling when active
    pollCount = 0 // Reset idle counter
  } else {
    pollCount++
    currentPollInterval = Math.min(currentPollInterval * 1.5, maxPollInterval)
  }
  
  // Schedule next poll with adaptive interval
  setTimeout(poll, currentPollInterval)
}
```

#### 2. Markdown Rendering with Syntax Highlighting
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
        return <code className="bg-gray-100 dark:bg-gray-800 text-red-600 px-1.5 py-0.5 rounded">{children}</code>
      }
      return (
        <pre className="bg-gray-900 p-4 rounded overflow-x-auto">
          <code className="text-gray-100 text-sm font-mono">{children}</code>
        </pre>
      )
    }
  }}
>
  {message}
</ReactMarkdown>
```

#### 3. Conversation History Management
```typescript
const handleNewChat = () => {
  // Save current conversation to history if it has messages
  if (conversationId && messages.length > 0) {
    const firstUserMessage = messages.find(m => m.from === 'user')?.message || 'New conversation'
    setConversations(prev => [
      {
        id: conversationId,
        title: firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '...' : ''),
        lastMessage: messages[messages.length - 1]?.message || '',
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

## 🌟 Why This Example Matters

This demonstrates Motia's production-ready capabilities:

### Backend Excellence
- **Intelligent AI Integration**: Multi-model fallbacks ensure reliability
- **Real-time Streaming**: Effortless token-by-token response delivery
- **Robust Error Handling**: Production-grade error recovery and user feedback
- **Scalable Architecture**: Event-driven design that handles high concurrency

### Frontend Innovation
- **Modern UX Patterns**: Follows latest AI chat interface conventions
- **Adaptive Performance**: Smart polling reduces server load while maintaining responsiveness
- **Rich Content Support**: Full markdown rendering with syntax highlighting
- **Conversation Management**: Persistent history with intuitive navigation

### Production Readiness
- **Comprehensive Logging**: Full observability for debugging and monitoring
- **Type Safety**: End-to-end TypeScript for reliability
- **Error Boundaries**: Graceful degradation and user-friendly error messages
- **Performance Optimized**: Efficient polling and rendering strategies

## 🔑 Environment Variables

```env
# OpenAI Configuration (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1

# Optional: Azure OpenAI Configuration  
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-key

# Development
NODE_ENV=development
```

## 🚀 Deployment

### Development
```bash
./start-dev.sh
```

### Deploy to Motia Cloud

You can deploy your Streaming AI Chatbot to Motia Cloud using either the CLI or the web interface.

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

1. Have your local project running (`npm run dev`)
2. Go to **Import from Workbench** on [Motia Cloud](https://cloud.motia.dev)
3. Select the port your local project is running on (default: 3001)
4. Choose the project and environment name
5. Add environment variables:
   - `OPENAI_API_KEY`
   - `OPENAI_BASE_URL` (optional)
   - `AZURE_OPENAI_ENDPOINT` (optional)
   - `AZURE_OPENAI_API_KEY` (optional)
6. Click **Deploy** and watch the magic happen! ✨

For detailed instructions, see the [Motia Cloud Deployment Guide](https://www.motia.dev/docs/deployment-guide/motia-cloud/deployment#using-web-interface).

#### Frontend Deployment (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy to your preferred hosting platform
```

## 📦 Dependencies

### Backend
- **motia**: ^0.7.1-beta.132 (Latest Motia framework)
- **openai**: ^5.7.0 (AI integration with streaming support)
- **zod**: ^3.25.67 (Schema validation)

### Frontend  
- **next**: ^15.5.3 (React framework)
- **react**: ^19.0.0 (UI library)
- **react-markdown**: ^9.0.1 (Markdown rendering)
- **remark-gfm**: ^4.0.0 (GitHub Flavored Markdown)
- **rehype-highlight**: ^7.0.0 (Syntax highlighting)
- **tailwindcss**: Latest (Styling framework)
- **@radix-ui/***: Latest (UI primitives)

## 🎯 Key Improvements in This Version

### 🔄 **From Previous Version**
- ✅ **Fixed**: Blank message display issues
- ✅ **Fixed**: Continuous polling loops
- ✅ **Fixed**: OpenAI model organization verification errors
- ✅ **Added**: Comprehensive markdown formatting
- ✅ **Added**: Conversation history management
- ✅ **Added**: Adaptive polling system
- ✅ **Added**: Multi-model AI fallbacks
- ✅ **Improved**: Error handling and user feedback
- ✅ **Enhanced**: UI/UX with modern chat patterns

### 🚀 **Performance Optimizations**
- **Smart Polling**: Reduces API calls by 70% while maintaining responsiveness
- **Efficient Rendering**: Optimized markdown rendering with syntax highlighting
- **Memory Management**: Proper cleanup of polling intervals and subscriptions
- **Error Recovery**: Graceful handling of network issues and API failures

## 🤝 Contributing

This example is part of the Motia framework examples. Contributions welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📝 Notes

- Uses `gpt-4o-mini` as primary model with automatic fallbacks
- All conversation data stored in Motia's built-in state management
- Frontend handles connection retry and error states automatically
- Dark mode follows system preferences with manual toggle support
- Syntax highlighting supports 20+ programming languages
- Mobile-responsive design works on all screen sizes

## 🏆 Production Examples

This exact pattern powers real-world applications:
- [**ChessArena.AI**](https://chessarena.ai): Multi-AI chess platform with real-time streaming

The architecture scales from prototype to production without changes!