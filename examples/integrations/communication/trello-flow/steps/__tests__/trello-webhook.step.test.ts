import { ApiRequest } from 'motia'
import { createMockContext } from '@motiadev/test'
import { handler } from '../trello-webhook.step'
import { TrelloService } from '../../services/trello.service'
import {
  mockCreateCardWebhook,
  mockCommentCardWebhook,
  mockCustomFieldUpdateWebhook,
  mockMemberAssignmentWebhook,
} from '../../test/mocks/trello-webhook.mock'

jest.mock('../../services/trello.service')

const createApiRequest = (payload: any): ApiRequest => ({
  body: payload,
  pathParams: {},
  queryParams: {},
  headers: {},
})

describe('Trello Webhook Handler', () => {
  let mockContext: ReturnType<typeof createMockContext>
  let mockGetCard: jest.Mock

  beforeEach(() => {
    mockContext = createMockContext()
    mockGetCard = jest.fn()
    mockContext.emit = jest.fn()

    ;(TrelloService as jest.Mock).mockImplementation(() => ({
      getCard: mockGetCard,
    }))
  })

  it('should emit card.created event', async () => {
    const mockCard = {
      id: 'card123',
      name: 'Test Card',
      desc: 'Test Description',
      members: [],
      idList: 'list123',
    }
    mockGetCard.mockResolvedValue(mockCard)

    const response = await handler(createApiRequest(mockCreateCardWebhook), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: 'card.created',
      data: {
        id: mockCard.id,
        name: mockCard.name,
        desc: mockCard.desc,
        members: mockCard.members,
        list: mockCard.idList,
      },
    })
    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })
  })

  it('should emit card.commented event', async () => {
    const mockCard = {
      id: mockCommentCardWebhook.action.data.card?.id,
      idList: mockCommentCardWebhook.action.data.list?.id || 'default-list',
    }
    mockGetCard.mockResolvedValue(mockCard)

    const response = await handler(createApiRequest(mockCommentCardWebhook), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: 'card.commented',
      data: {
        card: {
          id: mockCard.id,
          list: mockCard.idList,
        },
        comment: {
          text: mockCommentCardWebhook.action.data.text || '',
          idMember: mockCommentCardWebhook.action.display?.entities.memberCreator?.username || '',
        },
      },
    })
    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })
  })

  it('should emit card.updateCustomFieldItem event', async () => {
    const mockCard = {
      id: mockCustomFieldUpdateWebhook.action.data.card?.id,
      customFieldItems: [mockCustomFieldUpdateWebhook.action.data.customFieldItem],
    }
    mockGetCard.mockResolvedValue(mockCard)

    const response = await handler(createApiRequest(mockCustomFieldUpdateWebhook), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: 'card.updateCustomFieldItem',
      data: {
        id: mockCard.id,
        customFieldItem: mockCard.customFieldItems[0],
      },
    })
    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })
  })

  it('should emit member.assigned event', async () => {
    const mockCard = {
      id: mockMemberAssignmentWebhook.action.data.card?.id || 'default-card',
    }
    mockGetCard.mockResolvedValue(mockCard)

    const response = await handler(createApiRequest(mockMemberAssignmentWebhook), mockContext)

    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: 'member.assigned',
      data: {
        id: mockCard.id,
      },
    })
    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })
  })

  it('should do nothing for updateCard action', async () => {
    const mockCard = {
      id: '123',
      name: 'Test Card',
      desc: 'Test Description',
    }
    mockGetCard.mockResolvedValue(mockCard)

    const payload = {
      action: {
        type: 'updateCard',
        data: {
          card: {
            id: '123',
            name: 'Test Card',
            desc: 'Test Description',
          },
        },
      },
    }

    const response = await handler(createApiRequest(payload), mockContext)

    expect(mockContext.emit).not.toHaveBeenCalled()
    expect(response).toEqual({
      status: 200,
      body: { message: 'Webhook processed successfully' },
    })
  })
})
