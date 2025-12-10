import axios from 'axios'
import {createMockLogger} from "@motiadev/test";
import { TrelloService } from '../trello.service'

jest.mock('axios')
jest.mock('motia')

describe('TrelloService', () => {
  let trelloService: TrelloService
  const mockConfig = {
    apiKey: 'test-api-key',
    token: 'test-token',
  }

  // Mock axios create method
  const mockAxiosCreate = axios.create as jest.Mock
  const mockGet = jest.fn()
  const mockPut = jest.fn()
  const mockPost = jest.fn()

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()

    // Setup axios mock
    mockAxiosCreate.mockReturnValue({
      get: mockGet,
      put: mockPut,
      post: mockPost,
    })

    trelloService = new TrelloService(mockConfig, createMockLogger())
  })

  describe('moveCard', () => {
    it('should successfully move a card to a new list', async () => {
      const mockResponse = { data: { id: 'card-1', idList: 'list-2' } }
      mockPut.mockResolvedValueOnce(mockResponse)

      const result = await trelloService.moveCard('card-1', 'list-2')

      expect(mockPut).toHaveBeenCalledWith('/cards/card-1', {
        idList: 'list-2',
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle errors when moving a card', async () => {
      const error = {
        response: { status: 404 },
        isAxiosError: true,
      }
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)
      mockPut.mockRejectedValueOnce(error)

      await expect(trelloService.moveCard('invalid-card', 'list-2')).rejects.toThrow('Resource not found')
    })
  })

  describe('addComment', () => {
    it('should successfully add a comment to a card', async () => {
      mockPost.mockResolvedValueOnce({ data: {} })
      const comment = 'Test comment'

      await trelloService.addComment('card-1', comment)

      expect(mockPost).toHaveBeenCalledWith(`/cards/card-1/actions/comments?text=${encodeURIComponent(comment)}`)
    })

    it('should handle errors when adding a comment', async () => {
      const error = {
        response: { status: 401 },
        isAxiosError: true,
      }
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)
      mockPost.mockRejectedValueOnce(error)

      await expect(trelloService.addComment('card-1', 'test')).rejects.toThrow('Authentication failed')
    })
  })

  describe('getCard', () => {
    it('should fetch a card with default fields', async () => {
      const mockCard = { id: 'card-1', name: 'Test Card' }
      mockGet.mockResolvedValueOnce({ data: mockCard })

      const result = await trelloService.getCard('card-1')

      expect(mockGet).toHaveBeenCalledWith('/cards/card-1', {
        params: {
          fields: 'all',
          members: true,
          actions: undefined,
          attachments: undefined,
          customFieldItems: true,
        },
      })
      expect(result).toEqual(mockCard)
    })

    it('should fetch a card with custom fields and options', async () => {
      const mockCard = { id: 'card-1', name: 'Test Card' }
      mockGet.mockResolvedValueOnce({ data: mockCard })

      const options = {
        fields: ['id', 'name'],
        actions: true,
        attachments: true,
      }

      await trelloService.getCard('card-1', options)

      expect(mockGet).toHaveBeenCalledWith('/cards/card-1', {
        params: {
          fields: 'id,name',
          members: true,
          actions: true,
          attachments: true,
          customFieldItems: true,
        },
      })
    })
  })

  describe('getCardsInList', () => {
    it('should fetch cards from a list with default options', async () => {
      const mockCards = [{ id: 'card-1' }, { id: 'card-2' }]
      mockGet.mockResolvedValueOnce({ data: mockCards })

      const result = await trelloService.getCardsInList('list-1')

      expect(mockGet).toHaveBeenCalledWith('/lists/list-1/cards', {
        params: {
          fields: 'id,name,desc,due,idList,idBoard,labels',
          members: true,
          limit: 1000,
          before: undefined,
          since: undefined,
        },
      })
      expect(result).toEqual(mockCards)
    })

    it('should fetch cards with custom options', async () => {
      const mockCards = [{ id: 'card-1' }]
      mockGet.mockResolvedValueOnce({ data: mockCards })

      const options = {
        fields: ['id', 'name'],
        limit: 5,
        before: '2024-01-01',
        since: '2023-12-01',
      }

      await trelloService.getCardsInList('list-1', options)

      expect(mockGet).toHaveBeenCalledWith('/lists/list-1/cards', {
        params: {
          fields: 'id,name',
          members: true,
          limit: 5,
          before: '2024-01-01',
          since: '2023-12-01',
        },
      })
    })
  })

  describe('error handling', () => {
    it('should handle rate limit errors', async () => {
      const error = {
        response: { status: 429 },
        isAxiosError: true,
      }
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)
      mockGet.mockRejectedValueOnce(error)

      await expect(trelloService.getCard('card-1')).rejects.toThrow('Rate limit exceeded')
    })

    it('should handle authorization errors', async () => {
      const error = {
        response: { status: 403 },
        isAxiosError: true,
      }
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)
      mockGet.mockRejectedValueOnce(error)

      await expect(trelloService.getCard('card-1')).rejects.toThrow('Authorization failed')
    })

    it('should handle non-axios errors', async () => {
      const error = new Error('Network error')
      mockGet.mockRejectedValueOnce(error)

      await expect(trelloService.getCard('card-1')).rejects.toThrow('Network error')
    })
  })
})
