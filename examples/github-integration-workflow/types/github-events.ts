export enum GithubIssueEvent {
  Opened = 'github.issue.opened',
  Edited = 'github.issue.edited',
  Closed = 'github.issue.closed',
  Processed = 'github.issue.processed',
  Classified = 'github.issue.classified',
  Labeled = 'github.issue.labeled',
  Assigned = 'github.issue.assigned',
  Updated = 'github.issue.updated',
  Archived = 'github.issue.archived'
}

export enum GithubPREvent {
  Opened = 'github.pr.opened',
  Edited = 'github.pr.edited',
  Closed = 'github.pr.closed',
  Merged = 'github.pr.merged',
  Classified = 'github.pr.classified',
  Labeled = 'github.pr.labeled',
  ReviewersAssigned = 'github.pr.reviewers-assigned',
  TestsCompleted = 'github.pr.tests-completed'
}

export enum GithubWebhookEndpoint {
  Issue = '/api/github/webhook',
  PR = '/api/github/pr-webhook'
}

export type GithubEventTypes = {
  // Webhook events
  '/api/github/webhook': 'Simulated GitHub webhook'
  
  // Issue lifecycle events
  'github.issue.opened': 'New issue created'
  'github.issue.edited': 'Issue updated'
  'github.issue.closed': 'Issue closed'
  
  // Processing events
  'github.issue.processed': 'Initial processing complete'
  'github.issue.classified': 'Issue classified by LLM'
  'github.issue.labeled': 'Labels applied'
  'github.issue.assigned': 'Assignees selected'
  'github.issue.archived': 'Issue archived'
} 