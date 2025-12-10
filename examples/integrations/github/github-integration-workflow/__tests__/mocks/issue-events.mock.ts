import { IssueClassification } from '../../types/github'

export const mockIssueOpenedEvent = {
  issueNumber: 456,
  title: 'Bug: Login page crashes on mobile',
  body: 'When trying to login on mobile devices, the page crashes after entering credentials.',
  owner: 'motia',
  repo: 'motia-examples',
  author: 'testuser',
  state: 'open',
  labels: [],
}

export const mockIssueClassification: IssueClassification = {
  type: 'bug',
  priority: 'high',
  complexity: 'moderate',
}

export const mockIssueClassifiedEvent = {
  ...mockIssueOpenedEvent,
  classification: mockIssueClassification,
}

export const mockTeamMembers = [
  {
    username: 'frontend-dev',
    name: 'Frontend Developer',
    expertise: ['react', 'javascript', 'css', 'ui', 'frontend'],
    availability: 8,
  },
  {
    username: 'backend-dev',
    name: 'Backend Developer',
    expertise: ['node', 'express', 'api', 'database', 'backend'],
    availability: 7,
  },
  {
    username: 'security-expert',
    name: 'Security Expert',
    expertise: ['security', 'authentication', 'authorization', 'encryption'],
    availability: 5,
  },
  {
    username: 'mobile-dev',
    name: 'Mobile Developer',
    expertise: ['react-native', 'ios', 'android', 'mobile'],
    availability: 9,
  },
]

export const mockSuggestedAssignees = ['mobile-dev', 'frontend-dev']

export const mockIssueAssignedEvent = {
  ...mockIssueClassifiedEvent,
  suggestedAssignees: mockSuggestedAssignees,
}

export const mockIssueWebhookPayload = {
  action: 'opened',
  issue: {
    url: 'https://api.github.com/repos/motia/motia-examples/issues/456',
    repository_url: 'https://api.github.com/repos/motia/motia-examples',
    labels_url: 'https://api.github.com/repos/motia/motia-examples/issues/456/labels{/name}',
    comments_url: 'https://api.github.com/repos/motia/motia-examples/issues/456/comments',
    events_url: 'https://api.github.com/repos/motia/motia-examples/issues/456/events',
    html_url: 'https://github.com/motia/motia-examples/issues/456',
    id: 1234567890,
    node_id: 'MDExOlB1bGxSZXF1ZXN0MTIzNDU2Nzg5MA==',
    number: 456,
    title: 'Bug: Login page crashes on mobile',
    body: 'When trying to login on mobile devices, the page crashes after entering credentials.',
    user: {
      login: 'testuser',
      id: 12345678,
      node_id: 'MDQ6VXNlcjEyMzQ1Njc4',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345678?v=4',
      gravatar_id: '',
      url: 'https://api.github.com/users/testuser',
      html_url: 'https://github.com/testuser',
      type: 'User',
      site_admin: false,
    },
    labels: [],
    state: 'open',
    locked: false,
    assignee: null,
    assignees: [],
    milestone: null,
    comments: 0,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    closed_at: null,
    author_association: 'CONTRIBUTOR',
    active_lock_reason: null,
  },
  repository: {
    id: 87654321,
    node_id: 'MDEwOlJlcG9zaXRvcnk4NzY1NDMyMQ==',
    name: 'motia-examples',
    full_name: 'motia/motia-examples',
    private: false,
    owner: {
      login: 'motia',
      id: 87654321,
      node_id: 'MDQ6VXNlcjg3NjU0MzIx',
      avatar_url: 'https://avatars.githubusercontent.com/u/87654321?v=4',
      gravatar_id: '',
      url: 'https://api.github.com/users/motia',
      html_url: 'https://github.com/motia',
      type: 'Organization',
      site_admin: false,
    },
    html_url: 'https://github.com/motia/motia-examples',
    description: 'Example workflows for Motia',
    fork: false,
    url: 'https://api.github.com/repos/motia/motia-examples',
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-01-01T00:00:00Z',
    pushed_at: '2023-01-01T00:00:00Z',
    default_branch: 'main',
  },
  sender: {
    login: 'testuser',
    id: 12345678,
    node_id: 'MDQ6VXNlcjEyMzQ1Njc4',
    avatar_url: 'https://avatars.githubusercontent.com/u/12345678?v=4',
    gravatar_id: '',
    url: 'https://api.github.com/users/testuser',
    html_url: 'https://github.com/testuser',
    type: 'User',
    site_admin: false,
  },
}

export const mockIssueEditedWebhookPayload = {
  ...mockIssueWebhookPayload,
  action: 'edited',
  issue: {
    ...mockIssueWebhookPayload.issue,
    title: 'Bug: Login page crashes on mobile - Updated',
    body: 'Updated description with more details about the crash.',
  },
  changes: {
    title: {
      from: 'Bug: Login page crashes on mobile',
    },
    body: {
      from: 'When trying to login on mobile devices, the page crashes after entering credentials.',
    },
  },
}

export const mockIssueClosedWebhookPayload = {
  ...mockIssueWebhookPayload,
  action: 'closed',
  issue: {
    ...mockIssueWebhookPayload.issue,
    state: 'closed',
    closed_at: '2023-01-02T00:00:00Z',
  },
}
