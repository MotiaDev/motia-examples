import { createMockContext } from '@motiadev/test'
import type { ApiRequest } from 'motia'
import { GithubIssueEvent } from '../../types/github-events'
import {
  mockIssueWebhookPayload,
  mockIssueEditedWebhookPayload,
  mockIssueClosedWebhookPayload,
} from '../mocks/issue-events.mock'
import { handler } from '../../steps/issue-triage/github-webhook.step'

describe('GitHub Issue Webhook Step', () => {
  let mockContext: ReturnType<typeof createMockContext>

  beforeEach(() => {
    mockContext = createMockContext()

    mockContext.logger.info = jest.fn()
    mockContext.logger.warn = jest.fn()
    mockContext.logger.error = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const createApiRequest = (payload: unknown): ApiRequest => ({
    body: payload,
    pathParams: {},
    queryParams: {},
    headers: {
      'x-github-event': 'issues',
      'x-github-delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
    },
  })

  it('should handle issue opened webhook and emit event', async () => {
    const response = await handler(createApiRequest(mockIssueWebhookPayload), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubIssueEvent.Opened,
      data: {
        issueNumber: 456,
        title: 'Bug: Login page crashes on mobile',
        body: 'When trying to login on mobile devices, the page crashes after entering credentials.',
        state: 'open',
        labels: [],
        owner: 'motia',
        repo: 'motia-examples',
      },
    })

    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      '[GitHub Webhook] Received webhook',
      expect.objectContaining({
        action: 'opened',
        issueNumber: 456,
      })
    )
  })

  it('should handle issue edited webhook and emit event', async () => {
    const response = await handler(createApiRequest(mockIssueEditedWebhookPayload), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubIssueEvent.Edited,
      data: expect.objectContaining({
        issueNumber: 456,
        title: 'Bug: Login page crashes on mobile - Updated',
        body: 'Updated description with more details about the crash.',
        labels: [],
      }),
    })

    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })
  })

  it('should handle issue closed webhook and emit event', async () => {
    const response = await handler(createApiRequest(mockIssueClosedWebhookPayload), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: GithubIssueEvent.Closed,
      data: expect.objectContaining({
        issueNumber: 456,
        state: 'closed',
        labels: [],
      }),
    })

    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })
  })
})
