# Conversation Analyzer

A workflow application built with [Motia](https://motia.dev) that processes conversation screenshots, transcribes them using AI vision models, and generates intelligent summaries with action items and sentiment analysis.

## Overview

This application provides an end-to-end workflow for analyzing conversations from screenshots:

1. **API Trigger**: Initiates the workflow by pointing to a folder containing conversation screenshots
2. **Conversation Reader**: Reads and processes image files from the specified folder
3. **Vision Transcriber**: Uses OpenAI's vision capabilities to transcribe the conversation content
4. **Transcription File Writer**: Saves transcriptions as markdown files
5. **Conversation Summarizer**: Analyzes transcriptions to generate summaries, extract action items, and perform sentiment analysis

## Architecture

The application is built using Motia's event-driven workflow architecture:

```
┌─────────────┐     ┌─────────────────┐     ┌───────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│ API Trigger │────▶│ Conversation    │────▶│ Vision            │────▶│ Transcription      │────▶│ Conversation       │
│ (HTTP POST) │     │ Reader          │     │ Transcriber       │     │ File Writer        │     │ Summarizer         │
└─────────────┘     └─────────────────┘     └───────────────────┘     └────────────────────┘     └────────────────────┘
       │                    │                        │                         │                         │
       ▼                    ▼                        ▼                         ▼                         ▼
┌─────────────┐     ┌──────────────┐        ┌───────────────┐          ┌──────────────┐          ┌──────────────┐
│ Event:      │     │ Event:       │        │ Event:        │          │ Event:       │          │ Event:       │
│ reader-start│     │ reader-      │        │ transcription-│          │ files-written│          │ summary-     │
└─────────────┘     │ complete     │        │ complete      │          └──────────────┘          │ complete     │
                    └──────────────┘        └───────────────┘                                    └──────────────┘
```

## Prerequisites

- Node.js 18+
- OpenAI API key with access to GPT-4o-mini model
- Motia CLI and framework installed

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```
OPENAI_API_KEY=your_openai_api_key
```

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Run the project:
   ```
   pnpm run dev
   ```

## Usage

### Starting the Workflow

You can trigger the workflow by making a POST request to the API endpoint:

```bash
curl -X POST http://localhost:3000/api/conversation-reader/start \
  -H "Content-Type: application/json" \
  -d '{"folderPath": "path/to/your/screenshots"}'
```

The `folderPath` parameter should point to a directory containing conversation screenshots (PNG, JPG, or JPEG).

### Workflow Steps

1. **API Trigger** (`/conversation-reader/start`): Validates the folder path and emits a `conversation-reader-start` event
2. **Conversation Reader**: Reads image files from the folder, encodes them as base64, and emits a `conversation-reader-complete` event
3. **Vision Transcriber**: Uses OpenAI's vision models to transcribe the conversation content from images and emits a `conversation-transcription-complete` event
4. **Transcription File Writer**: Saves transcriptions as markdown files in a `transcriptions` subfolder and emits a `transcription-files-written` event
5. **Conversation Summarizer**: Analyzes all transcriptions to generate a comprehensive summary with action items and sentiment analysis, saving the result as `summary.md`

### Output

The workflow generates the following outputs in the specified folder:

- A `transcriptions` subfolder containing individual markdown files for each image
- A `summary.md` file with:
  - Comprehensive conversation summary
  - Extracted next steps/action items
  - Sentiment analysis (overall and by participant)

## Error Handling

The application includes robust error handling:

- Input validation using Zod schemas
- API error handling middleware
- Detailed error logging
- Graceful failure handling for individual images

## Development

### Project Structure

```
├── steps/                  # Workflow step definitions
│   ├── 01-api-trigger.step.ts
│   ├── 02-conversation-reader.step.ts
│   ├── 03-vision-transcriber.step.ts
│   ├── 04-transcription-file-writer.step.ts
│   └── 05-conversation-summarizer.step.ts
├── middlewares/            # Middleware functions
│   ├── withApiErrorHandler.ts
│   ├── withMiddleware.ts
│   └── withValidation.ts
├── errors/                 # Custom error classes
└── README.md               # This file
```

### Adding New Features

To extend the application:

1. Create new step files in the `steps/` directory
2. Define appropriate event subscriptions and emissions
3. Update the workflow configuration as needed

## Testing

The project includes a comprehensive test suite built with Jest. Tests cover middleware functionality, API endpoints, and workflow steps.

### Running Tests

To run the test suite:

```bash
pnpm run test
```

This command runs all tests and generates a coverage report.

### Test Structure

```
tests/
├── middlewares/            # Tests for middleware functions
│   ├── withApiErrorHandler.test.ts
│   ├── withMiddleware.test.ts
│   └── withValidation.test.ts
└── steps/                  # Tests for workflow steps
    └── 01-api-trigger.test.ts
```

### Coverage Requirements

The project enforces the following test coverage thresholds:

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### Writing Tests

When adding new features, follow these testing guidelines:

1. Create test files with the `.test.ts` extension in the appropriate directory
2. Use Jest's describe/it pattern for organizing tests
3. Mock external dependencies (file system, OpenAI API, etc.)
4. Test both success and error scenarios
5. Ensure middleware integrations are properly tested

## License

[MIT](LICENSE)
