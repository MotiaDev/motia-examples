
# 🥷 Spamurai
[![Motia.dev](https://img.shields.io/badge/Built%20with-Motia.dev-blue)](https://motia.dev)
A GitHub PR Assistant powered by [Motia.dev](https://motia.dev) AI Agent Framework. 
![Motia Workbench](https://github.com/user-attachments/assets/b078bc35-ddcb-42f0-b109-89917a1169c2)



## 📖 Overview
Close spammy PRs intelligently - This GitHub App automatically monitors pull requests, posts comments, and closes if they are spammy (based on conditions you decide). 

---

## ✨ What This App Does

- 🧠 Posts automated contextual comments on Pull Requests
- 🛑 Closes PRs based on custom logic that you can define and change
- 🧩 Listens to GitHub webhook events using a local server
- 🚀 Uses [OpenAI](https://platform.openai.com/) to analyse PRs and generate intelligent messages
- ☝️ Uses PR diffs to analyse PRs and matches PR title/description with the diff, so that the comments are always contextual
- 💡 Built entirely using [Motia.dev](https://motia.dev) to showcase how fast you can go from zero to awesome!

---

---

## 📦 Prerequisites

You'll need the following before running this locally:

- Node.js ≥ 18.x and npm
- [ngrok](https://ngrok.com/) (for webhook tunneling)
- A GitHub account
- A [GitHub App](https://github.com/settings/apps) of your own
- An [OpenAI API key](https://platform.openai.com/account/api-keys)

---
## Table of Contents

- [Prerequisites](#-prerequisites)
- [Quickstart](#quick-start)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [GitHub App Setup](#github-app-setup)
  - [Setting Up Webhooks with ngrok](#setting-up-webhooks-with-ngrok)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
---
## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/sumitsaurabh927/Spamurai-pr-agent
   cd spamurai
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file in the root directory (see [Environment Variables](#environment-variables) section).

4. Start your application server:
   ```bash
   pnpm start
   ```

5. Run ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```

6. Create and configure your GitHub App (see [GitHub App Setup](#github-app-setup) section).

7. Update the webhook URL in your GitHub App settings with your ngrok URL.

8. Install the app on your desired repository.

## ✅ Checklist Summary

| Step | ✅ Done |
| ---- | ----- |
| Clone repo | ☑️ |
| Install dependencies | ☑️ |
| Create GitHub App | ☑️ |
| Set permissions + webhook events | ☑️ |
| Create `.env` file | ☑️ |
| Start your app | ☑️ |
| Run ngrok | ☑️ |
| Update webhook URL | ☑️ |
| Install app on a repo | ☑️ |

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_PAT=your_personal_access_token
GITHUB_APP_ID=your_github_app_id
GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
OPENAI_API_KEY=your_openai_api_key
```

Notes:
- For `GITHUB_PRIVATE_KEY`, make sure to include the entire RSA key with newlines replaced by `\n`. You can convert it using this command: `awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private-key.pem`
- Generate a random string for `GITHUB_WEBHOOK_SECRET` (you'll use this when setting up the GitHub App)

### GitHub App Setup

1. Go to your [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New GitHub App" and fill in the details:
   - **Name**: Give your app a unique name (Spamurai)
   - **Homepage URL**: Your project's homepage or repository URL
   - **Webhook URL**: Your ngrok URL (see below) + `/webhooks/github` (e.g., `https://5316-2401-4900-4e7e-90f5-5d65-9a3f-9f74-787f.ngrok-free.app/webhooks/github`)
   - **Webhook Secret**: The same value you used for `GITHUB_WEBHOOK_SECRET`

3. Set the required permissions:
   - **Repository permissions**:
     - Contents: Read & write
     - Issues: Read & write
     - Pull requests: Read & write
     - Metadata: Read-only (mandatory)

4. Subscribe to the following events:
   - Issue comment
   - Pull request
   - Pull request review
   - Push

5. After creating the app, note your **App ID** and generate a **private key** (download it).

### Setting Up Webhooks with ngrok

For local development, you need to expose your local server to the internet using ngrok:

1. Start your application server:
   ```bash
   pnpm start
   ```

2. In a new terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

3. Copy the HTTPS forwarding URL (e.g., `https://5316-2401-4900-4e7e-90f5-5d65-9a3f-9f74-787f.ngrok-free.app`)

4. Update your GitHub App's webhook URL with this ngrok URL + `/webhooks/github`

5. Install the app on your desired repository (from the app's settings page).

**Note**: The ngrok URL changes each time you restart ngrok unless you have a paid account. Update your GitHub App's webhook URL whenever it changes.

## Usage

After setup, Spamurai will automatically:

1. Listen for webhook events from GitHub
2. Process events according to the Motia.dev agent workflows
3. Perform actions like commenting on PRs or closing them based on configured rules

The app demonstrates how to build AI-powered GitHub automation using the Motia.dev framework.

## Motia.dev Integration

Spamurai leverages the [Motia.dev](https://motia.dev) AI Agent Framework to:

- Create intelligent workflows that respond to GitHub events
- Generate contextually relevant PR comments using OpenAI
- Make smart decisions about PR management based on content analysis
- Showcase how engineers can build AI-powered tools with minimal overhead

Visit [Motia.dev](https://motia.dev) to learn more about building your own AI-powered developer tools.

## Troubleshooting

### Webhook Not Receiving Events

- Verify your ngrok URL is correctly set in the GitHub App settings
- Check that the webhook secret matches between GitHub and your `.env` file
- Ensure your app is installed on the repository you're testing with

### Authentication Issues

- Verify your `GITHUB_APP_ID` and `GITHUB_PRIVATE_KEY` are correct
- Check that your app has the necessary permissions

### Webhook Payload Errors

- Review GitHub's webhook documentation for [event payloads](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads)
- Add logging to see the incoming webhook data

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Project Structure

```
├── services/
│   ├── github          # GitHub API integration
│   └── openai          # OpenAI API integration
├── steps/
│   ├── pr-webhook      # Handles incoming PR webhook events from GitHub to detect and respond to spammy PRs
│   └── spam-detection  # Checks the PR for spamminess
│   └── comment         # Post a contextual and intelligent comment
│   └── pr-closer       # Close a PR if found spammy
│   └── noop            # Simulates GitHub PR webhook events to test Spamurai flow
├── types/              # enums for the project
└── ...
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This project is a demonstration of [Motia.dev](https://motia.dev) capabilities. For production use, consider implementing additional security and scaling features. Learn more at [Motia docs](https://www.motia.dev/docs), and join our [Discord](https://discord.gg/3FJ3f4Hz) to ask questions and talk to the Motia community.
