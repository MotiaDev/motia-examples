# Ollama Chat Example

A minimal example demonstrating **real-time AI streaming** and **conversation state management** using the Motia framework with **Ollama**.


## 🚀 Features

- **Real-time AI Streaming**: Token-by-token response generation using Ollama's streaming API
- **Local AI Models**: Run powerful AI models locally with Ollama (Llama 3.1, CodeLlama, Mistral, etc.)
- **Live State Management**: Conversation state updates in real-time with message history
- **Event-driven Architecture**: Clean API → Event → Streaming Response flow
- **Minimal Complexity**: Maximum impact with just 3 core files

## 📁 Architecture

```
ollama-chat/
├── steps/
│   ├── conversation.stream.ts    # Real-time conversation state
│   ├── chat-api.step.ts         # Simple chat API endpoint  
│   └── ollama-response.step.ts      # Ollama streaming response handler
├── package.json                 # Dependencies (includes ollama package)
├── tsconfig.json               # TypeScript configuration
└── README.md                    # This file
```

## 🛠️ Setup

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/MotiaDev/motia-examples.git
cd motia-examples/examples/ollama-chat

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Prerequisites

1. **Install Ollama**: Download and install from [ollama.ai](https://ollama.ai)
2. **Pull a model**: Install a model like Llama 3.1
   ```bash
   ollama pull llama3.1
   ```

### Configure Ollama
   ```bash
   cp .env.example .env
   # Edit .env to configure Ollama host and model (defaults should work for local setup)
   ```

**Open Motia Workbench**:
   Navigate to `http://localhost:3000` to interact with the chatbot

## 🔧 Usage

### Send a Chat Message

**POST** `/chat`

```json
{
  "message": "Hello, how are you?",
  "conversationId": "optional-conversation-id"  // Optional: If not provided, a new conversation will be created
}
```

**Response:**
```json
{
  "conversationId": "uuid-v4",
  "message": "Message received, AI is responding...",
  "status": "streaming"
}
```

The response will update as the AI processes the message, with possible status values:
- `created`: Initial message state
- `streaming`: AI is generating the response
- `completed`: Response is complete with full message

When completed, the response will contain the actual AI message instead of the processing message.

### Real-time State Updates

The conversation state stream provides live updates as the AI generates responses:

- **User messages**: Immediately stored with `status: 'completed'`
- **AI responses**: Start with `status: 'streaming'`, update in real-time, end with `status: 'completed'`

## 🎯 Key Concepts Demonstrated

### 1. **Ollama Streaming Integration**
```typescript
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434'
})

const stream = await ollama.chat({
  model: process.env.OLLAMA_MODEL || 'llama3.1',
  messages: [...],
  stream: true, // Enable streaming
})

for await (const chunk of stream) {
  // Update state with each token
  const content = chunk.message?.content || ''
  fullResponse += content
  await streams.conversation.set(conversationId, messageId, {
    message: fullResponse,
    status: 'streaming',
    // ...
  })
}
```

### 2. **Real-time State Management**
```typescript
export const config: StreamConfig = {
  name: 'conversation',
  schema: z.object({
    message: z.string(),
    from: z.enum(['user', 'assistant']),
    status: z.enum(['created', 'streaming', 'completed']),
    timestamp: z.string(),
  }),
  baseConfig: { storageType: 'default' },
}
```

### 3. **Event-driven Flow**
```typescript
// API emits event
await emit({
  topic: 'chat-message',
  data: { message, conversationId, assistantMessageId },
})

// Event handler subscribes and processes
export const config: EventConfig = {
  subscribes: ['chat-message'],
  // ...
}
```

## 🌟 Why This Example Matters

This example showcases Motia's power with **local AI models** in just **3 files**:

- **Local AI Integration**: Run powerful AI models locally with Ollama - no API keys required
- **Effortless streaming**: Real-time AI responses with automatic state updates
- **Type-safe events**: End-to-end type safety from API to event handlers
- **Built-in state management**: No external state libraries needed
- **Privacy-focused**: All AI processing happens locally on your machine
- **Scalable architecture**: Event-driven design that grows with your needs

Perfect for demonstrating how Motia makes complex real-time applications simple and maintainable while keeping AI processing private and local.

## 🔑 Environment Variables

- `OLLAMA_HOST`: Ollama server host (default: `http://localhost:11434`)
- `OLLAMA_MODEL`: Model to use (default: `llama3.1`)

### Available Models

You can use any model installed in Ollama. Popular options include:
- `llama3.1`: General purpose conversational AI
- `codellama`: Specialized for code generation and programming
- `mistral`: Fast and efficient model
- `phi3`: Microsoft's compact model

Install models with: `ollama pull <model-name>`

## 📝 Notes

- Requires Ollama to be running locally on your machine
- The example uses `llama3.1` model by default for balanced performance and quality
- All conversation data is stored in Motia's built-in state management
- No API keys or external services required - everything runs locally
