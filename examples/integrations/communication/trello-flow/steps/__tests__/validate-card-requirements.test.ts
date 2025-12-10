import { Logger, FlowContext } from 'motia'
import { createMockLogger, createMockContext } from '@motiadev/test'
import { handler } from '../validate-card-requirements.step'
import { TrelloService } from '../../services/trello.service'

jest.mock('../../services/trello.service')
jest.mock('motia')

describe('Validate Card Requirements', () => {
  let mockLogger: jest.Mocked<Logger>
  let mockContext: FlowContext
  let mockAddComment: jest.Mock
  let mockMoveCard: jest.Mock

  beforeEach(() => {
    mockLogger = createMockLogger()
    mockContext = createMockContext({ logger: mockLogger })
    mockAddComment = jest.fn()
    mockMoveCard = jest.fn()

    ;(TrelloService as jest.Mock).mockImplementation(() => ({
      addComment: mockAddComment,
      moveCard: mockMoveCard,
    }))

    jest.clearAllMocks()
  })

  it('should validate card with all required fields', async () => {
    const card = {
      id: 'card-123',
      name: 'Test Card',
      desc: 'Card description',
      members: [{ id: 'member-1' }],
    }

    await handler(card, mockContext)

    expect(mockAddComment).not.toHaveBeenCalled()
    expect(mockContext.logger.info).toHaveBeenCalledWith('Card validation successful', {
      cardId: 'card-123',
    })
  })

  it('should add comment when title is missing', async () => {
    const card = {
      id: 'card-123',
      name: '',
      desc: 'Card description',
      members: [{ id: 'member-1' }],
    }

    await handler(card, mockContext)

    expect(mockAddComment).toHaveBeenCalledWith(
      'card-123',
      '🚨 Card is incomplete! Please add: \n* title'
    )
  })

  it('should add comment when description is missing', async () => {
    const card = {
      id: 'card-123',
      name: 'Test Card',
      desc: '',
      members: [{ id: 'member-1' }],
    }

    await handler(card, mockContext)

    expect(mockAddComment).toHaveBeenCalledWith(
      'card-123',
      '🚨 Card is incomplete! Please add: \n* description'
    )
  })

  it('should add comment when no members assigned', async () => {
    const card = {
      id: 'card-123',
      name: 'Test Card',
      desc: 'Card description',
      members: [],
    }

    await handler(card, mockContext)

    expect(mockAddComment).toHaveBeenCalledWith(
      'card-123',
      '🚨 Card is incomplete! Please add: \n* assigned user'
    )
  })
}) 