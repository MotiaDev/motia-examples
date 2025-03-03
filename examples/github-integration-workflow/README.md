# GitHub Integration Workflow

A comprehensive workflow for automating GitHub issue and pull request management using AI-powered classification and routing.

## Features

- 🤖 Automated issue triage and classification
- 🏷️ Intelligent label assignment
- 👥 Smart assignee and reviewer selection
- ✅ Automated PR test monitoring
- 📝 Contextual comment generation

## Prerequisites

- Node.js (v16 or higher)
- GitHub account and personal access token
- OpenAI API key

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and add your credentials:
   ```bash
   cp .env.example .env
   ```
3. Configure the following environment variables in the `.env` file:
   ```bash
   GITHUB_TOKEN=your_github_token_here
   OPENAI_API_KEY=your_openai_api_key
   ```

## Development

Start the development server:

```bash
npm run dev
```

For debugging:

```bash
npm run dev:debug
```

## Testing

Run tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## Project Structure

```
├── services/
│   ├── github/       # GitHub API integration
│   └── openai/       # OpenAI API integration
├── steps/
│   ├── issue-triage/ # Issue management workflows
│   └── pr-classifier/ # PR management workflows
└── ...
```

## Environment Variables

The following environment variables are required for the application to function correctly:

- `GITHUB_TOKEN`: Your GitHub personal access token.
- `OPENAI_API_KEY`: Your OpenAI API key.
