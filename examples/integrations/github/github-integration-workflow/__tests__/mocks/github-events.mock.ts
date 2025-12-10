import { PRClassification, IssueClassification } from '../../types/github'

export const mockPROpenedEvent = {
  prNumber: 123,
  title: 'Add new feature for user authentication',
  body: 'This PR adds a new feature for user authentication using OAuth2.',
  owner: 'motia',
  repo: 'motia-examples',
  author: 'testuser',
  baseBranch: 'main',
  headBranch: 'feature/user-auth',
  commitSha: 'abc123def456',
}

export const mockPRClassification: PRClassification = {
  type: 'feature',
  impact: 'medium',
  areas: ['authentication', 'frontend', 'api'],
}

export const mockPRClassifiedEvent = {
  ...mockPROpenedEvent,
  classification: mockPRClassification,
}

export const mockIssueOpenedEvent = {
  issueNumber: 456,
  title: 'Bug: Login page crashes on mobile',
  body: 'When trying to login on mobile devices, the page crashes after entering credentials.',
  owner: 'motia',
  repo: 'motia-examples',
  author: 'testuser',
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
    login: 'frontend-dev',
    expertise: ['frontend', 'react', 'css'],
  },
  {
    login: 'backend-dev',
    expertise: ['backend', 'api', 'database'],
  },
  {
    login: 'security-expert',
    expertise: ['security', 'authentication', 'authorization'],
  },
]

export const mockCheckRuns = [
  {
    id: 1,
    name: 'build',
    status: 'completed',
    conclusion: 'success',
    started_at: '2023-01-01T10:00:00Z',
    completed_at: '2023-01-01T10:05:00Z',
  },
  {
    id: 2,
    name: 'test',
    status: 'completed',
    conclusion: 'success',
    started_at: '2023-01-01T10:06:00Z',
    completed_at: '2023-01-01T10:10:00Z',
  },
]
