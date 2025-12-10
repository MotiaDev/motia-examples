import { Octokit } from '@octokit/rest'
import { GithubClient } from '../../services/github/GithubClient'
import { mockCheckRuns } from '../mocks/github-events.mock'

jest.mock('@octokit/rest')

describe('GithubClient', () => {
  let githubClient: GithubClient
  let mockGet: jest.Mock
  let mockCreateComment: jest.Mock
  let mockUpdate: jest.Mock
  let mockAddLabels: jest.Mock
  let mockRequestReviewers: jest.Mock
  let mockListForRef: jest.Mock

  beforeEach(() => {
    const originalToken = process.env.GITHUB_TOKEN

    process.env.GITHUB_TOKEN = 'test-token'

    mockGet = jest.fn()
    mockCreateComment = jest.fn()
    mockUpdate = jest.fn()
    mockAddLabels = jest.fn()
    mockRequestReviewers = jest.fn()
    mockListForRef = jest.fn()

    const MockOctokit = Octokit as jest.MockedClass<typeof Octokit>
    MockOctokit.mockImplementation(
      () =>
        ({
          issues: {
            get: mockGet,
            createComment: mockCreateComment,
            update: mockUpdate,
            addLabels: mockAddLabels,
          },
          rest: {
            pulls: {
              requestReviewers: mockRequestReviewers,
            },
            checks: {
              listForRef: mockListForRef,
            },
          },
        }) as unknown as Octokit
    )

    githubClient = new GithubClient()

    process.env.GITHUB_TOKEN = originalToken
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getIssue', () => {
    it('should fetch an issue successfully', async () => {
      const mockIssue = { id: 123, title: 'Test Issue' }
      mockGet.mockResolvedValue({ data: mockIssue })

      const result = await githubClient.getIssue('motia', 'motia-examples', 123)

      expect(mockGet).toHaveBeenCalledWith({
        owner: 'motia',
        repo: 'motia-examples',
        issue_number: 123,
      })
      expect(result).toEqual(mockIssue)
    })

    it('should propagate errors when fetching an issue fails', async () => {
      const error = new Error('API error')
      mockGet.mockRejectedValue(error)

      await expect(githubClient.getIssue('motia', 'motia-examples', 123)).rejects.toThrow(
        'API error'
      )
    })
  })

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const mockComment = { id: 456, body: 'Test comment' }
      mockCreateComment.mockResolvedValue({ data: mockComment })

      const result = await githubClient.createComment(
        'motia',
        'motia-examples',
        123,
        'Test comment'
      )

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'motia',
        repo: 'motia-examples',
        issue_number: 123,
        body: 'Test comment',
      })
      expect(result).toEqual(mockComment)
    })
  })

  describe('updateIssue', () => {
    it('should update an issue successfully', async () => {
      const mockUpdatedIssue = { id: 123, title: 'Updated Title' }
      mockUpdate.mockResolvedValue({ data: mockUpdatedIssue })

      const result = await githubClient.updateIssue('motia', 'motia-examples', 123, {
        title: 'Updated Title',
      })

      expect(mockUpdate).toHaveBeenCalledWith({
        owner: 'motia',
        repo: 'motia-examples',
        issue_number: 123,
        title: 'Updated Title',
      })
      expect(result).toEqual(mockUpdatedIssue)
    })
  })

  describe('addLabels', () => {
    it('should add labels to an issue successfully', async () => {
      const mockLabels = [{ name: 'bug' }, { name: 'high-priority' }]
      mockAddLabels.mockResolvedValue({ data: mockLabels })

      const result = await githubClient.addLabels('motia', 'motia-examples', 123, [
        'bug',
        'high-priority',
      ])

      expect(mockAddLabels).toHaveBeenCalledWith({
        owner: 'motia',
        repo: 'motia-examples',
        issue_number: 123,
        labels: ['bug', 'high-priority'],
      })
      expect(result).toEqual(mockLabels)
    })
  })

  describe('requestReviews', () => {
    it('should request reviews successfully', async () => {
      mockRequestReviewers.mockResolvedValue({})

      await githubClient.requestReviews('motia', 'motia-examples', 123, ['reviewer1', 'reviewer2'])

      expect(mockRequestReviewers).toHaveBeenCalledWith({
        owner: 'motia',
        repo: 'motia-examples',
        pull_number: 123,
        reviewers: ['reviewer1', 'reviewer2'],
      })
    })
  })

  describe('getCheckRuns', () => {
    it('should fetch check runs successfully', async () => {
      const rawCheckRuns = mockCheckRuns.map(run => ({
        ...run,
        node_id: 'node_id',
        external_id: null,
        url: 'url',
        html_url: 'html_url',
        details_url: null,
        head_sha: 'sha',
        output: {
          title: null,
          summary: null,
          text: null,
          annotations_count: 0,
          annotations_url: 'url',
        },
        check_suite: {
          id: 1,
        },
      }))

      mockListForRef.mockResolvedValue({
        data: { check_runs: rawCheckRuns },
      })

      const result = await githubClient.getCheckRuns('motia', 'motia-examples', 'sha123')

      expect(mockListForRef).toHaveBeenCalledWith({
        owner: 'motia',
        repo: 'motia-examples',
        ref: 'sha123',
        per_page: 100,
      })

      expect(result).toHaveLength(mockCheckRuns.length)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('status')
      expect(result[0]).toHaveProperty('conclusion')
    })
  })
})
