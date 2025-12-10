import { createMockContext } from '@motiadev/test'
import { handler } from '../start-assigned-card.step'
import { TrelloService } from '../../services/trello.service'
import { appConfig } from '../../config/default'

jest.mock('motia')
jest.mock('../../services/trello.service')
jest.mock('../../config/default', () => ({
  appConfig: {
    trello: {
      lists: {
        newTasks: 'list-123',
        inProgress: 'list-456',
      },
    },
  },
}))

describe('Start Assigned Card', () => {
  const mockContext = createMockContext()
  const mockMoveCard = jest.fn()
  const mockGetCard = jest.fn()
  const mockAddComment = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(TrelloService as jest.Mock).mockImplementation(() => ({
      moveCard: mockMoveCard,
      getCard: mockGetCard,
      addComment: mockAddComment,
    }))
  })

  it('should move card to In Progress when member is assigned', async () => {
    const mockCard = {
      id: 'card-123',
      idList: appConfig.trello.lists.newTasks,
      members: [
        {
          id: 'member-1',
          fullName: 'John Doe',
        },
      ],
    }

    mockGetCard.mockResolvedValue(mockCard)

    await handler({ id: 'card-123' }, mockContext)

    expect(mockMoveCard).toHaveBeenCalledWith('card-123', appConfig.trello.lists.inProgress)
    expect(mockAddComment).toHaveBeenCalledWith(
      'card-123',
      '🚀 Card has been assigned to **John Doe** and moved to In Progress!'
    )
  })

  it('should not move card if not in new cards list', async () => {
    const mockCard = {
      id: 'card-123',
      idList: 'some-other-list',
      members: [
        {
          id: 'member-1',
          fullName: 'John Doe',
        },
      ],
    }

    mockGetCard.mockResolvedValue(mockCard)

    await handler({ id: 'card-123' }, mockContext)

    expect(mockMoveCard).not.toHaveBeenCalled()
    expect(mockAddComment).not.toHaveBeenCalled()
  })

  it('should not move card if no members assigned', async () => {
    const mockCard = {
      id: 'card-123',
      idList: appConfig.trello.lists.newTasks,
      members: [],
    }

    mockGetCard.mockResolvedValue(mockCard)

    await handler({ id: 'card-123' }, mockContext)

    expect(mockMoveCard).not.toHaveBeenCalled()
    expect(mockAddComment).not.toHaveBeenCalled()
  })

  it('should handle error when getting card fails', async () => {
    const mockError = new Error('Failed to get card')
    mockGetCard.mockRejectedValue(mockError)

    await handler({ id: 'card-123' }, mockContext)

    expect(mockMoveCard).not.toHaveBeenCalled()
    expect(mockAddComment).not.toHaveBeenCalled()
    expect(mockContext.logger.error).toHaveBeenCalledWith('Error in Task Progress Handler', mockError)
  })

  it('should handle multiple assigned members', async () => {
    const mockCard = {
      id: 'card-123',
      idList: appConfig.trello.lists.newTasks,
      members: [
        { id: 'member-1', fullName: 'John Doe' },
        { id: 'member-2', fullName: 'Jane Smith' },
      ],
    }

    mockGetCard.mockResolvedValue(mockCard)

    await handler({ id: 'card-123' }, mockContext)

    expect(mockMoveCard).toHaveBeenCalledWith('card-123', appConfig.trello.lists.inProgress)
    expect(mockAddComment).toHaveBeenCalledWith(
      'card-123',
      '🚀 Card has been assigned to **John Doe** and moved to In Progress!'
    )
  })

  it('should log the start process', async () => {
    const mockCard = {
      id: 'card-123',
      idList: appConfig.trello.lists.newTasks,
      members: [{ id: 'member-1', fullName: 'John Doe' }],
    }

    mockGetCard.mockResolvedValue(mockCard)

    await handler({ id: 'card-123' }, mockContext)

    expect(mockContext.logger.info).toHaveBeenCalledWith('Start Assigned Card Handler', { 
      payload: { id: 'card-123' } 
    })
    expect(mockContext.logger.info).toHaveBeenCalledWith('Moving card to In Progress', {
      cardId: 'card-123',
      member: 'John Doe',
    })
  })
}) 