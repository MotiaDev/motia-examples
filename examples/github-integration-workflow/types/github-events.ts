import { IssueClassification } from './github'

export enum GithubPREvent {
  Opened = 'github.pr.opened',
  Edited = 'github.pr.edited',
  Closed = 'github.pr.closed',
  Merged = 'github.pr.merged',
  Classified = 'github.pr.classified',
  Labeled = 'github.pr.labeled',
  ReviewersAssigned = 'github.pr.reviewers-assigned',
  TestsCompleted = 'github.pr.tests-completed',
}

export enum GithubIssueEvent {
  Opened = 'github.issue.opened',
  Edited = 'github.issue.edited',
  Closed = 'github.issue.closed',
  Processed = 'github.issue.processed',
  Classified = 'github.issue.classified',
  Labeled = 'github.issue.labeled',
  Assigned = 'github.issue.assigned',
  Updated = 'github.issue.updated',
  Archived = 'github.issue.archived',
}

export enum GithubWebhookEndpoint {
  Issue = '/api/github/webhook',
  PR = '/api/github/pr-webhook',
}

/**
 * Base interface for GitHub issue events
 */
export interface GithubIssueBaseEvent {
  issueNumber: number
  title: string
  body: string
  owner: string
  repo: string
  author: string
  state?: string
  labels?: string[]
}

/**
 * Event emitted when a GitHub issue is opened
 */
export type GithubIssueOpenedEvent = GithubIssueBaseEvent

/**
 * Event emitted when a GitHub issue is edited
 */
export type GithubIssueEditedEvent = GithubIssueBaseEvent

/**
 * Event emitted when a GitHub issue is closed
 */
export type GithubIssueClosedEvent = GithubIssueBaseEvent

/**
 * Event emitted when a GitHub issue is classified
 */
export interface GithubIssueClassifiedEvent extends GithubIssueBaseEvent {
  classification: IssueClassification
}

/**
 * Event emitted when assignees are suggested for a GitHub issue
 */
export interface GithubIssueSuggestedAssigneesEvent extends GithubIssueClassifiedEvent {
  suggestedAssignees: string[]
}

/**
 * Event emitted when a GitHub issue is assigned
 */
export interface GithubIssueAssignedEvent extends GithubIssueClassifiedEvent {
  assignees: string[]
}
