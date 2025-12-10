import { TrelloActionType, TrelloCard, TrelloWebhookPayload } from '../../types/trello'
import { createMockTrelloCard } from './trello-card.mock'

export const createMockTrelloWebhookPayload = (
  actionType: TrelloActionType,
  card: TrelloCard = createMockTrelloCard(),
  overrides = {},
): TrelloWebhookPayload => {
  const basePayload = {
    action: {
      type: actionType,
      data: {
        card: {
          id: card.id,
          name: card.name,
          desc: card.desc,
        },
        list: {
          id: card.idList,
        },
      },
      display: {
        entities: {
          memberCreator: {
            username: 'testUser',
          },
        },
      },
    },
  }

  return {
    ...basePayload,
    ...overrides,
    action: {
      ...basePayload.action,
      ...(overrides as any).action,
    },
  }
}

// Specific mock examples for different webhook events
export const mockCreateCardWebhook = createMockTrelloWebhookPayload('createCard')

export const mockCommentCardWebhook = createMockTrelloWebhookPayload('commentCard', createMockTrelloCard(), {
  action: {
    type: 'commentCard',
    data: {
      card: {
        id: 'card123',
        name: 'Test Card',
      },
      list: {
        id: 'list123',
      },
      text: 'This is a test comment',
    },
    display: {
      entities: {
        memberCreator: {
          username: 'commentAuthor',
        },
      },
    },
  },
})

export const mockCustomFieldUpdateWebhook = createMockTrelloWebhookPayload(
  'updateCustomFieldItem',
  createMockTrelloCard(),
  {
    action: {
      type: 'updateCustomFieldItem',
      data: {
        card: {
          id: 'card123',
          name: 'Test Card',
        },
        customFieldItem: {
          idCustomField: 'customField123',
          idValue: 'value123',
        },
      },
    },
  },
)

export const mockMemberAssignmentWebhook = createMockTrelloWebhookPayload('addMemberToCard', createMockTrelloCard(), {
  action: {
    type: 'addMemberToCard',
    data: {
      card: {
        id: 'card123',
        name: 'Test Card',
      },
      member: {
        id: 'member123',
        username: 'assignedUser',
      },
    },
  },
})
