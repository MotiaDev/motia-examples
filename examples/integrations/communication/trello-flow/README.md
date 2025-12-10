# Trello Task Automation with Motia

This project implements an automated task progression system for Trello boards using the Motia framework, enhanced with AI-powered task summaries. It streamlines the software development workflow by automatically moving cards between lists based on specific triggers and providing AI-generated summaries for code review.

![System Flow Diagram](./docs/flow.png)

## 🎯 Features

- Automated task progression across board lists
- Validation of task completeness
- AI-generated task summaries for code review
- Automated comments and notifications
- Slack integration for code review notifications
- Due date monitoring and overdue notifications

## 🏗 System Architecture

### Trello Board Structure

- **New Tasks**: Entry point for all new tasks
- **In Progress**: Active development stage
- **Needs Review**: Code review stage with AI summaries
- **Completed**: Successfully reviewed and approved tasks

### Automated Workflows

1. **Task Validation**

   - Validates presence of title, description, and assigned user
   - Adds comments for missing information

2. **Progress Tracking**

   - Automatically moves cards when assignees are added
   - Generates confirmation comments for state changes

3. **Review Process**

   - Moves cards to review when marked as "Done"
   - Generates AI summaries for reviewers
   - Notifies Slack channel #code-review

4. **Completion Handling**
   - Processes reviewer approval comments
   - Moves approved tasks to completion

## 🚀 Getting Started

### Prerequisites

- Trello account with API access
- Motia framework setup
- Node.js (version X.X.X)
- Slack workspace (for notifications)

### Installation

1. Clone the repository:

```bash
git clone git@github.com:MotiaDev/Ytallo-Challenge.git
cd Ytallo-Challenge
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

4. Update `.env` with your credentials:

```
TRELLO_API_KEY=your_trello_api_key
TRELLO_TOKEN=your_trello_token

OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=your_openai_model

SLACK_WEBHOOK_URL=your_slack_webhook_url

TRELLO_NEW_TASKS_LIST_ID=your_new_tasks_list_id
TRELLO_IN_PROGRESS_LIST_ID=your_in_progress_list_id
TRELLO_NEEDS_REVIEW_LIST_ID=your_needs_review_list_id
TRELLO_COMPLETED_LIST_ID=your_completed_list_id
```

## 🛠 Configuration

### Trello Setup

1. Create a new board with the following lists:

   - New Tasks
   - In Progress
   - Needs Review
   - Completed

2. Add custom fields:
   - Status (dropdown: Todo, In Progress, Done)

### Webhook Configuration

Configure webhooks to listen for:

- Card creation
- Card updates (assignments, status changes)
- Comment additions

## 📚 Usage

### Running the Application

```bash
pnpm dev
```

### Testing

```bash
pnpm test
```

## 🧪 Testing Scenarios

The project includes automated tests for:

- Trello webhook event handling and validation
- Integration with Trello API endpoints
- Environment configuration validation
- Test helpers and utilities for mocking Trello responses

All tests are run using Jest framework and can be found in the `test/` and `steps/__tests__/` directories.

## 👥 Authors

- Ytallo Silva
