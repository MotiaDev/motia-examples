import { createMockContext } from '@motiadev/test'
import { handler } from '../complete-approved-card.step'
import { TrelloService } from '../../services/trello.service'
import { appConfig } from '../../config/default'

jest.mock('motia')
jest.mock('../../services/trello.service')
jest.mock('../../config/default', () => ({
  appConfig: {
    trello: {
      lists: {
        needsReview: 'list-123',
        completed: 'list-456',
      },
    },
  },
}))

describe('Complete Approved Card', () => {
  const mockContext = createMockContext()
  const mockMoveCard = jest.fn()
  const mockAddComment = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(TrelloService as jest.Mock).mockImplementation(() => ({
      moveCard: mockMoveCard,
      addComment: mockAddComment,
    }))
  })

  it('should move card to completed when approved', async () => {
    const payload = {
      card: {
        id: 'card-123',
        name: 'Test Card',
        list: {
          id: appConfig.trello.lists.needsReview,
        },
      },
      comment: {
        text: 'approved',
        idMember: 'member1',
      },
    }

    await handler(payload, mockContext)

    expect(mockMoveCard).toHaveBeenCalledWith('card-123', appConfig.trello.lists.completed)
    expect(mockAddComment).toHaveBeenCalledWith(
      'card-123',
      '✅ Card has been approved by @member1. Moving to Completed!'
    )
  })

  it('should not move card if comment is not "approved"', async () => {
    const payload = {
      card: {
        id: 'card-123',
        name: 'Test Card',
        list: {
          id: appConfig.trello.lists.needsReview,
        },
      },
      comment: {
        text: 'looks good',
        idMember: 'member1',
      },
    }

    await handler(payload, mockContext)

    expect(mockMoveCard).not.toHaveBeenCalled()
    expect(mockAddComment).not.toHaveBeenCalled()
  })

  it('should not move card if not in needs review list', async () => {
    const payload = {
      card: {
        id: 'card-123',
        name: 'Test Card',
        list: {
          id: 'some-other-list',
        },
      },
      comment: {
        text: 'approved',
        idMember: 'member1',
      },
    }

    await handler(payload, mockContext)

    expect(mockMoveCard).not.toHaveBeenCalled()
    expect(mockAddComment).not.toHaveBeenCalled()
  })

  it('should handle case-insensitive approval', async () => {
    const payload = {
      card: {
        id: 'card-123',
        name: 'Test Card',
        list: {
          id: appConfig.trello.lists.needsReview,
        },
      },
      comment: {
        text: 'APPROVED',
        idMember: 'member1',
      },
    }

    await handler(payload, mockContext)

    expect(mockMoveCard).toHaveBeenCalledWith('card-123', appConfig.trello.lists.completed)
    expect(mockAddComment).toHaveBeenCalledWith(
      'card-123',
      '✅ Card has been approved by @member1. Moving to Completed!'
    )
  })

  it('should log the completion process', async () => {
    const payload = {
      card: {
        id: 'card-123',
        name: 'Test Card',
        list: {
          id: appConfig.trello.lists.needsReview,
        },
      },
      comment: {
        text: 'approved',
        idMember: 'member1',
      },
    }

    await handler(payload, mockContext)

    expect(mockContext.logger.info).toHaveBeenCalledWith('Processing completion request', {
      cardId: 'card-123',
      commentText: 'approved',
      listId: appConfig.trello.lists.needsReview,
    })
    expect(mockContext.logger.info).toHaveBeenCalledWith('Moving card to Completed', {
      cardId: 'card-123',
    })
  })
}) 