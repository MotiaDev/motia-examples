# Meeting Transcription Example - Motia Backend

This is a complete example of a Motia backend that demonstrates how to build a meeting transcription system with real-time streaming updates.

## 🎯 What This Example Demonstrates

This example shows how to use Motia to build:

1. **API Endpoints** - RESTful endpoints for receiving requests
2. **Event-Driven Processing** - Asynchronous event handling
3. **Real-time Streaming** - Live updates during processing
4. **Type Safety** - Zod schema validation
5. **Error Handling** - Graceful failure management

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Client        │    │   Motia Backend      │    │   Real-time Stream  │
│                 │    │                      │    │                     │
│ POST /transcribe│───▶│ 1. API Step          │───▶│ Progress Updates    │
│                 │    │ 2. Event Handler     │    │ Status Changes      │
│                 │    │ 3. Stream Updates    │    │ Final Results       │
└─────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## 📁 Project Structure

```
meeting_transcript_example/
├── steps/
│   ├── hello-world.step.js                    # Simple API endpoint
│   ├── meeting-transcription-api.step.ts      # Main API endpoint
│   ├── meeting-transcription-processor.step.ts # Event handler
│   └── meeting-transcription.stream.ts        # Stream configuration
├── flows/
│   └── flow_meeting_transcription.yml         # Workflow definition
├── package.json                               # Dependencies
└── README.md                                  # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Generate TypeScript types
npm run generate-types

# Start development server
npm run dev
```

### Testing the API

```bash
# Test the hello world endpoint
curl http://localhost:3000/hello-world

# Start a transcription
curl -X POST http://localhost:3000/transcribe-meeting \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "meeting.wav",
    "language": "en",
    "model": "whisper-large-v3"
  }'
```

## 🔧 How It Works

### 1. API Step (`meeting-transcription-api.step.ts`)

This step creates a REST API endpoint that:

- **Validates Input**: Uses Zod schemas to validate request data
- **Creates Stream**: Sets up real-time streaming for updates
- **Emits Events**: Sends events for asynchronous processing
- **Returns Response**: Provides immediate feedback to the client

```typescript
// Example request
POST /transcribe-meeting
{
  "filename": "meeting.wav",
  "language": "en",
  "model": "whisper-large-v3"
}

// Example response
{
  "message": "Meeting transcription request submitted successfully",
  "transcriptionId": "trans_1234567890_abc123",
  "streamId": "trans_1234567890_abc123",
  "status": "processing"
}
```

### 2. Event Handler (`meeting-transcription-processor.step.ts`)

This step processes events asynchronously:

- **Subscribes to Events**: Listens for `meeting-transcription` events
- **Updates Streams**: Provides real-time progress updates
- **Simulates Processing**: Demonstrates long-running tasks
- **Emits Results**: Sends completion or failure events

### 3. Stream Configuration (`meeting-transcription.stream.ts`)

This defines the structure of real-time updates:

```typescript
{
  status: 'transcribing',
  progress: 60,
  filename: 'meeting.wav',
  localWhisperStatus: 'generating_transcript',
  whisperModel: 'whisper-large-v3',
  timestamp: '2024-01-01T12:00:00.000Z'
}
```

### 4. Flow Definition (`flow_meeting_transcription.yml`)

This YAML file defines the workflow:

```yaml
steps:
  - name: MeetingTranscriptionAPI
    type: api
    path: /transcribe-meeting
    emits: ['meeting-transcription']
    
  - name: MeetingTranscriptionProcessor
    type: event
    subscribes: ['meeting-transcription']
    streams: ['meetingTranscription']
```

## 📊 Real-time Streaming

The system provides real-time updates through Motia streams:

### Stream Schema

```typescript
{
  status: 'uploading' | 'transcribing' | 'processing' | 'completed' | 'failed',
  progress: number,           // 0-100
  filename: string,           // Original filename
  duration?: number,          // Audio duration in seconds
  transcript?: string,        // Generated transcript
  participants?: string[],    // Meeting participants
  actionItems?: string[],     // Extracted action items
  error?: string,             // Error message if failed
  timestamp: string,          // ISO timestamp
  localWhisperStatus?: string, // Whisper processing status
  whisperModel?: string,      // Model being used
  processingTime?: number     // Total processing time
}
```

### Client Integration

Clients can consume the stream using the Motia client:

```typescript
import { useStreamItem } from '@motiadev/stream-client-react'

function TranscriptionStatus({ transcriptionId }) {
  const { data, loading, error } = useStreamItem('meetingTranscription', transcriptionId)
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      <h3>Transcription Progress</h3>
      <p>Status: {data.status}</p>
      <p>Progress: {data.progress}%</p>
      {data.transcript && <p>Transcript: {data.transcript}</p>}
    </div>
  )
}
```

## 🛠️ Development

### Adding New Steps

1. **Create Step File**: Add a new `.step.ts` file in the `steps/` directory
2. **Define Config**: Export a config object with type, name, description, etc.
3. **Implement Handler**: Export an async handler function
4. **Update Flow**: Add the step to `flow_meeting_transcription.yml`
5. **Generate Types**: Run `npm run generate-types`

### Example: Adding a New API Endpoint

```typescript
// steps/status-api.step.ts
import { ApiRouteConfig, Handlers } from 'motia'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'StatusAPI',
  path: '/status',
  method: 'GET',
  emits: [],
  flows: ['meeting-transcription']
}

export const handler: Handlers['StatusAPI'] = async (req, { logger }) => {
  return {
    status: 200,
    body: { status: 'healthy', timestamp: new Date().toISOString() }
  }
}
```

### Example: Adding a New Event Handler

```typescript
// steps/transcription-analyzer.step.ts
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'TranscriptionAnalyzer',
  subscribes: ['transcription-completed'],
  emits: ['analysis-completed'],
  input: z.object({
    transcript: z.string(),
    filename: z.string()
  }),
  flows: ['meeting-transcription']
}

export const handler: Handlers['TranscriptionAnalyzer'] = async (input, { logger, emit }) => {
  // Analyze the transcript
  const analysis = { summary: 'Meeting summary...', actionItems: ['Item 1', 'Item 2'] }
  
  await emit({
    topic: 'analysis-completed',
    data: { ...input, analysis }
  })
}
```

## 🔍 Monitoring and Debugging

### Logs

Motia provides structured logging:

```typescript
logger.info('Processing started', { filename, transcriptionId })
logger.warn('Slow processing detected', { processingTime })
logger.error('Processing failed', { error: error.message })
```

### Stream Monitoring

Monitor stream updates in real-time:

```bash
# Check stream data
curl http://localhost:3000/streams/meetingTranscription/trans_1234567890_abc123
```

### Type Safety

All steps are fully typed with TypeScript:

```typescript
// Input is automatically typed based on the config
export const handler: Handlers['MeetingTranscriptionAPI'] = async (req, context) => {
  // req.body is typed based on bodySchema
  // context is typed with all available services
}
```

## 🚀 Production Deployment

### Environment Variables

```bash
# Set production environment
NODE_ENV=production
MOTIA_LOG_LEVEL=info
```

### Build and Deploy

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📚 Learning Resources

- [Motia Documentation](https://docs.motia.dev)
- [Zod Schema Validation](https://zod.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This example is provided under the MIT License.

---

**Ready to build your own Motia application?** Start by modifying this example and exploring the [Motia documentation](https://docs.motia.dev)! 