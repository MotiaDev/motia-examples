# GitHub Integration Workflow

Automate GitHub issue and pull request management using Motia’s type-safe, event-driven steps and OpenAI-assisted classification.

## What this app does

- 🤖 Classifies issues and PRs using LLMs
- 🏷️ Applies labels from classification (type/impact/areas)
- 👥 Suggests reviewers and assignees
- ✅ Monitors CI test status and comments outcomes
- 📝 Writes friendly, contextual comments on issues/PRs

## Why Motia makes this simple

- **Step-based architecture**: Each unit of work is a small, testable step.
- **Events over glue code**: Steps communicate via emitted topics (e.g., `github.pr.opened → github.pr.classified`).
- **Type-safe handlers**: `Handlers['Step Name']` gives compile-time safety for inputs/outputs and emitted events.
- **Runtime validation**: Zod schemas validate incoming payloads for API steps.
- **Workbench**: Visualize and simulate the entire flow without writing extra scripts.

## Flows at a glance

- PR flow:
  1. `PR Webhook Handler` (/api/github/pr-webhook)
  2. `PR Classifier` → emits `github.pr.classified`
  3. `PR Label Assigner` → applies labels
  4. `PR Test Monitor` → watches check runs and emits `github.pr.tests-completed`
  5. `PR Reviewer Assigner` → suggests reviewers and comments

- Issue flow:
  1. `GitHub Webhook Handler` (/api/github/webhook)
  2. `New Issue Handler` → initial triage
  3. `Issue Classifier` → emits `github.issue.classified`
  4. `Label Assigner` → applies labels
  5. `Assignee Selector` → assigns users and comments
  6. `Issue Update/Closure` → posts updates and archives

## Endpoints

- Issues: `POST /api/github/webhook`
- PRs: `POST /api/github/pr-webhook`

Example cURL (PR opened):

```bash
curl -X POST http://localhost:3000/api/github/pr-webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "opened",
    "pull_request": {
      "number": 123,
      "title": "Add new feature",
      "body": "This PR adds a new feature",
      "state": "open",
      "labels": [],
      "user": { "login": "testuser" },
      "base": { "ref": "main" },
      "head": { "ref": "feature-branch", "sha": "abc123" }
    },
    "repository": { "owner": { "login": "motia" }, "name": "motia-examples" }
  }'
```

## Prerequisites

- Node.js 18+
- GitHub personal access token
- OpenAI API key

## Setup

1) Install dependencies

```bash
npm install
```

2) Environment

```bash
cp .env.example .env
```

Add the following to `.env`:

```bash
GITHUB_TOKEN=your_github_token_here
OPENAI_API_KEY=your_openai_api_key
```

## Develop locally

Start workbench and API server:

```bash
npm run dev
```

Debug (verbose):

```bash
npm run dev:debug
```

### Try the flow in Workbench

- Open the workbench UI printed in the console
- Use UI simulators:
  - `steps/issue-triage/test-github-issue.step.tsx` → simulate issue webhooks
  - `steps/pr-classifier/test-pr-webhook.step.tsx` → simulate PR webhooks
- Watch downstream steps execute and events propagate

## Testing

Unit tests use Jest with mocked OpenAI and GitHub clients.

- Run all tests

```bash
npm test
```

- Watch mode

```bash
npm run test:watch
```

- Coverage

```bash
npm run test:coverage
```

What’s covered:

- Webhook parsing and event emission
- Classification calls and error paths
- Label/assignee/reviewer actions
- Test monitoring and result comments

## Code quality

- Lint

```bash
npm run lint
```

- Fix

```bash
npm run lint:fix
```

- Format

```bash
npm run format
```

## Project structure

```
├── services/
│   ├── github/       # Octokit wrapper
│   └── openai/       # OpenAI helper client
├── steps/
│   ├── issue-triage/ # Issue workflow steps
│   └── pr-classifier/# PR workflow steps
├── __tests__/        # Jest unit tests
└── motia-workbench.json
```

## Type-safety notes

- Handlers use `Handlers['Step Name']` to bind input/output types
- API steps use Zod for `bodySchema` and `responseSchema`
- Emitted event payloads are validated at compile-time against `types.d.ts`

## 🌐 Deployment

### Deploy to Motia Cloud

You can deploy your GitHub Integration Workflow to Motia Cloud using either the CLI or the web interface.

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
3. Select the port your local project is running on (default: 3000)
4. Choose the project and environment name
5. Add environment variables:
   - `GITHUB_TOKEN`
   - `OPENAI_API_KEY`
   - `GITHUB_WEBHOOK_SECRET` (optional)
6. Click **Deploy** and watch the magic happen! ✨

For detailed instructions, see the [Motia Cloud Deployment Guide](https://www.motia.dev/docs/deployment-guide/motia-cloud/deployment#using-web-interface).


## License

MIT
