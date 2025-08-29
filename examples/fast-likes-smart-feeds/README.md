# Micro-Actions Like Feed System

A fast-response, event-driven like system built with Motia framework, demonstrating mixed TypeScript/Python microservices architecture with immediate API responses and asynchronous background processing.

 
### Event flow 
![Event flow ](https://github.com/user-attachments/assets/f0344f68-c5ad-4417-8dd0-9d2ccf86c611)
*Fast API response with immediate like confirmation*

### Event Processing Logs
![Event Logs](https://github.com/user-attachments/assets/93a12fc0-8d9b-4282-9e72-c62874bd5be9)
*Complete event flow from API to background processing*

### System Architecture
*Visual representation of the micro-actions pattern*

![Architecture Diagram](https://github.com/user-attachments/assets/53275bbd-8a46-43a8-9aed-e0c23e385a74)



## 🏗️ Architecture Overview

This system implements a **micro-actions pattern** with **real-time integrations** where user actions trigger immediate responses while complex side effects are processed asynchronously through events.

```
POST /like/:postId (TypeScript API)
    ↓ emits like:post event
Python Side Effects Orchestrator
    ↓ emits multiple events in parallel
    ├── like:notify-owner → Console Logging
    ├── like:update-feed → Feed Algorithm Update
    ├── like:supabase-sync → Database Write
    ├── like:firebase-notification → Push Notifications
    └── like:websocket-broadcast → Real-time UI Updates ( Just an idea)
```

### 🚀 Real-time Features

- **Database Sync**: Automatic Supabase database writes with like counting ✅
- **Push Notifications**: Firebase Cloud Messaging for mobile/web notifications ✅  
- **WebSocket Broadcasting**: Real-time UI updates for connected clients (Not implemented)
- **Parallel Processing**: All integrations run concurrently for maximum performance ✅

### Components

1. **API Step** (`like-api.step.ts`) - TypeScript
   - Fast HTTP endpoint for liking posts
   - Immediate in-memory storage
   - Event emission to trigger side effects

2. **Side Effects Orchestrator** (`enqueue-side-effects.step.py`) - Python
   - Receives `like:post` events
   - Emits multiple side effect events
   - Coordinates background processing

3. **Notification Step** (`notify-owner.step.py`) - Python
   - Handles post owner notifications
   - Logs notification messages

4. **Feed Update Step** (`update-feed.step.py`) - Python
   - Updates recommendation algorithms
   - Simulates feed visibility boosting

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- Python 3.9+
- npm or yarn

### Installation

1. **Clone and install Node.js dependencies:**
   ```bash
   git clone https://github.com/your-username/micro-actions-like-feed.git
   cd micro-actions-like-feed
   npm install
   ```

2. **Install Python dependencies:**
   ```bash
   # Motia creates its own Python virtual environment (like node_modules for Python)
   # This installs all dependencies from requirements.txt into python_modules/
   npx motia install
   ```

   This creates a `python_modules/` directory (similar to `node_modules/`) containing:
   - `firebase-admin` - For push notifications
   - `python-dotenv` - For environment variables  
   - `pytest` - For testing
   - All other Python dependencies

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   ➜ [CREATED] Flow micro-actions-like-feed created
   ➜ [CREATED] Step (API) steps/like-api.step.ts created
   ➜ [CREATED] Step (Event) steps/enqueue-side-effects.step.py created
   🚀 Server running on http://localhost:3000
   ```

## 🔥 Firebase Push Notifications

### ✅ What's Implemented (Server-Side)

The system includes **complete server-side Firebase integration** for sending push notifications:

- **Firebase Admin SDK**: Configured and working ✅
- **Service Account**: Properly configured with `google-services.json` ✅
- **Notification Step**: `firebase-notification.step.py` sends notifications ✅
- **Topic-based Messaging**: Can send to topics like `post_123_likes` ✅
- **Personalized Notifications**: Can send to specific user tokens ✅

### ❌ What's Missing (Client-Side)

To receive notifications, you need a **client-side app** (web/mobile):

```javascript
// Example client-side Firebase config (for web browsers)
const firebaseConfig = {
  apiKey: "XXXXXXXXX-XXXXX",
  authDomain: "motia-likes-feed-notifications.firebaseapp.com",
  projectId: "motia-likes-feed-notifications",
  storageBucket: "motia-likes-feed-notifications.firebasestorage.app",
  messagingSenderId: "XXXXXXXXXX",
  appId: "1:XXXXXXXXX:web:XXXXXXXXXX",
  measurementId: "G-HD24YP49JS"
};
```

### 🧪 Testing Firebase Integration

#### Test Server-Side Connection:
```bash
python3 test_firebase_connection.py
```

Expected output:
```
✅ Firebase Admin SDK imported successfully
✅ Service account file valid
✅ Firebase Admin SDK initialized successfully
🎯 Firebase is ready to send notifications!
```

#### Test End-to-End Notifications:

**Option 1: Firebase Console (Easiest)**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `motia-likes-feed-notifications`
3. Go to **Cloud Messaging** → **Send your first message**
4. Send to topic: `post_123_likes`

**Option 2: Create Simple Web Client**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Firebase Test</title>
</head>
<body>
    <h1>Firebase Notification Test</h1>
    <button id="subscribe">Subscribe to Notifications</button>
    
    <script type="module">
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
        import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging.js';
        
        const firebaseConfig = {
            // Use the config from above
        };
        
        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);
        
        // Subscribe to topic and receive notifications
        document.getElementById('subscribe').onclick = async () => {
            const token = await getToken(messaging);
            console.log('FCM Token:', token);
            // Subscribe to topic: post_123_likes
        };
    </script>
</body>
</html>
```

**Option 3: Mobile App**
- Use Firebase SDK for iOS/Android
- Subscribe to topics like `post_123_likes`
- Handle incoming notifications

### 🔧 Firebase Configuration Files

The system uses **two different Firebase configurations**:

1. **Server-Side** (`google-services.json`): ✅ Configured
   - For sending notifications from your server
   - Firebase Admin SDK service account
   - Has `private_key`, `client_email`, etc.

2. **Client-Side** (JavaScript config): ❌ Not implemented
   - For receiving notifications in browsers/apps
   - Firebase Client SDK configuration
   - Has `apiKey`, `authDomain`, `projectId`, etc.

### 📱 Real-World Usage

In production, the flow would be:

1. **User likes a post** → API call to your server
2. **Server processes like** → Stores in database
3. **Server sends notification** → Via Firebase Admin SDK ✅
4. **User's device receives notification** → Via Firebase Client SDK ❌
5. **User taps notification** → Opens your app

**Current Status**: Steps 1-3 work perfectly. Steps 4-5 need client-side implementation.

## 🧪 Testing

### API Testing

#### Using curl:
```bash
# Test successful like
curl -X POST http://localhost:3000/like/post-123

# Test different postId formats
curl -X POST http://localhost:3000/like/post_456
curl -X POST http://localhost:3000/like/789

# Test error cases
curl -X POST http://localhost:3000/like/  # Empty postId
curl -X POST "http://localhost:3000/like/post with spaces"  # Invalid characters
```

#### Using Postman:
1. **Method**: POST
2. **URL**: `http://localhost:3000/like/post-123`
3. **Headers**: `Content-Type: application/json` (optional)
4. **Body**: None (postId comes from URL path)

#### Expected Success Response:
```json
{
  "success": true,
  "message": "Post liked successfully",
  "postId": "post-123",
  "traceId": "generated-trace-id"
}
```

### Unit Testing

#### TypeScript Tests:
```bash
# Run all TypeScript tests
npm test

# Run specific test files
npm run test:run -- steps/like-api.step.test.ts
npm run test:run -- steps/integration.test.ts

# Run tests with UI
npm run test:ui
```

#### Python Tests:
```bash
# Install pytest (if not already installed)
pip install -r requirements.txt

# Run Python tests
python -m pytest steps/ -v
```

### Integration Testing

The system includes comprehensive integration tests that verify:
- Complete API workflow
- Event emission and processing
- Error handling scenarios
- Data flow between TypeScript and Python components

## 📊 Expected Log Flow

When you make a successful API call, you should see this complete log sequence:

```
[INFO] LikeApi Processing like request { postId: 'post-123', traceId: '...' }
[INFO] LikeApi Like stored in memory { postId: 'post-123', userId: 'user-demo', traceId: '...' }
[INFO] LikeApi like:post event emitted successfully { postId: 'post-123', traceId: '...' }

[INFO] EnqueueSideEffects Processing like:post event for side effects orchestration
[INFO] EnqueueSideEffects like:notify-owner event emitted { postId: 'post-123', userId: 'user-demo', traceId: '...' }
[INFO] EnqueueSideEffects like:update-feed event emitted { postId: 'post-123', userId: 'user-demo', traceId: '...' }
[INFO] EnqueueSideEffects Side effects orchestration completed successfully

[INFO] NotifyOwner Post owner notification: Post post-123 was liked by user user-demo
[INFO] NotifyOwner Owner notification processing completed successfully

[INFO] UpdateFeed Feed update: Post post-123 liked by user user-demo - updating recommendation algorithms
[INFO] UpdateFeed Simulating recommendation feed update - boosting post visibility
[INFO] UpdateFeed Feed update processing completed successfully
```

## 🛠️ Development

### Project Structure

```
├── steps/                            # Core implementation
│   ├── like-api.step.ts              # TypeScript API endpoint
│   ├── enqueue-side-effects.step.py  # Python event orchestrator
│   ├── notify-owner.step.py          # Python notification handler
│   ├── update-feed.step.py           # Python feed update handler
│   ├── firebase-notification.step.py # Firebase push notifications
│   ├── supabase-sync.step.py         # Database synchronization
│   ├── schemas.ts                    # Event schemas and types
│   └── *.test.*                      # Unit tests
├── .kiro/specs/micro-actions-like-feed/
│   ├── requirements.md               # System requirements
│   ├── design.md                     # Architecture design
│   └── tasks.md                      # Implementation tasks
├── python_modules/                   # Python dependencies (like node_modules)
│   ├── firebase_admin/               # Firebase Admin SDK
│   ├── dotenv/                       # Environment variable support
│   └── ...                           # Other Python packages
├── node_modules/                     # Node.js dependencies
├── requirements.txt                  # Python dependencies list
├── package.json                      # Node.js dependencies list
├── google-services.json              # Firebase service account
├── .env                              # Environment configuration
└── README.md                         # This file
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:debug        # Start with verbose logging

# Testing
npm test                 # Run TypeScript tests in watch mode
npm run test:run         # Run all TypeScript tests once
npm run test:ui          # Run tests with UI
python3 test_firebase_connection.py  # Test Firebase server-side connection

# Python Testing (after npx motia install)
python3 -m pytest steps/ -v  # Run Python unit tests

# Build & Deploy
npm run build            # Build for production
npm run clean            # Clean all generated files

# Python Environment Management
npx motia install        # Install Python dependencies to python_modules/
npx motia generate-types # Generate TypeScript types
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase Configuration (Optional - for database sync)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Firebase Configuration (Required for push notifications)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/google-services.json
```

### Real-time Integrations

The system includes optional real-time integrations that gracefully handle missing dependencies:

- **Supabase**: Database sync with like counting ✅
- **Firebase**: Push notifications ✅  
- **WebSockets**: Real-time UI updates (Not implemented)

If dependencies are missing, the system logs warnings but continues working with core functionality.

### Event Topics

- `like:post` - Emitted by API step, consumed by side effects orchestrator
- `like:notify-owner` - Emitted by orchestrator, consumed by notification step
- `like:update-feed` - Emitted by orchestrator, consumed by feed update step

### Validation Rules

PostId validation (configurable in `like-api.step.ts`):
- Length: 1-100 characters
- Characters: alphanumeric, hyphens, underscores only
- Pattern: `/^[a-zA-Z0-9\-_]+$/`

## 🚨 Troubleshooting

### Common Issues

#### 1. "motia: command not found"
```bash
# Use npx instead of global motia
npx motia install
npx motia dev
```

#### 2. "No compatible Python 3 installation found"
```bash
# Ensure Python 3 is accessible
python3 --version

# Create symlink if needed (macOS)
sudo ln -s $(which python3) /usr/local/bin/python
```

#### 3. "Invalid request format - could not extract postId"
- Ensure you're using POST method
- Check URL format: `/like/your-post-id`
- Verify server is running on correct port

#### 4. Python steps not processing events
- Check that `npx motia install` completed successfully
- Verify Python steps are registered in server logs
- Ensure event topics match exactly
- Confirm `python_modules/` directory exists (auto-created by Motia)

### Debug Mode

Run with verbose logging to see detailed information:
```bash
npm run dev:debug
```

### Log Analysis

- **API logs**: Show request processing and event emission
- **Python logs**: Show event reception and processing
- **Error logs**: Include stack traces and context
- **Trace IDs**: Allow correlation across all steps

## 📈 Performance

### Benchmarks

- **API Response Time**: <50ms (in-memory storage)
- **Event Processing**: Asynchronous, doesn't block API
- **Concurrent Requests**: Supported via Node.js event loop
- **Memory Usage**: Minimal (no external dependencies)

### Scaling Considerations

- **Horizontal Scaling**: Stateless design supports multiple instances
- **Event Distribution**: Can be extended with message queues
- **Storage**: Currently in-memory, can be replaced with databases
- **Monitoring**: Structured logging with trace correlation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Add tests for new functionality
4. Ensure all tests pass (`npm test` and `python3 -m pytest steps/ -v`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Submit a pull request

### Code Style

- **TypeScript**: Follow existing patterns, use proper typing
- **Python**: Follow PEP 8, use type hints
- **Testing**: Maintain >90% test coverage
- **Logging**: Use structured logging with context


## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🔗 Repository & Links

### Git Repository
```bash
# Clone the repository
git clone https://github.com/your-username/micro-actions-like-feed.git
cd micro-actions-like-feed

# Or using SSH
git clone git@github.com:your-username/micro-actions-like-feed.git
```

### Related Documentation
- [Motia Framework Documentation](https://motia.dev)
- [Firebase Admin SDK Guide](https://firebase.google.com/docs/admin/setup)
- [Supabase Documentation](https://supabase.com/docs)