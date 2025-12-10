import { createMockContext } from '@motiadev/test'
import { TrelloService } from '../../services/trello.service'
import { OpenAIService } from '../../services/openai.service'
import { handler } from '../mark-card-for-review.step'
import { appConfig } from '../../config/default'

jest.mock('../../services/trello.service')
jest.mock('../../services/openai.service')
jest.mock('../../config/default', () => ({
  appConfig: {
    trello: {
      lists: {
        inProgress: 'list-123',
        needsReview: 'list-456',
      },
    },
  },
}))

describe('Mark Card For Review', () => {
  const mockContext = createMockContext()
  const mockMoveCard = jest.fn()
  const mockGenerateSummary = jest.fn()
  const mockGetCard = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(TrelloService as jest.Mock).mockImplementation(() => ({
      moveCard: mockMoveCard,
      getCard: mockGetCard,
      addComment: jest.fn(),
    }))
    ;(OpenAIService as jest.Mock).mockImplementation(() => ({
      generateSummary: mockGenerateSummary,
    }))
  })

  it('should move card to needs review when development is completed', async () => {
    const mockCard = {
      id: 'card-123',
      name: 'Test Card',
      desc: 'Card description',
      idList: appConfig.trello.lists.inProgress,
    }
    const mockSummary = 'Generated summary'

    mockGetCard.mockResolvedValue(mockCard)
    mockGenerateSummary.mockResolvedValue(mockSummary)

    const input = {
      id: 'card-123',
      customFieldItem: {
        idCustomField: '67a761df9d19dc4a6506eb75',
        idValue: '67a76e7cf356bd5af7d8b744',
      },
    }

    await handler(input, mockContext)

    expect(mockMoveCard).toHaveBeenCalledWith('card-123', appConfig.trello.lists.needsReview)
    expect(mockContext.emit).toHaveBeenCalledWith({
      topic: 'notify.slack',
      data: {
        channel: '#code-review',
        message: expect.stringContaining(mockSummary),
      },
    })
  })
}) 