import { describe, it, vi, expect, beforeEach } from 'vitest'
import { GithubService } from '../services/github.service'

// 👉 Move mock variables to the top-level scope
const mockCreateComment = vi.fn().mockResolvedValue({ data: { id: 123, body: 'Test comment' } })
const mockUpdatePR = vi.fn().mockResolvedValue({ data: { id: 456, state: 'closed' } })
const mockInstallationAuth = vi.fn().mockResolvedValue({ token: 'mock-token' })

// 🔁 Mock Octokit
vi.mock('@octokit/rest', () => {
    return {
        Octokit: vi.fn().mockImplementation(() => ({
            issues: {
                createComment: mockCreateComment,
            },
            pulls: {
                update: mockUpdatePR,
            },
        })),
    }
})

// 🔁 Mock createAppAuth
vi.mock('@octokit/auth-app', () => {
    return {
        createAppAuth: vi.fn(() => mockInstallationAuth)
    }
})

describe('GithubService', () => {
    beforeEach(() => {
        process.env.GITHUB_APP_ID = '123'
        process.env.GITHUB_PRIVATE_KEY = '---MOCK KEY---'
    })

    it('should get an installation access token', async () => {
        const service = new GithubService()
        const token = await service.getInstallationAccessToken(1)
        expect(token).toBe('mock-token')
    })

    it('should create a comment on a PR', async () => {
        const service = new GithubService()
        const result = await service.createComment('owner', 'repo', 42, 'Nice PR', 1)
        expect(result.body).toBe('Test comment')
        expect(mockCreateComment).toHaveBeenCalledWith({
            owner: 'owner',
            repo: 'repo',
            issue_number: 42,
            body: 'Nice PR',
        })
    })

    it('should close a pull request', async () => {
        const service = new GithubService()
        const result = await service.closePullRequest('owner', 'repo', 42, 1)
        expect(result.state).toBe('closed')
        expect(mockUpdatePR).toHaveBeenCalledWith({
            owner: 'owner',
            repo: 'repo',
            pull_number: 42,
            state: 'closed',
        })
    })
})
