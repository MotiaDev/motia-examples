import { createMockContext } from '@motiadev/test'
import { handler } from '../../steps/pr-classifier/pr-webhook.step'
import { GithubPREvent } from '../../types/github-events'
import type { ApiRequest } from 'motia'

describe('PR Webhook Step', () => {
  let mockContext: ReturnType<typeof createMockContext>

  beforeEach(() => {
    mockContext = createMockContext()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const createApiRequest = (payload: unknown): ApiRequest => ({
    body: payload,
    pathParams: {},
    queryParams: {},
    headers: {},
  })

  it('should handle PR opened webhook and emit event', async () => {
    const prOpenedPayload = {
      action: 'opened',
      pull_request: {
        number: 123,
        title: 'Add new feature',
        body: 'This PR adds a new feature',
        user: {
          login: 'testuser',
        },
        head: {
          ref: 'feature-branch',
          sha: 'abc123def456',
        },
        base: {
          ref: 'main',
        },
      },
      repository: {
        owner: {
          login: 'motia',
        },
        name: 'motia-examples',
      },
    }

    const response = await handler(createApiRequest(prOpenedPayload), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubPREvent.Opened,
      data: {
        prNumber: 123,
        title: 'Add new feature',
        body: 'This PR adds a new feature',
        owner: 'motia',
        repo: 'motia-examples',
        author: 'testuser',
        baseBranch: 'main',
        headBranch: 'feature-branch',
        commitSha: 'abc123def456',
        labels: [],
        state: undefined,
      },
    })

    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      '[PR Webhook] Received webhook',
      expect.objectContaining({
        action: 'opened',
        prNumber: 123,
      })
    )
  })

  it('should handle PR edited webhook and emit event', async () => {
    const prEditedPayload = {
      action: 'edited',
      pull_request: {
        number: 123,
        title: 'Updated feature',
        body: 'This PR updates the feature',
        user: {
          login: 'testuser',
        },
        head: {
          ref: 'feature-branch',
          sha: 'abc123def456',
        },
        base: {
          ref: 'main',
        },
      },
      repository: {
        owner: {
          login: 'motia',
        },
        name: 'motia-examples',
      },
    }

    const response = await handler(createApiRequest(prEditedPayload), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubPREvent.Edited,
      data: {
        prNumber: 123,
        title: 'Updated feature',
        body: 'This PR updates the feature',
        owner: 'motia',
        repo: 'motia-examples',
        author: 'testuser',
        baseBranch: 'main',
        headBranch: 'feature-branch',
        commitSha: 'abc123def456',
        labels: [],
        state: undefined,
      },
    })

    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })
  })

  it('should handle PR closed webhook and emit event', async () => {
    const prClosedPayload = {
      action: 'closed',
      pull_request: {
        number: 123,
        title: 'Feature',
        body: 'This PR will be closed',
        state: 'closed',
        user: {
          login: 'testuser',
        },
        head: {
          ref: 'feature-branch',
          sha: 'abc123def456',
        },
        base: {
          ref: 'main',
        },
        merged: false,
      },
      repository: {
        owner: {
          login: 'motia',
        },
        name: 'motia-examples',
      },
    }

    const response = await handler(createApiRequest(prClosedPayload), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubPREvent.Closed,
      data: {
        prNumber: 123,
        title: 'Feature',
        body: 'This PR will be closed',
        owner: 'motia',
        repo: 'motia-examples',
        author: 'testuser',
        baseBranch: 'main',
        headBranch: 'feature-branch',
        commitSha: 'abc123def456',
        labels: [],
        state: 'closed',
      },
    })

    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })
  })

  it('should handle PR merged webhook and emit event', async () => {
    const prMergedPayload = {
      action: 'closed',
      pull_request: {
        number: 123,
        title: 'Feature',
        body: 'Description',
        user: {
          login: 'testuser',
        },
        head: {
          ref: 'feature-branch',
          sha: 'abc123def456',
        },
        base: {
          ref: 'main',
        },
        merged: true,
      },
      repository: {
        owner: {
          login: 'motia',
        },
        name: 'motia-examples',
      },
    }

    const response = await handler(createApiRequest(prMergedPayload), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubPREvent.Merged,
      data: expect.objectContaining({
        prNumber: 123,
      }),
    })

    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })
  })

  it('should handle unsupported webhook actions', async () => {
    const unsupportedPayload = {
      action: 'labeled',
      pull_request: {
        number: 123,
        labels: ['bug'],
        user: {
          login: 'testuser',
        },
        head: {
          ref: 'feature-branch',
          sha: 'abc123def456',
        },
        base: {
          ref: 'main',
          repo: {
            owner: {
              login: 'motia',
            },
            name: 'motia-examples',
          },
        },
      },
      repository: {
        owner: {
          login: 'motia',
        },
        name: 'motia-examples',
      },
    }

    const response = await handler(createApiRequest(unsupportedPayload), mockContext)

    expect(mockContext.emit).not.toHaveBeenCalled()

    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })

    expect(mockContext.logger.warn).toHaveBeenCalledWith(
      '[PR Webhook] Unsupported action',
      expect.objectContaining({
        action: 'labeled',
      })
    )
  })
})
